import { NextResponse } from 'next/server';

const USD_TO_NGN = 1346.84;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, amountUsd, serviceName, invoiceNumber, serviceId, returnPath } = body;

    const usd = Number(amountUsd) || 4200.00;
    const ngn = Math.round(usd * USD_TO_NGN * 100) / 100;
    const amountInKobo = Math.round(ngn * 100);

    const secretKey = process.env.PAYSTACK_SECRET_KEY || '';

    // Callback URL for post-payment redirect
    const origin = request.headers.get('origin') || request.headers.get('referer')?.split('?')[0] || 'http://localhost:3000';
    const targetPath = returnPath || `/receipts/${serviceId || 'backend'}`;
    const callbackUrl = `${origin}${targetPath}?s=ap&payment_status=success&invoice=${encodeURIComponent(invoiceNumber || '')}`;

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
        // reference: `render-${serviceId || 'srv'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        reference: `render-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
              value: '1 USD = 1,346.84 NGN',
            },
          ],
        },
      }),
    });

    const data = await paystackRes.json();
    if (!paystackRes.ok || !data.status) {
      return NextResponse.json({
        success: false,
        message: data.message || 'Failed to initialize Paystack checkout',
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
      exchangeRate: USD_TO_NGN,
      description: descriptionText,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error?.message || 'Internal server error',
    }, { status: 500 });
  }
}
