'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MIN_BILLING_DAYS,
  MIN_BILLING_MONTHS,
  buildScrambledInvoicePath,
  calculatePackageAmountUsd,
  clampBillingMonths,
  formatTermLabel,
  getBillingUnit,
  getMaxBillingUnits,
  getUnitUsd,
  isMonthlyAdjustable,
  managedServicePackages,
  type ManagedServicePackage,
} from '@/lib/subscriptions'

type FxState = { rate: number; source?: string } | null

interface ShareLinkState {
  service: ManagedServicePackage
  months: number
  amountUsd: number
  scrambledPath: string
  fullUrl: string
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount)
}

function formatNgn(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(amount)
}

function ShareIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

export default function SubscriptionCatalog() {
  const [email, setEmail] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [monthsByService, setMonthsByService] = useState<Record<string, number>>(() =>
    Object.fromEntries(managedServicePackages.map((item) => [item.id, item.termMonths]))
  )
  const [selectedPackage, setSelectedPackage] = useState<ManagedServicePackage | null>(null)
  const [shareState, setShareState] = useState<ShareLinkState | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [fx, setFx] = useState<FxState>(null)
  const [accepted, setAccepted] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'error' | 'info'; message: string } | null>(null)
  const [validation, setValidation] = useState<{ email: boolean; terms: boolean }>({ email: false, terms: false })
  const emailRef = useRef<HTMLInputElement>(null)
  const termsRef = useRef<HTMLInputElement>(null)
  const noticeDialogRef = useRef<HTMLDialogElement>(null)
  const detailsDialogRef = useRef<HTMLDialogElement>(null)
  const shareDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = noticeDialogRef.current
    if (notice && dialog && !dialog.open) dialog.showModal()
  }, [notice])

  useEffect(() => {
    const dialog = detailsDialogRef.current
    if (selectedPackage && dialog && !dialog.open) dialog.showModal()
  }, [selectedPackage])

  useEffect(() => {
    const dialog = shareDialogRef.current
    if (shareState && dialog && !dialog.open) dialog.showModal()
  }, [shareState])

  function getSelectedMonths(service: ManagedServicePackage): number {
    return clampBillingMonths(service, monthsByService[service.id])
  }

  function updateServiceMonths(service: ManagedServicePackage, delta: number) {
    if (!isMonthlyAdjustable(service)) return
    setMonthsByService((prev) => {
      const current = clampBillingMonths(service, prev[service.id])
      const next = clampBillingMonths(service, current + delta)
      return { ...prev, [service.id]: next }
    })
  }

  function closePackageDetails() {
    detailsDialogRef.current?.close()
    setSelectedPackage(null)
  }

  function closeShareDialog() {
    shareDialogRef.current?.close()
    setShareState(null)
    setCopiedUrl(false)
  }

  async function copyPaymentUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(true)
    } catch {
      setCopiedUrl(false)
    }
  }

  function openShareDialog(service: ManagedServicePackage) {
    const months = getSelectedMonths(service)
    const amountUsd = calculatePackageAmountUsd(service, months)
    const scrambledPath = buildScrambledInvoicePath(service, months, email)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const fullUrl = `${origin}${scrambledPath}`
    setCopiedUrl(false)
    setShareState({
      service,
      months,
      amountUsd,
      scrambledPath,
      fullUrl,
    })
    void copyPaymentUrl(fullUrl)
  }

  async function handleNativeShare(state: ShareLinkState) {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return
    try {
      await navigator.share({
        title: `${state.service.name} — Render Services Payments`,
        text: `Payment link for ${state.service.name} (${formatTermLabel(state.service, state.months)} · ${formatUsd(state.amountUsd)})`,
        url: state.fullUrl,
      })
    } catch {
      // User cancelled native share sheet
    }
  }

  function closeNotice() {
    noticeDialogRef.current?.close()
    setNotice(null)
    requestAnimationFrame(() => {
      if (validation.email) emailRef.current?.focus()
      else if (validation.terms) termsRef.current?.focus()
      setValidation({ email: false, terms: false })
    })
  }

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/fx', { cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const rate = Number(data?.rate)
        if (Number.isFinite(rate) && rate > 0) setFx({ rate, source: data?.source })
      })
      .catch(() => setFx(null))
    return () => controller.abort()
  }, [])

  const categories = useMemo(() => ['All', ...new Set(managedServicePackages.map((item) => item.category))], [])
  const visiblePackages = useMemo(() => {
    const query = search.trim().toLowerCase()
    return managedServicePackages.filter((item) => {
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter
      const searchableText = `${item.name} ${item.description} ${item.category} ${item.highlights.join(' ')}`.toLowerCase()
      return matchesCategory && (!query || searchableText.includes(query))
    })
  }, [categoryFilter, search])

  async function startCheckout(service: ManagedServicePackage, event?: { preventDefault: () => void }) {
    event?.preventDefault()
    setNotice(null)
    const normalizedEmail = (service.checkoutEmail || email).trim()
    const emailMissing = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    const termsMissing = !accepted
    setValidation({ email: emailMissing, terms: termsMissing })
    if (emailMissing || termsMissing) {
      const message =
        emailMissing && termsMissing
          ? 'Enter your customer email and confirm the third-party management and payment terms to continue.'
          : emailMissing
            ? 'Enter a valid customer email to continue to Paystack.'
            : 'Confirm the third-party management and payment terms to continue.'
      setNotice({ type: 'error', message })
      if (emailMissing) emailRef.current?.focus()
      else termsRef.current?.focus()
      return
    }

    const months = getSelectedMonths(service)
    setLoadingId(service.id)
    try {
      const response = await fetch('/api/paystack/subscriptions/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, packageId: service.id, months, termsAccepted: accepted }),
      })
      const result = await response.json()
      if (!response.ok || !result?.success || typeof result?.access_code !== 'string') {
        throw new Error(result?.message || 'We could not start Paystack checkout. Please try again.')
      }
      const { default: Paystack } = await import('@paystack/inline-js')
      new Paystack().resumeTransaction(result.access_code)
      setLoadingId(null)
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Checkout could not be started. Please try again.' })
      setLoadingId(null)
    }
  }

  const selectedMonths = selectedPackage ? getSelectedMonths(selectedPackage) : 0
  const selectedUnit = selectedPackage ? getBillingUnit(selectedPackage) : 'month'
  const selectedUnitUsd = selectedPackage ? getUnitUsd(selectedPackage) : null
  const selectedMinUnits = selectedUnit === 'day' ? MIN_BILLING_DAYS : MIN_BILLING_MONTHS
  const selectedMaxUnits = selectedPackage ? getMaxBillingUnits(selectedPackage) : 60
  const selectedAmountUsd = selectedPackage ? calculatePackageAmountUsd(selectedPackage, selectedMonths) : 0
  const selectedIsBillable = Boolean(
    selectedPackage && !selectedPackage.inquiryOnly && selectedPackage.billable !== false && selectedAmountUsd > 0
  )

  return (
    <main className="subscription-page">
      <header className="subscription-header">
        <a className="company-brand" href="/subscriptions" aria-label="Render Services Payments home">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>Render Services Payments<small>Managed cloud services</small></span>
        </a>
        <a className="header-contact" href="mailto:support@render.com">Questions? Contact us</a>
      </header>

      <section className="subscription-hero">
        <p className="eyebrow">Third-party subscription management</p>
        <h1>Technology services, managed around your business.</h1>
        <p className="hero-copy">Browse infrastructure plans, communication services and development work. Choose the number of months you need for auto-calculated pricing, or share a direct payment link.</p>
        <div className="provider-disclosure">
          <strong>Who you are paying</strong>
          <p>Payments are made to Render Services Payments for the selected software or technology service. For infrastructure plans, we arrange and manage the listed third-party services on your company’s behalf. Render is one of the infrastructure providers; this is not the Render website or an official Render checkout.</p>
        </div>
      </section>

      <section className="checkout-details" aria-labelledby="checkout-heading">
        <div>
          <p className="eyebrow">Before you choose</p>
          <h2 id="checkout-heading">Use your billing email</h2>
          <p>Paystack will use this email for payment records and receipts. Custom project enquiries can be sent through WhatsApp or by phone.</p>
        </div>
        <label className="email-field">
          <span>Customer email</span>
          <input ref={emailRef} type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" value={email} aria-invalid={validation.email} onChange={(event) => { setEmail(event.target.value); setValidation((state) => ({ ...state, email: false })) }} required />
        </label>
      </section>

      <section className="package-list" aria-label="Available managed service packages">
        <div className="catalog-toolbar">
          <label className="catalog-search">
            <span>Search services</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by service or feature" />
          </label>
          <label className="catalog-filter">
            <span>Filter by area</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <p className="catalog-count">{visiblePackages.length} {visiblePackages.length === 1 ? 'service' : 'services'}</p>
        </div>
        <div className="package-table-wrap">
          <table className="package-table">
            <thead>
              <tr>
                <th scope="col">Area</th>
                <th scope="col">Service</th>
                <th scope="col">Rate (USD)</th>
                <th scope="col">Term</th>
                <th scope="col">Amount due (USD)</th>
                <th scope="col">Share link</th>
              </tr>
            </thead>
            <tbody>
              {visiblePackages.map((service) => {
                const unit = getBillingUnit(service)
                const unitUsd = getUnitUsd(service)
                const adjustable = isMonthlyAdjustable(service)
                const units = getSelectedMonths(service)
                const minUnits = unit === 'day' ? MIN_BILLING_DAYS : MIN_BILLING_MONTHS
                const maxUnits = getMaxBillingUnits(service)
                const amountUsd = calculatePackageAmountUsd(service, units)
                const canShare = !service.inquiryOnly && service.billable !== false && amountUsd > 0
                const openDetails = () => setSelectedPackage(service)
                const shortUnitLabel = unit === 'day'
                  ? (units === 1 ? 'day' : 'days')
                  : (units === 1 ? 'mo' : 'mos')
                const rateSuffix = unit === 'day' ? 'day' : 'mo'
                return (
                  <tr
                    key={service.id}
                    className="package-row"
                    tabIndex={0}
                    role="button"
                    aria-haspopup="dialog"
                    aria-label={`View details for ${service.name}`}
                    onClick={openDetails}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openDetails()
                      }
                    }}
                  >
                    <td><span className="table-category">{service.category}</span></td>
                    <td className="service-cell">
                      <strong>{service.name}</strong>
                    </td>
                    <td>{service.inquiryOnly ? 'Custom quote' : unitUsd === null ? '—' : unitUsd === 0 ? 'Included' : `${formatUsd(unitUsd)} / ${rateSuffix}`}</td>
                    <td onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                      {adjustable ? (
                        <div className="month-stepper" aria-label={`Select ${unit === 'day' ? 'days' : 'months'} for ${service.name}`}>
                          <button
                            type="button"
                            className="month-stepper-btn"
                            aria-label={`Decrease ${unit === 'day' ? 'days' : 'months'} for ${service.name}`}
                            disabled={units <= minUnits}
                            onClick={() => updateServiceMonths(service, -1)}
                          >
                            −
                          </button>
                          <span className="month-stepper-value">
                            {units} {shortUnitLabel}
                          </span>
                          <button
                            type="button"
                            className="month-stepper-btn"
                            aria-label={`Increase ${unit === 'day' ? 'days' : 'months'} for ${service.name}`}
                            disabled={units >= maxUnits}
                            onClick={() => updateServiceMonths(service, 1)}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span>{service.termLabel}</span>
                      )}
                    </td>
                    <td className="amount-cell">{service.inquiryOnly ? 'Custom quote' : amountUsd === 0 ? 'Included' : formatUsd(amountUsd)}</td>
                    <td onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                      {canShare ? (
                        <button
                          type="button"
                          className="share-row-btn"
                          aria-label={`Share payment link for ${service.name}`}
                          onClick={() => openShareDialog(service)}
                        >
                          <ShareIcon />
                          <span>Share</span>
                        </button>
                      ) : (
                        <span className="share-unavailable">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {visiblePackages.length === 0 && <tr><td className="empty-table" colSpan={6}>No services match your search.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="catalog-note">Use the + and − controls to select your desired number of months and auto-calculate pricing. Click Share to generate a direct payment link, or select a row to see full details and NGN estimates.</p>
      </section>

      <section className="payment-terms" aria-label="Payment terms">
        <label className="terms-check">
          <input ref={termsRef} type="checkbox" checked={accepted} aria-invalid={validation.terms} onChange={(event) => { setAccepted(event.target.checked); setValidation((state) => ({ ...state, terms: false })) }} />
          <span>I am authorized to request this service for my company. I understand that the displayed amount is a one-time payment for the listed service or term and does not automatically renew. Custom development and support work is scoped and quoted separately.</span>
        </label>
        <p>Paystack opens in a secure checkout window. Choose card or bank transfer. Payments cover the term shown and do not automatically renew.</p>
      </section>

      <footer className="subscription-footer">
        <p>Render Services Payments · CAC RC 7445956 · Umuahia, Nigeria</p>
        <p>Questions about a package? <a href="mailto:support@render.com">Contact the management team</a></p>
      </footer>

      {notice && (
        <dialog
          ref={noticeDialogRef}
          className="checkout-dialog"
          aria-labelledby="checkout-dialog-title"
          onCancel={(event) => { event.preventDefault(); closeNotice() }}
          onClose={() => {
            setNotice(null)
            requestAnimationFrame(() => {
              if (validation.email) emailRef.current?.focus()
              else if (validation.terms) termsRef.current?.focus()
              setValidation({ email: false, terms: false })
            })
          }}
        >
          <p className="eyebrow">{notice.type === 'error' ? 'Action needed' : 'Checkout update'}</p>
          <h2 id="checkout-dialog-title">{validation.email || validation.terms ? 'Check your details' : 'Checkout update'}</h2>
          <p>{notice.message}</p>
          <button className="checkout-button" type="button" onClick={closeNotice} autoFocus>Close</button>
        </dialog>
      )}

      {selectedPackage && (
        <dialog
          ref={detailsDialogRef}
          className="checkout-dialog package-details-dialog"
          aria-labelledby="package-details-title"
          onCancel={(event) => { event.preventDefault(); closePackageDetails() }}
          onClose={() => setSelectedPackage(null)}
        >
          <div className="details-dialog-heading">
            <div>
              <p className="eyebrow">{selectedPackage.category}</p>
              <h2 id="package-details-title">{selectedPackage.name}</h2>
            </div>
            <button className="dialog-close" type="button" onClick={closePackageDetails}>Close</button>
          </div>
          <p className="package-details-description">{selectedPackage.description}</p>
          <ul className="package-details-list">
            {selectedPackage.highlights.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <dl className="package-details-pricing">
            <div>
              <dt>{selectedUnit === 'day' ? 'Daily rate' : 'Monthly rate'}</dt>
              <dd>{selectedPackage.inquiryOnly ? 'Custom quote' : selectedUnitUsd === null ? 'One-time fee' : selectedUnitUsd === 0 ? 'Included' : `${formatUsd(selectedUnitUsd)} / ${selectedUnit}`}</dd>
            </div>
            <div>
              <dt>Term</dt>
              <dd>
                {isMonthlyAdjustable(selectedPackage) ? (
                  <div className="month-stepper month-stepper-dialog">
                    <button
                      type="button"
                      className="month-stepper-btn"
                      aria-label={`Decrease ${selectedUnit === 'day' ? 'days' : 'months'} for ${selectedPackage.name}`}
                      disabled={selectedMonths <= selectedMinUnits}
                      onClick={() => updateServiceMonths(selectedPackage, -1)}
                    >
                      −
                    </button>
                    <span className="month-stepper-value">{formatTermLabel(selectedPackage, selectedMonths)}</span>
                    <button
                      type="button"
                      className="month-stepper-btn"
                      aria-label={`Increase ${selectedUnit === 'day' ? 'days' : 'months'} for ${selectedPackage.name}`}
                      disabled={selectedMonths >= selectedMaxUnits}
                      onClick={() => updateServiceMonths(selectedPackage, 1)}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  selectedPackage.termLabel
                )}
              </dd>
            </div>
            <div>
              <dt>Amount due</dt>
              <dd>{selectedPackage.inquiryOnly ? 'Custom quote' : selectedAmountUsd === 0 ? 'Included' : formatUsd(selectedAmountUsd)}</dd>
            </div>
            {!selectedPackage.inquiryOnly && selectedAmountUsd > 0 && (
              <div>
                <dt>Estimated NGN</dt>
                <dd>{fx ? formatNgn(selectedAmountUsd * fx.rate) : 'Calculated at checkout'}</dd>
              </div>
            )}
            {selectedPackage.checkoutEmail && (
              <div>
                <dt>Checkout email</dt>
                <dd>{selectedPackage.checkoutEmail}</dd>
              </div>
            )}
          </dl>
          {selectedPackage.inquiryOnly ? (
            <div className="custom-service-actions">
              <p>Tell us what you need. We’ll discuss the scope and provide a quote before work begins.</p>
              <a className="checkout-button custom-contact-button" href={`https://wa.me/2349038317102?text=${encodeURIComponent(`Hi, I would like a quote for ${selectedPackage.name}.`)}`} target="_blank" rel="noreferrer">Discuss on WhatsApp</a>
              <a className="call-link" href="tel:+2349038317102">Call 09038337102</a>
            </div>
          ) : !selectedIsBillable ? (
            <p className="included-notice">This item is included at no additional charge in the supplied estimate.</p>
          ) : (
            <div className="details-actions-row">
              <button
                className="checkout-button details-checkout-button"
                type="button"
                disabled={loadingId !== null}
                onClick={() => {
                  const service = selectedPackage
                  closePackageDetails()
                  void startCheckout(service)
                }}
              >
                {loadingId === selectedPackage.id ? 'Opening Paystack…' : 'Continue to Paystack'}
              </button>
              <button
                className="share-secondary-button"
                type="button"
                onClick={() => {
                  const service = selectedPackage
                  closePackageDetails()
                  openShareDialog(service)
                }}
              >
                <ShareIcon />
                <span>Share payment link</span>
              </button>
            </div>
          )}
        </dialog>
      )}

      {shareState && (
        <dialog
          ref={shareDialogRef}
          className="checkout-dialog share-dialog"
          aria-labelledby="share-dialog-title"
          onCancel={(event) => { event.preventDefault(); closeShareDialog() }}
          onClose={() => { setShareState(null); setCopiedUrl(false) }}
        >
          <div className="details-dialog-heading">
            <div>
              <p className="eyebrow">Payment link ready</p>
              <h2 id="share-dialog-title">{shareState.service.name}</h2>
            </div>
            <button className="dialog-close" type="button" onClick={closeShareDialog}>Close</button>
          </div>
          <p className="share-summary">
            <strong>{formatUsd(shareState.amountUsd)}</strong> · {formatTermLabel(shareState.service, shareState.months)}
            {fx ? ` (≈ ${formatNgn(shareState.amountUsd * fx.rate)})` : ''}
          </p>
          <label className="share-link-field">
            <span>Invoice payment URL</span>
            <input
              type="text"
              readOnly
              value={shareState.fullUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          {copiedUrl && <p className="share-copied-badge" role="status">Payment link copied to clipboard.</p>}
          <div className="share-actions-grid">
            <button
              type="button"
              className="checkout-button"
              onClick={() => void copyPaymentUrl(shareState.fullUrl)}
            >
              {copiedUrl ? 'Copied Link' : 'Copy Link'}
            </button>
            <a
              className="share-secondary-button"
              href={shareState.scrambledPath}
              target="_blank"
              rel="noreferrer"
            >
              Open Payment Page
            </a>
            <a
              className="share-secondary-button"
              href={`https://wa.me/?text=${encodeURIComponent(`Payment link for ${shareState.service.name} (${formatTermLabel(shareState.service, shareState.months)} · ${formatUsd(shareState.amountUsd)}): ${shareState.fullUrl}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Send via WhatsApp
            </a>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                className="share-secondary-button"
                onClick={() => void handleNativeShare(shareState)}
              >
                More Share Options
              </button>
            )}
          </div>
        </dialog>
      )}
    </main>
  )
}
