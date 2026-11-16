// app/api/paystack/verify/route.ts

import { NextResponse } from 'next/server';
import {
  extractPaystackMessages,
  formatPaystackErrorMessage,
  writeServerLog,
} from '@/lib/server-log';

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
      const txData = data?.data || {};
      const txStatus = txData.status;

      if (!res.ok || data?.status === false || (txStatus && txStatus !== 'success')) {
        const { gatewayResponse, gatewayMessage, bestReason } = extractPaystackMessages(txData, data);
        const friendlyMessage = formatPaystackErrorMessage(bestReason);
        writeServerLog('Paystack Verify', {
          status: txStatus || 'error',
          http: res.status,
          ref: reference,
          amount_ngn: typeof txData.amount === 'number' ? (txData.amount / 100).toFixed(2) : undefined,
          bank: txData.authorization?.bank,
          gateway_response: gatewayResponse || undefined,
          gateway_message: gatewayMessage || data?.message || undefined,
          ui_message: friendlyMessage,
        });
        return NextResponse.json({ ...data, friendlyMessage }, { status: res.ok ? 200 : 400 });
      }

      return NextResponse.json(data, { status: 200 });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    writeServerLog('Paystack Verify Error', {
      error: error?.message || 'Verification error',
    });
    return NextResponse.json(
      { success: false, message: error?.message || 'Verification error' },
      { status: 500 }
    );
  }
}
