import { NextResponse } from 'next/server';

const FALLBACK_USD_TO_NGN = 1346.84;

export async function GET() {
  // 1. Primary Live FX API: open.er-api.com
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.rates?.NGN);
      if (Number.isFinite(rate) && rate > 500 && rate < 10000) {
        return NextResponse.json({ rate: Math.round(rate * 100) / 100, source: 'live' });
      }
    }
  } catch {
    // Try backup FX source
  }

  // 2. Secondary Backup Live FX API: jsdelivr currency-api
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
      {
        signal: controller.signal,
        next: { revalidate: 300 },
      }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.usd?.ngn);
      if (Number.isFinite(rate) && rate > 500 && rate < 10000) {
        return NextResponse.json({ rate: Math.round(rate * 100) / 100, source: 'backup' });
      }
    }
  } catch {
    // Fall back to static rate
  }

  return NextResponse.json({ rate: FALLBACK_USD_TO_NGN, source: 'fallback' });
}
