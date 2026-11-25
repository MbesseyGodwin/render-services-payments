import { NextResponse } from 'next/server'
import { getLiveUsdToNgnRate, logFxRateToServerConsole } from '@/lib/fx'
import {
  calculatePackageAmountUsd,
  clampBillingMonths,
  formatBillingPeriod,
  getManagedServicePackage,
} from '@/lib/subscriptions'
import { formatPaystackErrorMessage, writeServerLog } from '@/lib/server-log'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid checkout request.' }, { status: 400 })
  }

  const service = getManagedServicePackage(body.packageId)
  if (!service) {
    return NextResponse.json({ success: false, message: 'Choose a valid service package.' }, { status: 400 })
  }

  const rawEmail = service.checkoutEmail
    ? service.checkoutEmail.trim().toLowerCase()
    : typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : ''
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) && rawEmail.length <= 254
  if (!emailIsValid) {
    return NextResponse.json({ success: false, message: 'Enter a valid billing email address.' }, { status: 400 })
  }
  if (body.termsAccepted !== true) {
    return NextResponse.json({ success: false, message: 'Confirm the service and payment terms before checkout.' }, { status: 400 })
  }

  const email = rawEmail
  const requestedMonths = typeof body.months === 'number' ? body.months : Number(body.months)
  const selectedMonths = clampBillingMonths(service, Number.isFinite(requestedMonths) ? requestedMonths : undefined)
  const amountUsd = calculatePackageAmountUsd(service, selectedMonths)
  if (service.billable === false || amountUsd <= 0) {
    return NextResponse.json({ success: false, message: 'This service is included at no additional charge.' }, { status: 400 })
  }

  const secretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim()
  if (!secretKey) {
    return NextResponse.json({ success: false, message: 'Paystack checkout is temporarily unavailable.' }, { status: 503 })
  }

  try {
    const fx = await getLiveUsdToNgnRate()
    const amountNgn = Math.round(amountUsd * fx.rate * 100) / 100
    const amountInKobo = Math.round(amountNgn * 100)
    const safeServiceId = service.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'srv'
    const randomPart = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    const reference = `render-${safeServiceId}-${Date.now()}-${randomPart}`
    const billingPeriod = formatBillingPeriod(service, selectedMonths)
    const description = `Payment for ${service.checkoutName} (${billingPeriod})`

    logFxRateToServerConsole({
      route: 'POST /api/paystack/subscriptions/initialize',
      fx,
      amountUsd,
      amountNgn,
      reference,
    })

    const requestUrl = new URL(request.url)
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host
    const forwardedProto = request.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '')
    const origin = `${forwardedProto}://${forwardedHost}`
    const callbackUrl = new URL('/subscriptions/complete', origin)
    callbackUrl.searchParams.set('reference', reference)

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        currency: 'NGN',
        channels: ['card', 'bank_transfer'],
        reference,
        callback_url: callbackUrl.toString(),
        label: description,
        metadata: {
          description,
          narration: description,
          billing_period: billingPeriod,
          invoice_number: '',
          service_id: service.id,
          custom_fields: [
            { display_name: 'Bank Statement Narration', variable_name: 'bank_statement_narration', value: description },
            { display_name: 'Service', variable_name: 'service', value: service.checkoutName },
            { display_name: 'Invoice Number', variable_name: 'invoice_number', value: '' },
            { display_name: 'Billing Period', variable_name: 'billing_period', value: billingPeriod },
            { display_name: 'USD Total', variable_name: 'usd_total', value: `$${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
            { display_name: 'NGN Conversion Rate', variable_name: 'conversion_rate', value: `1 USD = ${fx.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })} NGN` },
          ],
        },
      }),
      signal: AbortSignal.timeout(20000),
    })

    const data = await paystackResponse.json()
    if (!paystackResponse.ok || !data?.status || typeof data?.data?.access_code !== 'string') {
      const message = formatPaystackErrorMessage(data?.message || 'Could not open Paystack checkout.')
      writeServerLog('Paystack Managed Service Initialize Failed', {
        http: paystackResponse.status,
        ref: reference,
        package_id: service.id,
        gateway_message: data?.message,
        ui_message: message,
      })
      return NextResponse.json({ success: false, message }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      access_code: data.data.access_code,
      reference: data.data.reference,
      amountNgn,
      amountUsd,
      months: selectedMonths,
      exchangeRate: fx.rate,
      description,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout could not be started.'
    writeServerLog('Paystack Managed Service Initialize Error', { error: message })
    return NextResponse.json({ success: false, message: 'Checkout could not be started. Please try again.' }, { status: 502 })
  }
}
