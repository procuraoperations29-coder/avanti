/**
 * Money formatting.
 *
 * Currency-aware from day one (Phase 3 §1.3): every amount carries a currency
 * code (ISO 4217). We do NOT assume NGN — the launch market defaults to NGN
 * but the schema and utilities are multi-currency.
 */

const LOCALE_BY_CURRENCY: Record<string, string> = {
  NGN: 'en-NG',
  GHS: 'en-GH',
  KES: 'en-KE',
  ZAR: 'en-ZA',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
};

const SYMBOL_BY_CURRENCY: Record<string, string> = {
  NGN: '₦',
  GHS: 'GH₵',
  KES: 'KSh',
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export type CurrencyCode = keyof typeof SYMBOL_BY_CURRENCY;

/**
 * Format money for display.
 *
 * @param amount - Amount in the currency's major unit (e.g. NGN 36000, not 3600000 kobo).
 * @param currency - ISO 4217 code.
 * @param options.decimals - Show decimals? Default: false for whole amounts, true otherwise.
 * @param options.symbol - Prefix with symbol? Default: true.
 */
export function fmtMoney(
  amount: number,
  currency: CurrencyCode = 'NGN',
  options: { decimals?: boolean; symbol?: boolean } = {}
): string {
  const showDecimals = options.decimals ?? amount % 1 !== 0;
  const showSymbol = options.symbol ?? true;
  const locale = LOCALE_BY_CURRENCY[currency] ?? 'en-US';
  const symbol = SYMBOL_BY_CURRENCY[currency] ?? currency + ' ';

  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return showSymbol ? `${symbol}${formatted}` : formatted;
}
