export async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder().encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return 'sha256:' + Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(plain: string, stored?: string): Promise<boolean> {
  if (!stored) return false;
  if (!stored.startsWith('sha256:')) {
    return plain === stored;
  }
  const hashed = await hashPassword(plain);
  return hashed === stored;
}

export function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, ch => map[ch]);
}

export function isSafeImageUrl(url?: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function csvEscape(value: unknown): string {
  return `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;
}
