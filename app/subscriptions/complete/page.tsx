import CheckoutResult from '@/components/subscription-result'

export const metadata = {
  title: 'Payment status | Render Services Payments',
  robots: { index: false, follow: false },
}

export default async function SubscriptionCompletePage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference = '' } = await searchParams
  return <CheckoutResult reference={reference} />
}
