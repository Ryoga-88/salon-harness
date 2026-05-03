import { Hono } from 'hono';
import type { Env } from '../index.js';
import { ok } from '../lib/http.js';
import { requireRole } from '../middleware/auth.js';

const analytics = new Hono<Env>();

analytics.get('/api/analytics/dashboard', async (c) => {
  const denied = requireRole(c, ['owner', 'editor', 'stylist']);
  if (denied) return denied;
  const staff = c.get('staff')!;
  const stylistFilter = staff.role === 'stylist' && staff.linked_stylist_id;
  const bindId = stylistFilter ? staff.linked_stylist_id! : staff.salon_id;
  const scopeWhere = stylistFilter
    ? 'r.stylist_id = ?'
    : 'r.stylist_id IN (SELECT id FROM stylists WHERE salon_id = ?)';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());

  const [todayReservations, weeklySales, identityLinks, couponUsage, recentReservations, recentJobs] = await Promise.all([
    c.env.DB
      .prepare(`SELECT COUNT(*) AS n FROM reservations r WHERE ${scopeWhere} AND date(r.start_at) = ? AND r.status = 'confirmed'`)
      .bind(bindId, today)
      .first<{ n: number }>(),
    c.env.DB
      .prepare(
        `SELECT COALESCE(SUM(r.total_price), 0) AS n FROM reservations r
         WHERE ${scopeWhere} AND r.status IN ('confirmed','completed')
           AND date(r.start_at) >= date('now', '-6 days')`
      )
      .bind(bindId)
      .first<{ n: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM identity_links').first<{ n: number }>(),
    c.env.DB
      .prepare(
        `SELECT COALESCE(SUM(c.used_count), 0) AS used, COUNT(*) AS issued
         FROM coupons c
         WHERE c.stylist_id IN (SELECT id FROM stylists WHERE salon_id = ?)`
      )
      .bind(staff.salon_id)
      .first<{ used: number; issued: number }>(),
    c.env.DB
      .prepare(
        `SELECT r.id, r.friend_id, r.start_at, r.status, r.total_price, st.name AS stylist_name
         FROM reservations r
         JOIN stylists st ON st.id = r.stylist_id
         WHERE ${scopeWhere}
         ORDER BY r.created_at DESC
         LIMIT 8`
      )
      .bind(bindId)
      .all(),
    c.env.DB
      .prepare('SELECT id, job_type, target_friend_id, scheduled_at, status FROM automation_jobs ORDER BY created_at DESC LIMIT 8')
      .all()
  ]);

  return ok(c, {
    today_reservations: todayReservations?.n ?? 0,
    weekly_sales: weeklySales?.n ?? 0,
    identity_links: identityLinks?.n ?? 0,
    coupon_used_count: couponUsage?.used ?? 0,
    coupon_total_used_count: couponUsage?.issued ?? 0,
    recent_reservations: recentReservations.results,
    recent_jobs: recentJobs.results
  });
});

/** IG→LINE統合〜予約のざっくりファネル（Salon Harness D1 + identity_links を集計） */
analytics.get('/api/analytics/funnel', async (c) => {
  const denied = requireRole(c, ['owner', 'editor', 'stylist']);
  if (denied) return denied;
  const staff = c.get('staff')!;
  const stylistFilter = staff.role === 'stylist' && staff.linked_stylist_id;
  if (staff.role === 'stylist' && !staff.linked_stylist_id) {
    return ok(c, {
      scope: 'stylist',
      global_identity: {
        distinct_with_ig: 0,
        distinct_with_line: 0,
        bridged_ig_and_line: 0
      },
      cohort: {
        friend_count: 0,
        ig_touches: 0,
        line_touches: 0,
        bridged_ig_and_line: 0,
        reservations_completed: 0,
        reservations_customers_booked: 0
      },
      note: 'スタイリストにスタッフ紐付け（linked_stylist_id）がないため、このアカウントではコホート集計がありません。'
    });
  }

  async function salonFriendIds(): Promise<string[]> {
    const r = await c.env.DB
      .prepare(
        `SELECT DISTINCT r.friend_id AS fid FROM reservations r
         JOIN stylists st ON st.id = r.stylist_id
         WHERE st.salon_id = ?`
      )
      .bind(staff.salon_id)
      .all<{ fid: string }>();
    return r.results.map((x) => x.fid);
  }

  async function stylistFriendIds(): Promise<string[]> {
    const r = await c.env.DB
      .prepare('SELECT DISTINCT friend_id AS fid FROM reservations WHERE stylist_id = ?')
      .bind(staff.linked_stylist_id!)
      .all<{ fid: string }>();
    return r.results.map((x) => x.fid);
  }

  const cohort = stylistFilter ? new Set(await stylistFriendIds()) : new Set(await salonFriendIds());

  const igDistinct = await c.env.DB.prepare("SELECT COUNT(DISTINCT uuid) AS n FROM identity_links WHERE source = 'ig'").first<{ n: number }>();
  const lineDistinct = await c.env.DB.prepare("SELECT COUNT(DISTINCT uuid) AS n FROM identity_links WHERE source = 'line'").first<{ n: number }>();

  const bridged = await c.env.DB
    .prepare(
      `SELECT COUNT(*) AS n FROM (
         SELECT uuid FROM identity_links WHERE source IN ('ig','line')
         GROUP BY uuid
         HAVING COUNT(DISTINCT source) >= 2
       )`
    )
    .first<{ n: number }>();

  const bookedDistinct = await c.env.DB
    .prepare(
      stylistFilter
        ? "SELECT COUNT(DISTINCT friend_id) AS n FROM reservations WHERE stylist_id = ? AND status IN ('confirmed','completed','cancelled','no_show')"
        : `SELECT COUNT(DISTINCT r.friend_id) AS n FROM reservations r
           JOIN stylists st ON st.id = r.stylist_id
           WHERE st.salon_id = ? AND r.status IN ('confirmed','completed','cancelled','no_show')`
    )
    .bind(stylistFilter ? staff.linked_stylist_id! : staff.salon_id)
    .first<{ n: number }>();

  /** コホート絞り: 予約または identity がサロン/担当と交差する単純版は重いので、当面は「統合済みユーザーがコホート内で予約した人数」 */

  async function cohortCount(sql: string, bindArgs: unknown[]): Promise<number> {
    const r = await c.env.DB.prepare(sql).bind(...bindArgs).first<{ n: number }>();
    return r?.n ?? 0;
  }

  const ph = cohort.size > 0 ? [...cohort].map(() => '?').join(', ') : '';

  let ig_in_cohort = 0;
  let line_in_cohort = 0;
  let bridged_in_cohort = 0;
  if (cohort.size > 0 && ph) {
    const ids = [...cohort];
    ig_in_cohort = await cohortCount(
      `SELECT COUNT(DISTINCT uuid) AS n FROM identity_links WHERE source = 'ig' AND uuid IN (${ph})`,
      ids
    );
    line_in_cohort = await cohortCount(
      `SELECT COUNT(DISTINCT uuid) AS n FROM identity_links WHERE source = 'line' AND uuid IN (${ph})`,
      ids
    );
    bridged_in_cohort = await cohortCount(
      `SELECT COUNT(*) AS n FROM (
        SELECT uuid FROM identity_links WHERE source IN ('ig','line') AND uuid IN (${ph})
        GROUP BY uuid
        HAVING COUNT(DISTINCT source) >= 2
      )`,
      ids
    );
  }

  /** 実際に来店済みなどを示す軽い指標 */
  const visits = await c.env.DB
    .prepare(
      stylistFilter
        ? "SELECT COUNT(*) AS n FROM reservations WHERE stylist_id = ? AND status = 'completed'"
        : `SELECT COUNT(*) AS n FROM reservations r JOIN stylists st ON st.id = r.stylist_id
           WHERE st.salon_id = ? AND r.status = 'completed'`
    )
    .bind(stylistFilter ? staff.linked_stylist_id! : staff.salon_id)
    .first<{ n: number }>();

  return ok(c, {
    scope: stylistFilter ? 'stylist' : 'salon',
    global_identity: {
      distinct_with_ig: igDistinct?.n ?? 0,
      distinct_with_line: lineDistinct?.n ?? 0,
      bridged_ig_and_line: bridged?.n ?? 0
    },
    cohort: {
      friend_count: cohort.size,
      ig_touches: ig_in_cohort,
      line_touches: line_in_cohort,
      bridged_ig_and_line: bridged_in_cohort,
      reservations_completed: visits?.n ?? 0,
      reservations_customers_booked: bookedDistinct?.n ?? 0
    },
    note: 'Instagram 側の webhook が identity_links に流れ込むほど IG カウントが増えます。未連携でも予約経由の顧客は一覧に載ります。'
  });
});

export { analytics };
