import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { orderPlacedEmail, orderReceivedBySellerEmail } from '@/lib/email-templates';
import { take } from '@/lib/rateLimit';

/**
 * Type of a line item row as it comes back from PostgREST. Each
 * field is optional because PostgREST's `select('product_id, ...')`
 * returns the columns typed, but the surrounding `data` is a
 * `data: T[] | null` where T is the row shape.
 */
type LineItem = { product_id?: string; quantity?: number; price_at_purchase?: number };

/**
 * Drop any line item that's missing one of the three fields the
 * email template needs. The cast at the end narrows the array
 * element type so the downstream `.map` doesn't have to repeat
 * the `typeof` checks.
 */
function completeLineItems(lineItems: LineItem[] | null | undefined) {
  return (lineItems ?? []).filter(
    (li): li is { product_id: string; quantity: number; price_at_purchase: number } =>
      typeof li.product_id === 'string' &&
      typeof li.quantity === 'number' &&
      typeof li.price_at_purchase === 'number',
  );
}

/**
 * Pure helper — exposed so the kobo/naira math can be unit-tested
 * without mocking fetch, the Supabase admin client, or the global
 * env. Returns the expected Paystack kobo amount from a naira total
 * stored on the orders row.
 *
 * The round() rather than floor() matters: 1234.567 naira is
 * 123456.7 kobo, which has to be 123457 for Paystack to accept it.
 * A Math.floor here would silently under-charge by up to 1 kobo.
 */
export function expectedKoboFromTotal(totalAmount: number | null | undefined): number {
  return Math.round(Number(totalAmount || 0) * 100);
}

export async function GET(req: Request) {
  // Rate limit by client IP. Verify is a public GET (no auth) and
  // a bot that hammers /verify?reference=X with bad references
  // can keep the server busy doing Paystack round-trips. 10/min
  // per IP is well above Paystack's own redirect-retry cadence
  // and well below a brute-force ceiling.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!take(`verify:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
  }

  // Hoist orderId out of the try so the catch block can include it
  // in the structured log without re-running the metadata lookup.
  let orderId: string | undefined;

  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Paystack secret key is not configured' }, { status: 500 });
    }

    // 1. Verify transaction with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    const orderId = data.data.metadata?.orderId;
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID not found in payment metadata' }, { status: 400 });
    }

    // Initialize Supabase Admin Client (Bypass RLS for the finalize step).
    // We keep the use of the service role scoped to the order-id we
    // already pulled out of Paystack's response — every subsequent
    // mutation is keyed by this orderId and gated by the checks below.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
       return NextResponse.json({ error: 'Supabase service role key is missing. Update is blocked' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Load the order and verify it belongs to the customer who
    //    actually paid. Without these checks, anyone who learns a
    //    Paystack reference could trigger order completion and stock
    //    decrement for an order they have no claim on.
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, buyer_id, status, total_amount')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Look up the buyer's email from auth.users (service role has access).
    const { data: buyer, error: buyerError } = await supabaseAdmin.auth.admin.getUserById(order.buyer_id);
    if (buyerError || !buyer?.user?.email) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
    }

    // Customer email recorded by Paystack must match the order's buyer.
    const paystackCustomerEmail = (data.data.customer?.email || '').toLowerCase();
    const buyerEmail = (buyer.user.email || '').toLowerCase();
    if (!paystackCustomerEmail || paystackCustomerEmail !== buyerEmail) {
      return NextResponse.json({ error: 'Payment customer does not match order buyer' }, { status: 403 });
    }

    // Amount paid (kobo from Paystack) must match the order total.
    // We trust `orders.total_amount` as the canonical snapshot rather
    // than re-summing `order_items` — the column is set at checkout
    // from the same number that's posted to Paystack at initialize
    // time, so the verify-side check is comparing like-for-like. If
    // anyone ever edits a line item's price_at_purchase after the
    // order is placed, the order's stored total is still what the
    // customer actually paid.
    const expectedKobo = expectedKoboFromTotal(order.total_amount);
    const paidKobo = Number(data.data.amount || 0);

    if (expectedKobo === 0) {
      // Treat a zero-total order as a programming error rather than
      // a free order — the checkout flow always sets total_amount
      // from the cart, so a 0 here means a row got created without
      // going through checkout.
      return NextResponse.json({ error: 'Order has no payable total' }, { status: 400 });
    }
    if (paidKobo < expectedKobo) {
      return NextResponse.json(
        { error: `Amount paid (${paidKobo} kobo) is less than order total (${expectedKobo} kobo)` },
        { status: 403 }
      );
    }

    // 3. Idempotency: if the order is already completed, skip the
    //    finalize step. Returning success here means Paystack's
    //    verify-callback retry is safe — the stock was already
    //    decremented on the first call.
    if (order.status === 'completed') {
      return NextResponse.json({ success: true, orderId, alreadyCompleted: true });
    }
    if (order.status !== 'pending') {
      // Anything other than pending or completed is a bad state we
      // don't want to silently flip. Surface it.
      return NextResponse.json(
        { error: `Order is in status '${order.status}', cannot finalize` },
        { status: 409 }
      );
    }

    // 4. Finalize Order
    const { error: updateOrderError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId)
      .eq('status', 'pending'); // double-check at write time

    if (updateOrderError) throw updateOrderError;

    // 5. Decrement product stock using the order_items table (the live
    //    schema keeps items in their own table — `orders.items` does not
    //    exist). The decrement is a SQL function that does
    //    `update products set stock = stock - qty where id = p_id and
    //    stock >= qty returning stock`. This is atomic — two concurrent
    //    orders for the same product can both read stock=5 but only one
    //    can pass the WHERE clause and get the row back.
    //
    //    A read-then-write here would race: both buyers read stock=5,
    //    both write stock=4, store is now oversold by 1.
    const { data: lineItems, error: lineItemsError } = await supabaseAdmin
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    if (lineItemsError) throw lineItemsError;

    const outOfStockProductIds: string[] = [];
    for (const item of lineItems || []) {
      if (!item.product_id || !item.quantity) continue;
      // The SQL function is defined in migration 0013_decrement_stock_rpc.sql
      // and returns the new stock on success or null when the WHERE
      // clause (stock >= quantity) rejected the update — meaning
      // another order beat us to those units.
      const { data: newStock, error: decError } = await supabaseAdmin.rpc(
        'decrement_product_stock',
        { p_id: item.product_id, qty: item.quantity },
      );
      if (decError) throw decError;
      if (newStock === null) {
        outOfStockProductIds.push(item.product_id);
      }
    }

    if (outOfStockProductIds.length > 0) {
      // Stock was insufficient for at least one line item even though
      // the client-side check passed earlier (someone bought the same
      // item between the verifyStockAction read and our decrement).
      // Roll the order back to cancelled so it's visible to support,
      // and the buyer's payment needs a refund. We don't auto-call
      // Paystack's refund API here — the payment is settled, the
      // order is in a bad state, and a human should review. The
      // order row stays so the buyer can see the error and a refund
      // can be issued against the same reference.
      log.error('payment_verify_stock_insufficient', {
        orderId,
        outOfStockProductIds,
      });
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
      return NextResponse.json(
        {
          error: 'One or more items in this order are out of stock',
          outOfStockProductIds,
        },
        { status: 409 },
      );
    }

    // 6. Clear the buyer's cart. Without this, the items they just
    //    paid for stay in the cart and re-merge on the next sign-in.
    //    Best-effort: a failure to clear shouldn't fail the payment.
    const { error: cartClearError } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', order.buyer_id);
    if (cartClearError) {
      log.error('cart_clear_after_payment_failed', {
        orderId,
        message: cartClearError.message,
      });
    }

    // 7. Send transactional emails. Fire-and-forget — the payment
    //    is finalized either way. A failure here is logged but
    //    doesn't surface to the buyer (their payment succeeded).
    void (async () => {
      try {
        // Read product names + seller ids in one query so the
        // emails below have real names, not uuids.
        const productIds = (lineItems || [])
          .map((li: { product_id?: string }) => li.product_id)
          .filter(Boolean) as string[];
        const productNames = new Map<string, string>();
        const sellerByProduct = new Map<string, string>();
        if (productIds.length > 0) {
          const { data: products } = await supabaseAdmin
            .from('products')
            .select('id, name, seller_id')
            .in('id', productIds);
          for (const p of products || []) {
            productNames.set(p.id, p.name);
            sellerByProduct.set(p.id, p.seller_id);
          }
        }

        // 7a. Order placed → buyer.
        const { data: buyerProfile } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', order.buyer_id)
          .maybeSingle();
        const buyerName =
          [buyerProfile?.first_name, buyerProfile?.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || 'there';

        const placedTpl = orderPlacedEmail({
          buyerName,
          orderId,
          items: completeLineItems(lineItems).map((li) => ({
            name: productNames.get(li.product_id) || 'Item',
            quantity: li.quantity,
            price: li.price_at_purchase,
          })),
          total: order.total_amount,
        });
        // The earlier `buyerError || !buyer?.user?.email` check
        // already returned 404 if either was missing, but TS doesn't
        // carry the narrowing into this nested async closure.
        if (!buyer.user.email) {
          log.error('email_verify_no_buyer_email', { orderId });
        } else {
          await sendEmail({ to: buyer.user.email, subject: placedTpl.subject, html: placedTpl.html });
        }

        // 7b. New sale → each distinct seller. One seller may have
        //     multiple products in the same order — sum them up.
        const sellerIds = new Set<string>();
        const sellerProducts = new Map<string, { productName: string; quantity: number; amount: number }>();
        for (const li of completeLineItems(lineItems)) {
          const sellerId = sellerByProduct.get(li.product_id);
          if (!sellerId) continue;
          sellerIds.add(sellerId);
          const prev = sellerProducts.get(sellerId);
          const itemAmount = li.price_at_purchase * li.quantity;
          if (prev) {
            sellerProducts.set(sellerId, {
              productName: `${prev.productName} + ${productNames.get(li.product_id) || 'Item'}`,
              quantity: prev.quantity + li.quantity,
              amount: prev.amount + itemAmount,
            });
          } else {
            sellerProducts.set(sellerId, {
              productName: productNames.get(li.product_id) || 'Item',
              quantity: li.quantity,
              amount: itemAmount,
            });
          }
        }

        for (const sellerId of sellerIds) {
          const { data: sellerAuth } = await supabaseAdmin.auth.admin.getUserById(sellerId);
          if (!sellerAuth?.user?.email) continue;
          const { data: sellerProfile } = await supabaseAdmin
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', sellerId)
            .maybeSingle();
          const sellerName =
            [sellerProfile?.first_name, sellerProfile?.last_name]
              .filter(Boolean)
              .join(' ')
              .trim() || 'there';
          const sp = sellerProducts.get(sellerId);
          if (!sp) continue;
          const tpl = orderReceivedBySellerEmail({
            sellerName,
            orderId,
            productName: sp.productName,
            quantity: sp.quantity,
            amount: sp.amount,
            buyerName,
          });
          await sendEmail({ to: sellerAuth.user.email, subject: tpl.subject, html: tpl.html });
        }
      } catch (e) {
        log.error('email_verify_threw', {
          orderId,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })();

    return NextResponse.json({ success: true, orderId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    log.error('payment_verify_failed', {
      reference,
      orderId,
      message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
