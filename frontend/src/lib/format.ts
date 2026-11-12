export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4110';

export const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);
export const fmtSigned = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function timeAgo(ms: number | string): string {
  const t = typeof ms === 'number' ? ms : new Date(ms).getTime();
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Turns an RTK Query error into a sentence a person can read. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as { status?: number | string; data?: { error?: { message?: string } } } | undefined;
  if (e?.status === 'FETCH_ERROR') return 'Cannot reach the server. Check your connection.';
  return e?.data?.error?.message ?? fallback;
}
export const errorCode = (err: unknown): string | undefined =>
  (err as { data?: { error?: { code?: string } } } | undefined)?.data?.error?.code;
