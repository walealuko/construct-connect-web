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

    const orderId = data.data.metadata.orderId;
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID not found in payment metadata' }, { status: 400 });
    }

    // 2. Initialize Supabase Admin Client (Bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
       return NextResponse.json({ error: 'Supabase service role key is missing. Update is blocked' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Finalize Order
    const { error: updateOrderError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId);

    if (updateOrderError) throw updateOrderError;

    // 4. Decrement product stock using the order_items table (the live
    //    schema keeps items in their own table — `orders.items` does not
    //    exist). Read each product's current stock, then update by
    //    quantity purchased.
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    for (const item of orderItems || []) {
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
