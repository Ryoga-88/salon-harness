import { Hono } from 'hono';
import type { Env } from '../index.js';
import { fail, ok } from '../lib/http.js';
import { extractLineFriendId, fetchLineFriends } from '../lib/line-harness.js';
import { requireRole } from '../middleware/auth.js';

const customers = new Hono<Env>();

function displayNameFromLineRow(row: Record<string, unknown> | undefined): string | null {
  if (!row) return null;
  for (const k of ['display_name', 'displayName', 'lineDisplayName', 'name']) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

customers.get('/api/customers', async (c) => {
  const denied = requireRole(c, ['owner', 'editor', 'stylist']);
  if (denied) return denied;
  const staff = c.get('staff')!;

  const statsMap = new Map<string, { reservation_count: number; last_reservation_at: string | null }>();
  if (staff.role === 'stylist' && staff.linked_stylist_id) {
    const r = await c.env.DB.prepare(
      'SELECT friend_id, COUNT(*) AS cnt, MAX(created_at) AS last_at FROM reservations WHERE stylist_id = ? GROUP BY friend_id'
    )
      .bind(staff.linked_stylist_id)
      .all<{ friend_id: string; cnt: number; last_at: string }>();
    for (const row of r.results) {
      statsMap.set(row.friend_id, { reservation_count: row.cnt, last_reservation_at: row.last_at });
    }
  } else {
    const r = await c.env.DB.prepare(
      `SELECT r.friend_id, COUNT(*) AS cnt, MAX(r.created_at) AS last_at
       FROM reservations r
       JOIN stylists st ON st.id = r.stylist_id
       WHERE st.salon_id = ?
       GROUP BY r.friend_id`
    )
      .bind(staff.salon_id)
      .all<{ friend_id: string; cnt: number; last_at: string }>();
    for (const row of r.results) {
      statsMap.set(row.friend_id, { reservation_count: row.cnt, last_reservation_at: row.last_at });
    }
  }

  const lineHarnessConfigured = !!(c.env.LINE_HARNESS_API_URL && c.env.LINE_HARNESS_API_KEY);
  let friendsFromLine: Record<string, unknown>[] = [];
  try {
    if (lineHarnessConfigured) friendsFromLine = await fetchLineFriends(c.env);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'line-harness fetch failed', 502);
  }

  const lineById = new Map<string, Record<string, unknown>>();
  for (const f of friendsFromLine) {
    const id = extractLineFriendId(f);
    if (id) lineById.set(id, f);
  }

  const idSet = new Set<string>();
  if (staff.role === 'stylist' && staff.linked_stylist_id) {
    for (const fid of statsMap.keys()) idSet.add(fid);
  } else {
    for (const fid of statsMap.keys()) idSet.add(fid);
    if (lineHarnessConfigured) {
      for (const f of friendsFromLine) {
        const id = extractLineFriendId(f);
        if (id) idSet.add(id);
      }
    }
  }

  const ids = [...idSet];
  const sourcesByUuid = new Map<string, string[]>();
  if (ids.length > 0) {
    const chunk = 80;
    for (let i = 0; i < ids.length; i += chunk) {
      const part = ids.slice(i, i + chunk);
      const ph = part.map(() => '?').join(', ');
      const links = await c.env.DB
        .prepare(`SELECT uuid, source FROM identity_links WHERE uuid IN (${ph})`)
        .bind(...part)
        .all<{ uuid: string; source: string }>();
      for (const row of links.results) {
        if (!sourcesByUuid.has(row.uuid)) sourcesByUuid.set(row.uuid, []);
        sourcesByUuid.get(row.uuid)!.push(row.source);
      }
    }
  }

  type RowOut = {
    friend_id: string;
    display_name: string | null;
    sources: string[];
    has_ig: boolean;
    has_line_identity: boolean;
    reservation_count: number;
    last_reservation_at: string | null;
  };

  const items: RowOut[] = ids.map((friend_id) => {
    const stats = statsMap.get(friend_id) ?? { reservation_count: 0, last_reservation_at: null };
    const sources = [...new Set(sourcesByUuid.get(friend_id) ?? [])];
    const lineRow = lineById.get(friend_id);
    return {
      friend_id,
      display_name: displayNameFromLineRow(lineRow),
      sources,
      has_ig: sources.includes('ig'),
      has_line_identity: sources.includes('line'),
      reservation_count: stats.reservation_count,
      last_reservation_at: stats.last_reservation_at
    };
  });

  items.sort((a, b) => {
    const tb = b.last_reservation_at ?? '';
    const ta = a.last_reservation_at ?? '';
    if (tb !== ta) return tb.localeCompare(ta);
    return b.reservation_count - a.reservation_count;
  });

  return ok(c, { line_harness_configured: lineHarnessConfigured, items });
});

customers.get('/api/customers/:friendId', async (c) => {
  const denied = requireRole(c, ['owner', 'editor', 'stylist']);
  if (denied) return denied;
  const staff = c.get('staff')!;
  const friendId = c.req.param('friendId');
  if (!friendId) return fail(c, 'friendId required');

  async function stylistHasAccess(): Promise<boolean> {
    if (staff.role !== 'stylist' || !staff.linked_stylist_id) return true;
    const row = await c.env.DB
      .prepare('SELECT 1 AS ok FROM reservations WHERE friend_id = ? AND stylist_id = ? LIMIT 1')
      .bind(friendId, staff.linked_stylist_id)
      .first<{ ok: number }>();
    return !!row;
  }

  async function salonHasStake(): Promise<boolean> {
    const res = await c.env.DB
      .prepare(
        `SELECT 1 AS ok FROM reservations r JOIN stylists st ON st.id = r.stylist_id
         WHERE r.friend_id = ? AND st.salon_id = ?
         LIMIT 1`
      )
      .bind(friendId, staff.salon_id)
      .first<{ ok: number }>();
    if (res) return true;
    const link = await c.env.DB.prepare('SELECT 1 AS ok FROM identity_links WHERE uuid = ? LIMIT 1').bind(friendId).first<{ ok: number }>();
    return !!link;
  }

  let allowed = false;
  if (staff.role === 'stylist') {
    allowed = !!(staff.linked_stylist_id && (await stylistHasAccess()));
  } else {
    allowed = await salonHasStake();
  }
  if (!allowed) return fail(c, '対象が見つかりません', 404);

  const identityLinks = await c.env.DB
    .prepare('SELECT id, uuid, source, external_id, metadata, created_at FROM identity_links WHERE uuid = ? ORDER BY created_at ASC')
    .bind(friendId)
    .all<{ id: string; uuid: string; source: string; external_id: string; metadata: string | null; created_at: string }>();

  let reservationsQuery =
    staff.role === 'stylist' && staff.linked_stylist_id
      ? c.env.DB
          .prepare(
            `SELECT r.*,
                    st.name AS stylist_name,
                    st.display_name AS stylist_display_name
             FROM reservations r
             JOIN stylists st ON st.id = r.stylist_id
             WHERE r.friend_id = ? AND r.stylist_id = ?
             ORDER BY r.start_at DESC LIMIT 120`
          )
          .bind(friendId, staff.linked_stylist_id)
      : c.env.DB
          .prepare(
            `SELECT r.*,
                    st.name AS stylist_name,
                    st.display_name AS stylist_display_name
             FROM reservations r
             JOIN stylists st ON st.id = r.stylist_id
             WHERE r.friend_id = ? AND st.salon_id = ?
             ORDER BY r.start_at DESC LIMIT 120`
          )
          .bind(friendId, staff.salon_id);

  const reservations = await reservationsQuery.all<
    Record<string, unknown> & { stylist_name: string; stylist_display_name: string | null }
  >();

  const kartes =
    staff.role === 'stylist' && staff.linked_stylist_id
      ? await c.env.DB.prepare('SELECT * FROM kartes WHERE friend_id = ? AND stylist_id = ? ORDER BY created_at DESC LIMIT 80').bind(friendId, staff.linked_stylist_id).all()
      : await c.env.DB.prepare('SELECT k.* FROM kartes k JOIN stylists st ON st.id = k.stylist_id WHERE k.friend_id = ? AND st.salon_id = ? ORDER BY k.created_at DESC LIMIT 80').bind(friendId, staff.salon_id).all();

  const couponUsages = await c.env.DB
    .prepare(
      `SELECT cu.*, c.code AS coupon_code, c.name AS coupon_name
       FROM coupon_usages cu
       JOIN coupons c ON c.id = cu.coupon_id
       WHERE cu.friend_id = ?
       ORDER BY cu.used_at DESC LIMIT 40`
    )
    .bind(friendId)
    .all();
  const jobs = await c.env.DB.prepare('SELECT * FROM automation_jobs WHERE target_friend_id = ? ORDER BY scheduled_at DESC LIMIT 40').bind(friendId).all();

  type TimelineEvent = {
    kind: string;
    at: string;
    title: string;
    subtitle?: string;
    meta?: Record<string, unknown>;
  };
  const timeline: TimelineEvent[] = [];

  for (const link of identityLinks.results) {
    timeline.push({
      kind: `identity.${link.source}`,
      at: link.created_at,
      title: `${link.source === 'ig' ? 'Instagram' : link.source === 'line' ? 'LINE' : link.source} と統合`,
      subtitle: link.external_id,
      meta: { metadata: link.metadata ? JSON.parse(link.metadata) : {} }
    });
  }

  for (const row of reservations.results) {
    const r = row as { id: string; start_at: string; status: string; total_price: number; stylist_display_name: string | null; stylist_name: string };
    timeline.push({
      kind: `reservation.${r.status}`,
      at: typeof row.created_at === 'string' ? row.created_at : r.start_at,
      title: `予約 (${r.status})`,
      subtitle: `${r.start_at} · ${r.stylist_display_name ?? r.stylist_name}`,
      meta: { id: r.id, total_price: r.total_price }
    });
  }

  for (const row of kartes.results) {
    const k = row as { id: string; created_at: string; stylist_id: string };
    timeline.push({
      kind: 'karte',
      at: k.created_at,
      title: 'カルテ作成',
      meta: { id: k.id, stylist_id: k.stylist_id }
    });
  }

  for (const row of couponUsages.results) {
    const cu = row as { used_at: string; coupon_code: string; coupon_name: string; discount_applied: number };
    timeline.push({
      kind: 'coupon_used',
      at: cu.used_at,
      title: `クーポン利用 (${cu.coupon_code})`,
      subtitle: cu.coupon_name,
      meta: { discount_applied: cu.discount_applied }
    });
  }

  for (const row of jobs.results) {
    const j = row as { scheduled_at: string; job_type: string; status: string };
    timeline.push({
      kind: `automation.${j.status}`,
      at: j.scheduled_at,
      title: `自動化: ${j.job_type}`,
      subtitle: j.status
    });
  }

  timeline.sort((a, b) => b.at.localeCompare(a.at));

  let line_friend: Record<string, unknown> | null = null;
  if (c.env.LINE_HARNESS_API_URL && c.env.LINE_HARNESS_API_KEY) {
    try {
      const all = await fetchLineFriends(c.env);
      line_friend = all.find((r) => extractLineFriendId(r) === friendId) ?? null;
    } catch {
      line_friend = null;
    }
  }

  return ok(c, {
    friend_id: friendId,
    display_name: displayNameFromLineRow(line_friend ?? undefined),
    identity_links: identityLinks.results,
    reservations: reservations.results,
    kartes: kartes.results,
    coupon_usages: couponUsages.results,
    automation_jobs: jobs.results,
    timeline
  });
});

export { customers };
