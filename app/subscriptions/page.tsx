import type { Metadata } from 'next'
import SubscriptionCatalog from '@/components/subscription-catalog'

export const metadata: Metadata = {
  title: 'Managed Hosting Services and Packages | Render Services Payments',
  description: 'Review managed cloud hosting and infrastructure service packages from Render Services Payments. Payments are for third-party subscription management on your company’s behalf.',
  robots: { index: true, follow: true },
}

export default function SubscriptionsPage() {
  return <SubscriptionCatalog />
}
