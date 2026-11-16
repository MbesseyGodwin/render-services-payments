// app/api/paystack/charge/route.ts

import { NextResponse } from 'next/server';
import { getLiveUsdToNgnRate, logFxRateToServerConsole } from '@/lib/fx';
import {
  extractPaystackMessages,
  formatPaystackErrorMessage,
  writeServerLog,
} from '@/lib/server-log';

export const maxDuration = 60;

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
        billingPeriod,
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
      const fx = await getLiveUsdToNgnRate();
      const ngn = Math.round(usd * fx.rate * 100) / 100;
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
      const callbackUrl = `${requestOrigin}${targetPath}?s=ap&paystack_callback=1&invoice=${encodeURIComponent(invoiceNumber || '')}`;

      const resolvedBillingPeriod =
        typeof billingPeriod === 'string' && billingPeriod.trim()
          ? billingPeriod.trim().slice(0, 120)
          : 'Render Oct 1, 2026 - Sep 30, 2027';
      const descriptionText = `Payment for ${serviceName || 'Render Service'} (${resolvedBillingPeriod})`;
      let activeReference = sanitizeReference(clientReference, serviceId);

      logFxRateToServerConsole({
        route: 'POST /api/paystack/charge',
        fx,
        amountUsd: usd,
        amountNgn: ngn,
        reference: activeReference,
      });

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
            billing_period: resolvedBillingPeriod,
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
                value: resolvedBillingPeriod,
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
        writeServerLog('Paystack Pending', {
          action: 'charge',
          http: result.statusCode,
          timed_out: result.timedOut ? 'true' : 'false',
          ref: activeReference,
          amount_ngn: ngn.toFixed(2),
          message: result.data?.message || 'Gateway timeout/5xx',
        });
        return NextResponse.json({
          success: true,
          status: 'pending',
          reference: activeReference,
          message: 'Waiting for bank confirmation…',
        });
      }

      return respondWithChargeResult({
        action: 'charge',
        data: result.data,
        httpOk: result.ok,
        statusCode: result.statusCode,
        fallbackReference: activeReference,
        isFollowUpStep: false,
        amountNgn: ngn,
      });
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
      return respondWithChargeResult({
        action: 'submit_pin',
        data,
        httpOk: ok,
        statusCode,
        fallbackReference: reference,
        isFollowUpStep: true,
      });
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
      return respondWithChargeResult({
        action: 'submit_otp',
        data,
        httpOk: ok,
        statusCode,
        fallbackReference: reference,
        isFollowUpStep: true,
      });
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
      return respondWithChargeResult({
        action: 'submit_phone',
        data,
        httpOk: ok,
        statusCode,
        fallbackReference: reference,
        isFollowUpStep: true,
      });
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
      return respondWithChargeResult({
        action: 'submit_birthday',
        data,
        httpOk: ok,
        statusCode,
        fallbackReference: reference,
        isFollowUpStep: true,
      });
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
      return respondWithChargeResult({
        action: 'submit_address',
        data,
        httpOk: ok,
        statusCode,
        fallbackReference: reference,
        isFollowUpStep: true,
      });
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
        const verifyData = verifyRes.data?.data || {};
        const verifyStatus = verifyData.status;
        const verifyAmountNgn =
          typeof verifyData.amount === 'number' ? verifyData.amount / 100 : undefined;

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
        if (verifyStatus === 'failed' || verifyStatus === 'abandoned') {
          return respondWithChargeResult({
            action: 'check_pending_verify',
            data: verifyRes.data,
            httpOk: verifyRes.ok,
            statusCode: verifyRes.statusCode,
            fallbackReference: reference,
            isFollowUpStep: true,
            amountNgn: verifyAmountNgn,
          });
        }
      }

      if (!parsed.success) {
        logChargeFailure({
          action: 'check_pending',
          data,
          statusCode,
          fallbackReference: reference,
          uiMessage: parsed.message,
        });
      }

      return NextResponse.json(parsed);
    }

    return NextResponse.json({
      success: false,
      status: 'failed',
      message: 'Unsupported payment action.',
    });
  } catch (error: any) {
    writeServerLog('Paystack Error', {
      action: 'POST /api/paystack/charge',
      error: error?.message || 'Unable to process card payment.',
    });
    return NextResponse.json({
      success: false,
      status: 'failed',
      message: error?.message || 'Unable to process card payment.',
    });
  }
}

function logChargeFailure(params: {
  action: string;
  data: any;
  statusCode: number;
  fallbackReference?: string;
  uiMessage: string;
  amountNgn?: number;
}) {
  const { action, data, statusCode, fallbackReference, uiMessage, amountNgn } = params;
  const chargeData = data?.data || {};
  const { gatewayResponse, gatewayMessage } = extractPaystackMessages(chargeData, data);
  const resolvedAmountNgn =
    typeof amountNgn === 'number'
      ? amountNgn.toFixed(2)
      : typeof chargeData.amount === 'number'
      ? (chargeData.amount / 100).toFixed(2)
      : undefined;

  writeServerLog('Paystack Failed', {
    action,
    status: chargeData.status || (data?.status === false ? 'rejected' : 'failed'),
    http: statusCode,
    ref: chargeData.reference || fallbackReference,
    amount_ngn: resolvedAmountNgn,
    bank: chargeData.authorization?.bank,
    gateway_response: gatewayResponse || undefined,
    gateway_message: gatewayMessage || data?.message || undefined,
    ui_message: uiMessage,
  });
}

function respondWithChargeResult(params: {
  action: string;
  data: any;
  httpOk: boolean;
  statusCode: number;
  fallbackReference?: string;
  isFollowUpStep?: boolean;
  amountNgn?: number;
}) {
  const { action, data, httpOk, statusCode, fallbackReference, isFollowUpStep, amountNgn } = params;
  const parsed = parsePaystackChargeResponse(data, httpOk, fallbackReference, isFollowUpStep);
  if (!parsed.success) {
    logChargeFailure({
      action,
      data,
      statusCode,
      fallbackReference,
      uiMessage: parsed.message,
      amountNgn,
    });
  }
  return NextResponse.json(parsed);
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
  const { bestReason, gatewayMessage } = extractPaystackMessages(chargeData, data);
  const isTerminalFailure =
    !httpOk || data?.status === false || chargeStatus === 'failed' || chargeStatus === 'abandoned';

  // For genuine terminal bank/fraud/reference declines, prefer readable gateway_response over opaque tags
  if (
    isTerminalFailure ||
    /transaction reference is invalid|not allowed at terminal|insufficient\s*funds|not\s*sufficient/i.test(
      bestReason
    )
  ) {
    const friendlyMessage = formatPaystackErrorMessage(bestReason);
    return {
      success: false,
      status: 'failed',
      reference,
      message: friendlyMessage,
    };
  }

  // If Paystack reports timeout or pending/ongoing during OTP/PIN verification, keep polling instead of failing
  const statusHint = gatewayMessage || bestReason;
  if (
    chargeStatus === 'pending' ||
    chargeStatus === 'ongoing' ||
    chargeStatus === 'processing' ||
    (isFollowUpStep && chargeStatus === 'timeout') ||
    /pending|ongoing|processing|timed?\s*out/i.test(statusHint)
  ) {
    return {
      success: true,
      status: 'pending',
      reference,
      displayText: chargeData.display_text || statusHint || 'Waiting for bank confirmation…',
      url: chargeData.url || null,
      message: statusHint || 'Waiting for bank confirmation…',
    };
  }

  return {
    success: true,
    status: chargeStatus || 'pending',
    reference,
    displayText: chargeData.display_text || data?.message || '',
    url: chargeData.url || null,
    message: bestReason,
  };
}
