import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReceiptPage, { type ReceiptItem } from '@/components/receipt-page';
import { parseScrambledInvoiceToken } from '@/lib/subscriptions';

interface PageProps {
  params: Promise<{ account: string; token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { account, token } = await params;
  const decoded = parseScrambledInvoiceToken(account, token);
  if (!decoded) {
    return { title: 'Invoice not found | Render Services Payments' };
  }
  return {
    title: `Pay ${decoded.service.checkoutName} | Render Services Payments`,
    robots: { index: false, follow: false },
  };
}

export default async function ScrambledInvoicePage({ params }: PageProps) {
  const { account, token } = await params;
  const decoded = parseScrambledInvoiceToken(account, token);

  if (!decoded) {
    notFound();
  }

  const unitSuffix = decoded.billingUnit === 'day' ? 'd' : decoded.billingUnit === 'year' ? 'y' : 'm';
  const serviceName =
    decoded.service.id === 'wildcard-ucc-ssl'
      ? `Wildcard UCC SSL Certificates ${decoded.months} ${decoded.months === 1 ? 'year' : 'years'}`
      : decoded.service.checkoutName;
  const receipt: ReceiptItem = {
    id: `${decoded.service.id}-${decoded.months}${unitSuffix}`,
    name: serviceName,
    qty: 1,
    unitPriceStr: `$${decoded.monthlyUsd.toFixed(4)}`,
    monthly: decoded.monthlyUsd,
    total: decoded.totalUsd,
    months: decoded.months,
    billingUnit: decoded.billingUnit,
    termLabel: decoded.service.termLabel,
    billingPeriod: decoded.billingPeriod,
    customerEmail: decoded.customerEmail,
    scrambledPath: decoded.scrambledPath,
  };

  return <ReceiptPage receipt={receipt} allReceipts={[receipt]} />;
}
