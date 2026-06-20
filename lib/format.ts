/**
 * Format a numeric amount as Nigerian Naira with the ₦ symbol.
 * Uses en-NG locale for comma separators; always shows two decimals
 * (₦1,200.00 not ₦1,200) so cents-of-a-naira (kobo) are visible
 * where the DB allows fractional prices.
 */
export function formatNaira(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "₦0.00";
  return `₦${Number(n).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
