/** 公開トップのサロンカードから遷移する LINE 予約（LIFF）のベース URL */

const FALLBACK_LIFF = 'https://salon-harness-liff.vercel.app';

/**
 * Web デプロイ（VERCEL_URL）と同一ホストへ LIFF URL が向いている＝環境変数の取り違え。
 * Route Handler はサーバー限定で呼ぶ（VERCEL_URL はクライアントに載らない）。
 */
function looksLikeSelfReferencedLiff(u: URL): boolean {
  const vercelRaw = process.env.VERCEL_URL?.trim();
  if (!vercelRaw) return false;
  const vercelHost = vercelRaw.replace(/^https?:\/\//i, '').split('/')[0]?.toLowerCase();
  if (!vercelHost) return false;
  return u.hostname.toLowerCase() === vercelHost;
}

export function resolveLiffOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_LIFF_URL?.trim();
  let candidate = (raw?.replace(/\/$/, '') || FALLBACK_LIFF).replace(/\/$/, '');
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;

  try {
    const u = new URL(candidate);
    if (looksLikeSelfReferencedLiff(u)) return FALLBACK_LIFF.replace(/\/$/, '');
    return u.origin.replace(/\/$/, '');
  } catch {
    return FALLBACK_LIFF.replace(/\/$/, '');
  }
}

export function salonBookingHref(salonId: string): string {
  return `${resolveLiffOrigin()}/s/${encodeURIComponent(salonId)}`;
}
