// lib/fx.ts

import { writeServerLog } from '@/lib/server-log';

export const FALLBACK_USD_TO_NGN = 1346.84;

export type FxRateSource = 'live' | 'backup' | 'fallback';

export interface FxRateResult {
  rate: number;
  source: FxRateSource;
}

interface FxProvider {
  url: string;
  source: Exclude<FxRateSource, 'fallback'>;
  extractRate: (data: any) => unknown;
}

const FX_PROVIDERS: readonly FxProvider[] = [
  {
    url: 'https://open.er-api.com/v6/latest/USD',
    source: 'live',
    extractRate: (data) => data?.rates?.NGN,
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    source: 'backup',
    extractRate: (data) => data?.usd?.ngn,
  },
];

async function fetchProviderRate(provider: FxProvider): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(provider.url, {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(provider.extractRate(data));
    if (Number.isFinite(rate) && rate > 500 && rate < 10000) {
      return Math.round(rate * 100) / 100;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches the USD-to-NGN rate using primary and backup FX APIs with a static fallback.
 */
export async function getLiveUsdToNgnRate(): Promise<FxRateResult> {
  for (const provider of FX_PROVIDERS) {
    const rate = await fetchProviderRate(provider);
    if (rate !== null) {
      return { rate, source: provider.source };
    }
  }
  return { rate: FALLBACK_USD_TO_NGN, source: 'fallback' };
}

/**
 * Writes the FX API rate (and optional conversion total) to the server console.
 * Uses process.stdout so production compiler.removeConsole keeps browser consoles clean
 * without stripping server runtime logs.
 */
export function logFxRateToServerConsole(params: {
  route: string;
  fx: FxRateResult;
  amountUsd?: number;
  amountNgn?: number;
  reference?: string;
}): void {
  const { route, fx, amountUsd, amountNgn, reference } = params;
  const fields: Record<string, string | undefined> = {
    route,
    rate: `1 USD = NGN ${fx.rate.toFixed(2)}`,
    source: fx.source,
    conversion:
      typeof amountUsd === 'number' && typeof amountNgn === 'number'
        ? `$${amountUsd.toFixed(2)} -> NGN ${amountNgn.toFixed(2)}`
        : undefined,
    ref: reference,
  };
  writeServerLog('FX API', fields);
}
