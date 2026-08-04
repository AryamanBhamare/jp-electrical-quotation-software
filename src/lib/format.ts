// Formatting helpers for currency, numbers and dates.

const IN_NUMBER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export function formatNumber(n: number, decimals = 2): string {
  if (!isFinite(n)) return '0.00';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: 0 }).format(n);
}

export function formatMoney(n: number, symbol = '₹'): string {
  if (!isFinite(n)) return `${symbol}0.00`;
  return `${symbol} ${IN_NUMBER.format(n)}`;
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatDate(iso: string, pattern = 'DD/MM/YYYY'): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map((x) => Number(x));
  if (!y || !m || !d) return iso;
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  switch (pattern) {
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${y}`;
    case 'YYYY-MM-DD':
      return `${y}-${mm}-${dd}`;
    case 'DD MMM YYYY': {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${dd} ${months[m - 1]} ${y}`;
    }
    case 'DD-MM-YYYY':
      return `${dd}-${mm}-${y}`;
    default:
      return `${dd}/${mm}/${y}`;
  }
}

export function toISOFromAny(input: string): string {
  if (!input) return '';
  const s = input.trim();
  // already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // YYYY/MM/DD
  const m2 = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  // DD Mon YYYY
  const m3 = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[,\s]?(\d{2,4})$/);
  if (m3) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const idx = monthNames.indexOf(m3[2].toLowerCase().slice(0, 3));
    if (idx >= 0) return `${m3[3].length === 2 ? '20' + m3[3] : m3[3]}-${String(idx + 1).padStart(2, '0')}-${m3[1].padStart(2, '0')}`;
  }
  return '';
}

export function detectCurrencySymbol(text: string): string | null {
  if (text.includes('₹') || /\bINR\b|\bRs\.?\b/i.test(text)) return '₹';
  if (/\$\b/.test(text)) return '$';
  if (text.includes('€')) return '€';
  if (text.includes('£')) return '£';
  return null;
}
