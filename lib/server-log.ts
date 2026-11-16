// lib/server-log.ts

const OPAQUE_PAYSTACK_TAGS = new Set([
  'fellback-bnf',
  'expecting-3d-response',
]);

const DECLINE_MESSAGE_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /insufficient\s*funds|not\s*sufficient/i,
    'Declined: Insufficient funds in the account. Please fund your account or try a different card.',
  ],
  [
    /transaction reference is invalid/i,
    'Payment session expired. Please click Pay again to start a new transaction.',
  ],
  [
    /not allowed at terminal/i,
    'Your card issuer declined this payment (Transaction not allowed at terminal). Please try another card.',
  ],
  [
    /expired\s*card/i,
    'Your card has expired. Please try a different card.',
  ],
  [
    /incorrect\s*pin|invalid\s*pin/i,
    'Incorrect card PIN. Please check your PIN and try again.',
  ],
  [
    /exceeds?\s*(withdrawal|daily|transaction)?\s*limit|limit\s*exceeded/i,
    'Transaction exceeds your card spending limit. Please try another card or raise your card limit.',
  ],
];

/**
 * Writes structured diagnostics to server stdout so production compiler.removeConsole
 * keeps browser DevTools silent without stripping server terminal or Vercel runtime logs.
 */
export function writeServerLog(
  tag: string,
  fields: Record<string, string | number | null | undefined>
): void {
  const parts = [`[${tag}]`];
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${key}=${String(value)}`);
    }
  }
  const line = `${parts.join(' | ')}\n`;
  if (typeof process !== 'undefined' && typeof process.stdout?.write === 'function') {
    process.stdout.write(line);
  }
}

/**
 * Extracts Paystack's gateway_response and message, preferring human-readable bank
 * decline text over opaque internal codes such as "fellback-BnF".
 */
export function extractPaystackMessages(chargeData: any, topData?: any): {
  gatewayResponse: string;
  gatewayMessage: string;
  bestReason: string;
} {
  const gatewayResponse = String(chargeData?.gateway_response || '').trim();
  const gatewayMessage = String(chargeData?.message || '').trim();
  const topMessage = String(topData?.message || '').trim();

  const isOpaque = (val: string) => OPAQUE_PAYSTACK_TAGS.has(val.toLowerCase());
  const candidates = [gatewayResponse, gatewayMessage, topMessage];

  const readable = candidates.find((val) => val && !isOpaque(val));
  const bestReason = readable || gatewayResponse || gatewayMessage || topMessage;

  return { gatewayResponse, gatewayMessage, bestReason };
}

/**
 * Converts bank or gateway decline text into a clear customer-facing message.
 */
export function formatPaystackErrorMessage(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) {
    return 'Card transaction could not be completed.';
  }
  for (const [pattern, friendly] of DECLINE_MESSAGE_RULES) {
    if (pattern.test(trimmed)) {
      return friendly;
    }
  }
  return trimmed;
}
