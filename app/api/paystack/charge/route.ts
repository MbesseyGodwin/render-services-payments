import { NextResponse } from 'next/server';

export const maxDuration = 60;

const FALLBACK_USD_TO_NGN = 1346.84;

function createUniqueReference(serviceId?: string): string {
  const safeId = String(serviceId || 'srv')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 16) || 'srv';
  const randHex =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `render-${safeId}-${Date.now()}-${randHex}`;
}

function sanitizeReference(raw: unknown, serviceId?: string): string {
  if (typeof raw === 'string') {
    const cleaned = raw.trim().replace(/[^a-zA-Z0-9._-]/g, '');
    if (cleaned.length >= 8 && cleaned.length <= 100) {
      return cleaned;
    }
  }
  return createUniqueReference(serviceId);
}

async function getLiveUsdToNgnRate(): Promise<number> {
  // 1. Primary Live FX API: open.er-api.com
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.rates?.NGN);
      if (Number.isFinite(rate) && rate > 500 && rate < 10000) {
        return Math.round(rate * 100) / 100;
      }
    }
  } catch {
    // Proceed to secondary backup FX API
  }

  // 2. Secondary Backup Live FX API: jsdelivr currency-api
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
      {
        signal: controller.signal,
        next: { revalidate: 300 },
      }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.usd?.ngn);
      if (Number.isFinite(rate) && rate > 500 && rate < 10000) {
        return Math.round(rate * 100) / 100;
      }
    }
  } catch {
    // Proceed to constant fallback
  }

  // 3. Guaranteed static fallback
  return FALLBACK_USD_TO_NGN;
}

function isValidLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (Number.isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

async function safePaystackRequest(url: string, options: RequestInit, timeoutMs = 55000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const rawText = await res.text();
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return {
        ok: false,
        timedOut: false,
        statusCode: res.status,
        data: {
          status: false,
          message: 'Unexpected response from payment gateway.',
        },
      };
    }
    return { ok: res.ok, timedOut: false, statusCode: res.status, data };
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return {
      ok: false,
      timedOut: isTimeout,
      statusCode: isTimeout ? 504 : 502,
      data: {
        status: false,
        message: isTimeout
          ? 'Bank is still processing your request…'
          : 'Network error communicating with payment gateway.',
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: Request) {
  try {
    let body: Record<string, any>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        success: false,
        status: 'failed',
        message: 'Invalid request payload.',
      });
    }

    const { action = 'charge' } = body || {};

    const secretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (!secretKey) {
      return NextResponse.json({
        success: false,
        status: 'failed',
        message: 'Payment service is temporarily unavailable.',
      });
    }

    const headers = {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    };

    // 1. Initial direct card charge
    if (action === 'charge') {
      const {
        email,
        amountUsd,
        serviceName,
        invoiceNumber,
        serviceId,
        returnPath,
        reference: clientReference,
        card,
        pin,
      } = body;

      const cleanNumber = String(card?.number || '').replace(/\D/g, '');
      const cleanCvv = String(card?.cvv || '').replace(/\D/g, '');
      const expMonth = String(card?.expiry_month || '').replace(/\D/g, '').padStart(2, '0');
      const expYear = String(card?.expiry_year || '').replace(/\D/g, '').slice(-2);

      if (!cleanNumber || cleanNumber.length < 13 || cleanNumber.length > 19 || !isValidLuhn(cleanNumber)) {
        return NextResponse.json({
          success: false,
          status: 'failed',
          message: 'Your card number is invalid.',
        });
      }

      const monthNum = Number(expMonth);
      const yearNum = Number(expYear);
      if (!monthNum || monthNum < 1 || monthNum > 12 || expYear.length !== 2 || Number.isNaN(yearNum)) {
        return NextResponse.json({
          success: false,
          status: 'failed',
          message: 'Your card’s expiration date is invalid.',
        });
      }

      if (!cleanCvv || cleanCvv.length < 3 || cleanCvv.length > 4) {
        return NextResponse.json({
          success: false,
          status: 'failed',
          message: 'Your card’s security code is invalid.',
        });
      }

      const parsedUsd = Number(amountUsd);
      const usd = Number.isFinite(parsedUsd) && parsedUsd > 0 ? parsedUsd : 4200.0;
      const liveRate = await getLiveUsdToNgnRate();
      const ngn = Math.round(usd * liveRate * 100) / 100;
      const amountInKobo = Math.max(100, Math.round(ngn * 100));

      const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
      let requestOrigin = request.headers.get('origin') || '';
      if (!requestOrigin) {
        try {
          requestOrigin = forwardedHost
            ? `${forwardedProto}://${forwardedHost}`
            : new URL(request.url).origin;
        } catch {
          requestOrigin = '';
        }
      }

      const targetPath =
        typeof returnPath === 'string' && returnPath.startsWith('/')
          ? returnPath
          : `/receipts/${serviceId || 'backend'}`;
      const callbackUrl = `${requestOrigin}${targetPath}?s=ap&payment_status=success&invoice=${encodeURIComponent(invoiceNumber || '')}`;

      const descriptionText = `Payment for ${serviceName || 'Render Service'} (Render Oct 1, 2026 - Sep 30, 2027)`;
      let activeReference = sanitizeReference(clientReference, serviceId);

      const buildPayload = (ref: string) => {
        const p: Record<string, any> = {
          email: typeof email === 'string' && email.includes('@') ? email.trim() : 'nelson.attah@live.com',
          amount: amountInKobo,
          currency: 'NGN',
          reference: ref,
          callback_url: callbackUrl,
          card: {
            number: cleanNumber,
            cvv: cleanCvv,
            expiry_month: expMonth,
            expiry_year: expYear,
          },
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
            ],
          },
        };

        if (pin) {
          const cleanPin = String(pin).replace(/\D/g, '');
          if (cleanPin.length >= 4) {
            p.pin = cleanPin;
          }
        }
        return p;
      };

      let result = await safePaystackRequest('https://api.paystack.co/charge', {
        method: 'POST',
        headers,
        body: JSON.stringify(buildPayload(activeReference)),
      });

      // If reference collided on Paystack for any reason, mint a brand-new one and retry once
      if (
        !result.ok &&
        typeof result.data?.message === 'string' &&
        /duplicate.*reference|reference.*invalid/i.test(result.data.message)
      ) {
        activeReference = createUniqueReference(serviceId);
        result = await safePaystackRequest('https://api.paystack.co/charge', {
          method: 'POST',
          headers,
          body: JSON.stringify(buildPayload(activeReference)),
        });
      }

      if (result.timedOut || result.statusCode >= 500) {
        return NextResponse.json({
          success: true,
          status: 'pending',
          reference: activeReference,
          message: 'Waiting for bank confirmation…',
        });
      }

      return NextResponse.json(parsePaystackChargeResponse(result.data, result.ok, activeReference));
    }

    // Validate reference for follow-up actions
    const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';
    if (!reference) {
      return NextResponse.json({
        success: false,
        status: 'failed',
        message: 'Payment session expired. Please submit your card details again.',
      });
    }

    // 2. Submit PIN
    if (action === 'submit_pin') {
      const cleanPin = String(body.pin || '').replace(/\D/g, '');
      if (cleanPin.length !== 4) {
        return NextResponse.json({
          success: false,
          status: 'send_pin',
          reference,
          message: 'Please enter a valid 4-digit PIN.',
        });
      }
      const { ok, timedOut, statusCode, data } = await safePaystackRequest(
        'https://api.paystack.co/charge/submit_pin',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ pin: cleanPin, reference }),
        }
      );
      if (timedOut || statusCode >= 500) {
        return NextResponse.json({
          success: true,
          status: 'pending',
          reference,
          message: 'Bank is processing your PIN…',
        });
      }
      return NextResponse.json(parsePaystackChargeResponse(data, ok, reference, true));
    }

    // 3. Submit OTP
    if (action === 'submit_otp') {
      const cleanOtp = String(body.otp || '').replace(/\s+/g, '');
      if (cleanOtp.length < 4) {
        return NextResponse.json({
          success: false,
          status: 'send_otp',
          reference,
          message: 'Please enter a valid OTP code.',
        });
      }
      const { ok, timedOut, statusCode, data } = await safePaystackRequest(
        'https://api.paystack.co/charge/submit_otp',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ otp: cleanOtp, reference }),
        }
      );
      if (timedOut || statusCode >= 500) {
        return NextResponse.json({
          success: true,
          status: 'pending',
          reference,
          message: 'Bank is verifying your OTP…',
        });
      }
      return NextResponse.json(parsePaystackChargeResponse(data, ok, reference, true));
    }

    // 4. Submit Phone
    if (action === 'submit_phone') {
      const cleanPhone = String(body.phone || '').replace(/[^\d+]/g, '');
      if (cleanPhone.length < 7) {
        return NextResponse.json({
          success: false,
          status: 'send_phone',
          reference,
          message: 'Please enter a valid phone number.',
        });
      }
      const { ok, timedOut, statusCode, data } = await safePaystackRequest(
        'https://api.paystack.co/charge/submit_phone',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ phone: cleanPhone, reference }),
        }
      );
      if (timedOut || statusCode >= 500) {
        return NextResponse.json({
          success: true,
          status: 'pending',
          reference,
          message: 'Waiting for bank verification…',
        });
      }
      return NextResponse.json(parsePaystackChargeResponse(data, ok, reference, true));
    }

    // 5. Submit Birthday
    if (action === 'submit_birthday') {
      const cleanBirthday = String(body.birthday || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanBirthday)) {
        return NextResponse.json({
          success: false,
          status: 'send_birthday',
          reference,
          message: 'Please enter date of birth in YYYY-MM-DD format.',
        });
      }
      const { ok, timedOut, statusCode, data } = await safePaystackRequest(
        'https://api.paystack.co/charge/submit_birthday',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ birthday: cleanBirthday, reference }),
        }
      );
      if (timedOut || statusCode >= 500) {
        return NextResponse.json({
          success: true,
          status: 'pending',
          reference,
          message: 'Waiting for bank verification…',
        });
      }
      return NextResponse.json(parsePaystackChargeResponse(data, ok, reference, true));
    }

    // 6. Submit Address
    if (action === 'submit_address') {
      const address = String(body.address || '').trim();
      const city = String(body.city || '').trim();
      const state = String(body.state || '').trim();
      const zip_code = String(body.zip_code || '').trim();
      if (!address || !city || !state || !zip_code) {
        return NextResponse.json({
          success: false,
          status: 'send_address',
          reference,
          message: 'Please complete all billing address fields.',
        });
      }
      const { ok, timedOut, statusCode, data } = await safePaystackRequest(
        'https://api.paystack.co/charge/submit_address',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ address, city, state, zip_code, reference }),
        }
      );
      if (timedOut || statusCode >= 500) {
        return NextResponse.json({
          success: true,
          status: 'pending',
          reference,
          message: 'Waiting for bank verification…',
        });
      }
      return NextResponse.json(parsePaystackChargeResponse(data, ok, reference, true));
    }

    // 7. Check pending status (checks both /charge/:ref and /transaction/verify/:ref)
    if (action === 'check_pending') {
      const { ok, timedOut, statusCode, data } = await safePaystackRequest(
        `https://api.paystack.co/charge/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers,
          cache: 'no-store',
        },
        25000
      );

      if (timedOut || statusCode >= 500) {
        return NextResponse.json({
          success: true,
          status: 'pending',
          reference,
          message: 'Still waiting for bank confirmation…',
        });
      }

      const parsed = parsePaystackChargeResponse(data, ok, reference, true);

      if (parsed.status === 'pending' || !parsed.success) {
        const verifyRes = await safePaystackRequest(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            method: 'GET',
            headers,
            cache: 'no-store',
          },
          15000
        );
        const verifyStatus = verifyRes.data?.data?.status;
        if (verifyStatus === 'success') {
          return NextResponse.json({
            success: true,
            status: 'success',
            reference,
            message: 'Payment confirmed.',
          });
        }
        if (verifyStatus === 'ongoing' || verifyStatus === 'pending' || verifyStatus === 'processing') {
          return NextResponse.json({
            success: true,
            status: 'pending',
            reference,
            message: 'Bank is still processing your transaction…',
          });
        }
      }

      return NextResponse.json(parsed);
    }

    return NextResponse.json({
      success: false,
      status: 'failed',
      message: 'Unsupported payment action.',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      status: 'failed',
      message: error?.message || 'Unable to process card payment.',
    });
  }
}

function parsePaystackChargeResponse(
  data: any,
  httpOk: boolean,
  fallbackReference?: string,
  isFollowUpStep = false
) {
  const chargeData = data?.data || {};
  const chargeStatus = chargeData.status;
  const reference = chargeData.reference || fallbackReference || null;
  const rawMessage = String(
    chargeData.message || chargeData.gateway_response || data?.message || ''
  );

  // Treat genuine terminal failures immediately as failed (including invalid reference & terminal restrictions)
  if (
    /transaction reference is invalid/i.test(rawMessage) ||
    /not allowed at terminal/i.test(rawMessage)
  ) {
    const friendlyMessage = /transaction reference is invalid/i.test(rawMessage)
      ? 'Payment session expired. Please click Pay again to start a new transaction.'
      : 'Your card issuer declined this payment (Transaction not allowed at terminal). Please try another card.';
    return {
      success: false,
      status: 'failed',
      reference,
      message: friendlyMessage,
    };
  }

  // If Paystack reports timeout or pending/ongoing during OTP/PIN verification, keep polling instead of failing
  if (
    chargeStatus === 'pending' ||
    chargeStatus === 'ongoing' ||
    chargeStatus === 'processing' ||
    (isFollowUpStep && chargeStatus === 'timeout') ||
    /pending|ongoing|processing|timed?\s*out/i.test(rawMessage)
  ) {
    return {
      success: true,
      status: 'pending',
      reference,
      displayText: chargeData.display_text || rawMessage || 'Waiting for bank confirmation…',
      url: chargeData.url || null,
      message: rawMessage || 'Waiting for bank confirmation…',
    };
  }

  if (!httpOk || data?.status === false || chargeStatus === 'failed' || chargeStatus === 'abandoned') {
    return {
      success: false,
      status: 'failed',
      reference,
      message: rawMessage || 'Card transaction could not be completed.',
    };
  }

  return {
    success: true,
    status: chargeStatus || 'pending',
    reference,
    displayText: chargeData.display_text || data?.message || '',
    url: chargeData.url || null,
    message: rawMessage,
  };
}
