import type { NextConfig } from 'next';

/**
 * Scrambled Stripe-style invoice URLs:
 *
 * Backend Test → /i/acct_1CTbIsBmBV2o9vP5/live_VGVzdEJhY2tlbmRTZXJ2ZXJQcm9NYXgxNkdCNENQVV8wMjRVU0RfT2N0MjAyNlNlcDIwMjdfOTk4ODc3NjY1NQ
 * Backend      → /i/acct_1CTbIsBmBV2o9vP5/live_YWNjdF8xQ1RiSXNCbUJWMm85dlA1LF9WWHpkbFBsOU9SOHZpaVBTc2tScXNodTdENUNxaWtrLDE4NTA3Mzg5OQ02007pBkRHH1
 * Frontend     → /i/acct_1CTbIsBmBV2o9vP5/live_KjF3NW1oamZFS3JtQ2NiVWZSNHNtbFZWZFhYQ3BFRDVTM1pQZE9KWFBhRjVrUmdZcDhKbkNldHlLQ0FQNHV1
 * Postgres     → /i/acct_1CTbIsBmBV2o9vP5/live_UGdTQ1N4b0h2bFBMd2JmRkxTMlFVNHdabVVIS1FZQWNNa3FCdEVrREtGaFV0NFQ0UUxKQ1FyUlBXeVVHQ1BOMF
 *
 * All support optional ?s=ap query param (like Stripe).
 */
const nextConfig: NextConfig = {
  compiler: {
    removeConsole: true,
  },
  devIndicators: false,
  async rewrites() {
    return [
      // ── Backend Test ($0.24 / $0.20 per month) ───────────────────────────
      {
        source:
          '/i/acct_1CTbIsBmBV2o9vP5/live_VGVzdEJhY2tlbmRTZXJ2ZXJQcm9NYXgxNkdCNENQVV8wMjRVU0RfT2N0MjAyNlNlcDIwMjdfOTk4ODc3NjY1NQ',
        destination: '/receipts/backend-test',
      },
      // ── Backend ──────────────────────────────────────────────────────────
      {
        source:
          '/i/acct_1CTbIsBmBV2o9vP5/live_YWNjdF8xQ1RiSXNCbUJWMm85dlA1LF9WWHpkbFBsOU9SOHZpaVBTc2tScXNodTdENUNxaWtrLDE4NTA3Mzg5OQ02007pBkRHH1',
        destination: '/receipts/backend',
      },
      // ── Frontend ─────────────────────────────────────────────────────────
      {
        source:
          '/i/acct_1CTbIsBmBV2o9vP5/live_KjF3NW1oamZFS3JtQ2NiVWZSNHNtbFZWZFhYQ3BFRDVTM1pQZE9KWFBhRjVrUmdZcDhKbkNldHlLQ0FQNHV1',
        destination: '/receipts/frontend',
      },
      // ── PostgreSQL ───────────────────────────────────────────────────────
      {
        source:
          '/i/acct_1CTbIsBmBV2o9vP5/live_UGdTQ1N4b0h2bFBMd2JmRkxTMlFVNHdabVVIS1FZQWNNa3FCdEVrREtGaFV0NFQ0UUxKQ1FyUlBXeVVHQ1BOMF',
        destination: '/receipts/postgresql',
      },
    ];
  },
};

export default nextConfig;
