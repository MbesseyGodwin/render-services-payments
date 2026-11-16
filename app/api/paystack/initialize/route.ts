import { NextResponse } from 'next/server';
import { getLiveUsdToNgnRate, logFxRateToServerConsole } from '@/lib/fx';
import { formatPaystackErrorMessage, writeServerLog } from '@/lib/server-log';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, amountUsd, serviceName, invoiceNumber, serviceId, returnPath } = body;

    const usd = Number(amountUsd) || 4200.00;
    const fx = await getLiveUsdToNgnRate();
    const liveRate = fx.rate;
    const ngn = Math.round(usd * liveRate * 100) / 100;
    const amountInKobo = Math.round(ngn * 100);
    const reference = `render-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    logFxRateToServerConsole({
      route: 'POST /api/paystack/initialize',
      fx,
      amountUsd: usd,
      amountNgn: ngn,
      reference,
    });

    const secretKey = process.env.PAYSTACK_SECRET_KEY || '';

    // Resolve live deployment origin without any localhost fallback
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const requestOrigin =
      request.headers.get('origin') ||
      (forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin);
    const targetPath = returnPath || `/receipts/${serviceId || 'backend'}`;
    const callbackUrl = `${requestOrigin}${targetPath}?s=ap&paystack_callback=1&invoice=${encodeURIComponent(invoiceNumber || '')}`;

    const descriptionText = `Payment for ${serviceName || 'Render Service'} (Render Oct 1, 2026 - Sep 30, 2027)`;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email || 'nelson.attah@live.com',
        amount: amountInKobo,
        currency: 'NGN',
        channels: ['card'], // Exclusively restricts checkout to Card payments
        reference,
        callback_url: callbackUrl,
        label: descriptionText,
        first_name: 'Nelson',
        last_name: 'Attah',
        metadata: {
          description: descriptionText,
          narration: descriptionText,
          billing_period: 'Render Oct 1, 2026 - Sep 30, 2027',
          invoice_number: invoiceNumber || '',
          service_id: serviceId || '',
          custom_fields: [
            {
              display_name: 'Bank Statement Narration',
              variable_name: 'bank_statement_narration',
              value: descriptionText,
            },
            {
              display_name: 'Service',
              variable_name: 'service',
              value: serviceName || '',
            },
            {
              display_name: 'Invoice Number',
              variable_name: 'invoice_number',
              value: invoiceNumber || '',
            },
            {
              display_name: 'Billing Period',
              variable_name: 'billing_period',
              value: 'Render Oct 1, 2026 - Sep 30, 2027',
            },
            {
              display_name: 'USD Total',
              variable_name: 'usd_total',
              value: `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            },
            {
              display_name: 'NGN Conversion Rate',
              variable_name: 'conversion_rate',
              value: `1 USD = ${liveRate.toLocaleString('en-US', { minimumFractionDigits: 2 })} NGN`,
            },
          ],
        },
      }),
    });

    const data = await paystackRes.json();
    if (!paystackRes.ok || !data.status) {
      const uiMessage = formatPaystackErrorMessage(data.message || 'Failed to initialize Paystack checkout');
      writeServerLog('Paystack Initialize Failed', {
        http: paystackRes.status,
        ref: reference,
        amount_ngn: ngn.toFixed(2),
        gateway_message: data.message,
        ui_message: uiMessage,
      });
      return NextResponse.json({
        success: false,
        message: uiMessage,
        data,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
      ngnAmount: ngn,
      amountInKobo,
      usdAmount: usd,
      exchangeRate: liveRate,
      description: descriptionText,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error?.message || 'Internal server error',
    }, { status: 500 });
  }
}
