// next.config.ts

import type { NextConfig } from 'next';

/**
 * Scrambled Stripe-style invoice URLs:
 *
 * Backend Test       → /i/acct_1CTbIsBmBV2o9vP5/live_VGVzdEJhY2tlbmRTZXJ2ZXJQcm9NYXgxNkdCNENQVV8wMjRVU0RfT2N0MjAyNlNlcDIwMjdfOTk4ODc3NjY1NQ
 * Backend            → /i/acct_1CTbIsBmBV2o9vP5/live_YWNjdF8xQ1RiSXNCbUJWMm85dlA1LF9WWHpkbFBsOU9SOHZpaVBTc2tScXNodTdENUNxaWtrLDE4NTA3Mzg5OQ02007pBkRHH1
 * Frontend           → /i/acct_1CTbIsBmBV2o9vP5/live_KjF3NW1oamZFS3JtQ2NiVWZSNHNtbFZWZFhYQ3BFRDVTM1pQZE9KWFBhRjVrUmdZcDhKbkNldHlLQ0FQNHV1
 * Postgres           → /i/acct_1CTbIsBmBV2o9vP5/live_UGdTQ1N4b0h2bFBMd2JmRkxTMlFVNHdabVVIS1FZQWNNa3FCdEVrREtGaFV0NFQ0UUxKQ1FyUlBXeVVHQ1BOMF
 * Monitoring         → /i/acct_1CTbIsBmBV2o9vP5/live_TW9uaXRvcmluZ0FuZEFsZXJ0aW5nVXB0aW1lQVBNXzI0MFVTRF8xWWVhcl9PY3QyMDI2U2VwMjAyN184ODQxMjA
 * SSL & Domain       → /i/acct_1CTbIsBmBV2o9vP5/live_U1NMQ2VydGlmaWNhdGVBbmREb21haW5UTFNfMTU2VVNEXzFZZWFyX09jdDIwMjZTZXAyMDI3Xzc3MzkxMA
 * CDN                → /i/acct_1CTbIsBmBV2o9vP5/live_Q29udGVudERlbGl2ZXJ5TmV0d29ya0NETl8yNDBVU0RfMVllYXJfT2N0MjAyNlNlcDIwMjdfNjYxOTQw
 * Cache              → /i/acct_1CTbIsBmBV2o9vP5/live_TWFuYWdlZFJlZGlzSW5NZW1vcnlDYWNoZV8yNDBVU0RfMVllYXJfT2N0MjAyNlNlcDIwMjdfNTUyODM5
 * File Server (5 mo) → /i/acct_1CTbIsBmBV2o9vP5/live_TWFuYWdlZEZpbGVTZXJ2ZXJTdG9yYWdlXzI3MFVTRF81TW9udGhzX09jdDIwMjZGZWIyMDI3XzQ0OTE4Mg
 * Persistent Disk    → /i/acct_1CTbIsBmBV2o9vP5/live_UGVyc2lzdGVudE5WTWVEaXNrU3RvcmFnZV8yNDBVU0RfMVllYXJfT2N0MjAyNlNlcDIwMjdfMzM4Mjkx
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
      // ── Monitoring and Alerting ($240 / $20 per month, 1 year) ──────────
      {
        source:
          '/i/acct_1CTbIsBmBV2o9vP5/live_TW9uaXRvcmluZ0FuZEFsZXJ0aW5nVXB0aW1lQVBNXzI0MFVTRF8xWWVhcl9PY3QyMDI2U2VwMjAyN184ODQxMjA',
        destination: '/receipts/monitoring',
      },
      // ── SSL Certificate & Domain ($156 / $13 per month, 1 year) ─────────
      {
        source:
          '/i/acct_1CTbIsBmBV2o9vP5/live_U1NMQ2VydGlmaWNhdGVBbmREb21haW5UTFNfMTU2VVNEXzFZZWFyX09jdDIwMjZTZXAyMDI3Xzc3MzkxMA',
        destination: '/receipts/ssl-domain',
      },
      // ── CDN ($240 / $20 per month, 1 year) ───────────────────────────────
      {
        source:
          '/i/acct_1CTbIsBmBV2o9vP5/live_Q29udGVudERlbGl2ZXJ5TmV0d29ya0NETl8yNDBVU0RfMVllYXJfT2N0MjAyNlNlcDIwMjdfNjYxOTQw',
        destination: '/receipts/cdn',
      },
      // ── Cache ($240 / $20 per month, 1 year) ─────────────────────────────
      {
        source:
          '/i/acct_1CTbIsBmBV2o9vP5/live_TWFuYWdlZFJlZGlzSW5NZW1vcnlDYWNoZV8yNDBVU0RfMVllYXJfT2N0MjAyNlNlcDIwMjdfNTUyODM5',
        destination: '/receipts/cache',
      },
      // ── File Server ($270 / $54 per month, 5 months) ─────────────────────
      {
        source:
          '/i/acct_1CTbIsBmBV2o9vP5/live_TWFuYWdlZEZpbGVTZXJ2ZXJTdG9yYWdlXzI3MFVTRF81TW9udGhzX09jdDIwMjZGZWIyMDI3XzQ0OTE4Mg',
        destination: '/receipts/file-server',
      },
      // ── Persistent Disk Storage ($240 / $20 per month, 1 year) ───────────
      {
        source:
          '/i/acct_1CTbIsBmBV2o9vP5/live_UGVyc2lzdGVudE5WTWVEaXNrU3RvcmFnZV8yNDBVU0RfMVllYXJfT2N0MjAyNlNlcDIwMjdfMzM4Mjkx',
        destination: '/receipts/persistent-disk',
      },
    ];
  },
};

export default nextConfig;
