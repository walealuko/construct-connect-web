import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { email, amount, orderId } = await req.json();

    if (!email || !amount || !orderId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    } catch (e) {
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
    console.error('Paystack Init Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
