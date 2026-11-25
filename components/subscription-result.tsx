'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type ResultState = 'checking' | 'paid' | 'failed' | 'missing'

export default function CheckoutResult({ reference }: { reference: string }) {
  const [state, setState] = useState<ResultState>(reference ? 'checking' : 'missing')

  useEffect(() => {
    if (!reference) return
    const controller = new AbortController()
    fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const result = await response.json()
        const status = result?.data?.status
        setState(response.ok && status === 'success' ? 'paid' : status === 'failed' ? 'failed' : 'failed')
      })
      .catch(() => { if (!controller.signal.aborted) setState('failed') })
    return () => controller.abort()
  }, [reference])

  const title = state === 'paid' ? 'Payment received' : state === 'checking' ? 'Checking payment' : 'Payment not confirmed'
  const message = state === 'paid'
    ? 'Paystack confirmed your payment. Render Services Payments will process the selected third-party service request and contact you using your checkout email.'
    : state === 'checking'
      ? 'We are confirming the transaction with Paystack. Please keep this page open for a moment.'
      : 'We could not confirm a successful payment. If your bank shows a debit, contact us with your Paystack reference before retrying.'

  return (
    <main className="checkout-result-page">
      <section className="checkout-result-card" aria-live="polite">
        <p className="eyebrow">Render Services Payments</p>
        <h1>{title}</h1>
        <p>{message}</p>
        {reference && <p><strong>Paystack reference:</strong> {reference}</p>}
        {state !== 'checking' && <Link href="/subscriptions">Return to service packages</Link>}
      </section>
    </main>
  )
}
