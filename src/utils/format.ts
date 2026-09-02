export function formatInr(n: number | null): string {
  if (n === null || Number.isNaN(n)) return '—';
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatNum(n: number | null, suffix = '', decimals = 2): string {
  if (n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals }) + suffix;
}
