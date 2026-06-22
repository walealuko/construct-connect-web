import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
  }

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
      .select('id, buyer_id, status')
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

    // Amount paid (kobo from Paystack) must match the order total
    // (sum of order_items.price_at_purchase * quantity). We compare in
    // kobo to avoid float drift.
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('price_at_purchase, quantity')
      .eq('order_id', orderId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const expectedKobo = Math.round(
      (orderItems || []).reduce(
        (sum, it) => sum + Number(it.price_at_purchase || 0) * Number(it.quantity || 0),
        0
      ) * 100
    );
    const paidKobo = Number(data.data.amount || 0);

    if (expectedKobo === 0) {
      // Order has no line items or they all summed to zero. Treating
      // this as success would create a completed order with no items
      // and zero revenue — refuse instead.
      return NextResponse.json({ error: 'Order has no payable line items' }, { status: 400 });
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
      return NextResponse.json({ success: true, alreadyCompleted: true });
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
    //    exist). Read each product's current stock, then update by
    //    quantity purchased.
    const { data: lineItems, error: lineItemsError } = await supabaseAdmin
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    if (lineItemsError) throw lineItemsError;

    for (const item of lineItems || []) {
      if (!item.product_id || !item.quantity) continue;
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();

      if (product) {
        await supabaseAdmin
          .from('products')
          .update({ stock: Math.max(0, (product.stock || 0) - item.quantity) })
          .eq('id', item.product_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Payment Verify Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
