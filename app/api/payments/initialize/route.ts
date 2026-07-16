import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { log } from '@/lib/logger';

export async function POST(req: Request) {
  // Hoist orderId out of the try so the catch block can include it
  // in the structured log. The early-return for missing fields stays
  // inside the try — we still want it to be a 400, not a 500.
  let orderId: string | undefined;
  try {
    const body = await req.json();
    orderId = body?.orderId;
    const { email, amount } = body;

    if (!email || !amount || !orderId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ownership check: the caller must be signed in AND the order
    // they want to pay for must belong to them. Without this, anyone
    // who knows an orderId could trigger a Paystack init and capture
    // payment flow for an order they don't own. We trust the
    // server-side session (cookies) over the request body's email.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: order, error: orderError } = await supabase
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
    if (order.buyer_id !== user.id) {
      // Don't reveal the order exists if it's not theirs.
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status === 'completed') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 409 });
    }
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Order is in status '${order.status}', cannot pay` },
        { status: 409 }
      );
    }

    // The body-supplied email must match the signed-in user's email.
    // If it doesn't, the buyer is trying to send someone else's email
    // to Paystack — refuse.
    if (email.toLowerCase() !== (user.email || '').toLowerCase()) {
      return NextResponse.json({ error: 'Email does not match signed-in user' }, { status: 403 });
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Paystack secret key is not configured' }, { status: 500 });
    }

    // Determine Base URL for callback
    const headerList = await headers();
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      headerList.get("origin") ||
      "http://localhost:3000";

    // Paystack expects amount in kobo (1 Naira = 100 Kobo)
    const amountInKobo = Math.round(amount * 100);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        callback_url: `${baseUrl}/checkout/success`,
        metadata: {
          orderId: orderId,
        },
      }),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Paystack returned non-JSON response:", text);
      return NextResponse.json({ error: 'Payment gateway returned an invalid response' }, { status: 502 });
    }

    if (data.status) {
      return NextResponse.json({
        url: data.data.authorization_url,
        reference: data.data.reference
      });
    } else {
      return NextResponse.json({ error: data.message || 'Payment initialization failed' }, { status: 400 });
    }
  } catch (error: any) {
    log.error('payment_init_failed', {
      orderId,
      message: error?.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}