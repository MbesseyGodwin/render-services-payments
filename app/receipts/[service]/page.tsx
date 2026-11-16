import { notFound } from 'next/navigation';
import ReceiptPage, { ReceiptItem } from '@/components/receipt-page';

export const dynamicParams = false;

export const receipts: Record<string, ReceiptItem> = {
  'backend-test': {
    id: 'backend-test',
    name: 'Render Backend Server (Pro Max, 16GB/4CPU)',
    qty: 1,
    unitPriceStr: '$0.2000',
    monthly: 0.4,
    total: 0.48,
    // total: 270.00,
    scrambledPath: '/i/acct_1CTbIsBmBV2o9vP5/live_VGVzdEJhY2tlbmRTZXJ2ZXJQcm9NYXgxNkdCNENQVV8wMjRVU0RfT2N0MjAyNlNlcDIwMjdfOTk4ODc3NjY1NQ',
  },
  backend: {
    id: 'backend',
    name: 'Render Backend Server (Pro Max, 16GB/4CPU)',
    qty: 1,
    unitPriceStr: '$20.0000',
    monthly: 20,
    total: 240,
    scrambledPath: '/i/acct_1CTbIsBmBV2o9vP5/live_YWNjdF8xQ1RiSXNCbUJWMm85dlA1LF9WWHpkbFBsOU9SOHZpaVBTc2tScXNodTdENUNxaWtrLDE4NTA3Mzg5OQ02007pBkRHH1',
  },
  frontend: {
    id: 'frontend',
    name: 'Render Frontend Server (Pro Plus, 8GB/4CPU)',
    qty: 1,
    unitPriceStr: '$175.0000',
    monthly: 175,
    total: 2100,
    scrambledPath: '/i/acct_1CTbIsBmBV2o9vP5/live_KjF3NW1oamZFS3JtQ2NiVWZSNHNtbFZWZFhYQ3BFRDVTM1pQZE9KWFBhRjVrUmdZcDhKbkNldHlLQ0FQNHV1',
  },
  postgresql: {
    id: 'postgresql',
    name: 'Render PostgreSQL Primary (16GB/4CPU, pooled)',
    qty: 1,
    unitPriceStr: '$350.0000',
    monthly: 350,
    total: 4200,
    scrambledPath: '/i/acct_1CTbIsBmBV2o9vP5/live_UGdTQ1N4b0h2bFBMd2JmRkxTMlFVNHdabVVIS1FZQWNNa3FCdEVrREtGaFV0NFQ0UUxKQ1FyUlBXeVVHQ1BOMF',
  },
};

export function generateStaticParams() {
  return Object.keys(receipts).map((service) => ({ service }));
}

export default async function Page({ params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  if (!(service in receipts)) {
    notFound();
  }

  const currentReceipt = receipts[service];
  const allList = Object.values(receipts);

  return <ReceiptPage receipt={currentReceipt} allReceipts={allList} />;
}
