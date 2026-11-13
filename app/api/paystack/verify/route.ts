import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = (searchParams.get('reference') || '').trim();

    if (!reference) {
      return NextResponse.json({ success: false, message: 'Missing reference' }, { status: 400 });
    }

    const secretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (!secretKey) {
      return NextResponse.json({ success: false, message: 'Payment verification unavailable' }, { status: 500 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      const rawText = await res.text();
      const data = rawText ? JSON.parse(rawText) : {};
      return NextResponse.json(data, { status: res.ok ? 200 : 400 });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Verification error' },
      { status: 500 }
    );
  }
}
