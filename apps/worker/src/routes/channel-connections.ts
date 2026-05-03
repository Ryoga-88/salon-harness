import { Context, Hono } from 'hono';
import type { ChannelConnection, ChannelProvider } from '@salon-harness/shared';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { jstNow } from '../lib/time.js';
import { requireRole } from '../middleware/auth.js';

const channelConnections = new Hono<Env>();

type ConnectionInput = {
  salon_id?: string;
  stylist_id?: string | null;
  provider?: ChannelProvider;
  account_name?: string;
  provider_account_id?: string | null;
  harness_api_url?: string | null;
  harness_api_key?: string | null;
  is_default?: boolean | number;
  is_active?: boolean | number;
  metadata?: string | null;
};

type PublicConnection = Omit<ChannelConnection, 'harness_api_key'> & {
  harness_api_key: null;
  harness_api_key_masked: string | null;
  stylist_name?: string | null;
  salon_name?: string | null;
};

function normalizeUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, '') : null;
}

function maskKey(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function toPublic(row: ChannelConnection & { stylist_name?: string | null; salon_name?: string | null }): PublicConnection {
  return {
    ...row,
    harness_api_key: null,
    harness_api_key_masked: maskKey(row.harness_api_key),
    stylist_name: row.stylist_name ?? null,
    salon_name: row.salon_name ?? null
  };
}

async function stylistBelongsToSalon(db: D1Database, stylistId: string, salonId: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT id FROM stylists WHERE id = ? AND salon_id = ? AND is_active = 1')
    .bind(stylistId, salonId)
    .first<{ id: string }>();
  return Boolean(row);
}

function canManageStylistConnection(c: Context<Env>, stylistId: string | null): boolean {
  const staff = c.get('staff');
  if (!staff) return false;
  if (staff.role === 'owner' || staff.role === 'editor') return true;
  return Boolean(stylistId && staff.linked_stylist_id === stylistId);
}

async function demoteOtherDefaults(db: D1Database, salonId: string, provider: ChannelProvider, stylistId: string | null, exceptId?: string): Promise<void> {
  if (stylistId) {
    await db
      .prepare(
        `UPDATE channel_connections
         SET is_default = 0, updated_at = ?
         WHERE salon_id = ? AND provider = ? AND stylist_id = ? AND id != ?`
      )
      .bind(jstNow(), salonId, provider, stylistId, exceptId ?? '')
      .run();
    return;
  }
  await db
    .prepare(
      `UPDATE channel_connections
       SET is_default = 0, updated_at = ?
       WHERE salon_id = ? AND provider = ? AND stylist_id IS NULL AND id != ?`
    )
    .bind(jstNow(), salonId, provider, exceptId ?? '')
    .run();
}

channelConnections.get('/api/channel-connections', async (c) => {
  const staff = c.get('staff');
  const salonId = c.req.query('salon_id') ?? staff?.salon_id ?? 'default';
  const provider = c.req.query('provider') as ChannelProvider | undefined;
  const stylistId = c.req.query('stylist_id') ?? null;

  const conditions = ['cc.salon_id = ?'];
  const binds: unknown[] = [salonId];
  if (provider) {
    if (provider !== 'line' && provider !== 'instagram') return fail(c, 'provider must be line or instagram');
    conditions.push('cc.provider = ?');
    binds.push(provider);
  }
  if (stylistId) {
    conditions.push('(cc.stylist_id IS NULL OR cc.stylist_id = ?)');
    binds.push(stylistId);
  }
  if (staff?.role === 'stylist') {
    conditions.push('(cc.stylist_id IS NULL OR cc.stylist_id = ?)');
    binds.push(staff.linked_stylist_id ?? '');
  }

  const rows = await c.env.DB
    .prepare(
      `SELECT cc.*, s.name AS salon_name, st.name AS stylist_name
       FROM channel_connections cc
       JOIN salons s ON s.id = cc.salon_id
       LEFT JOIN stylists st ON st.id = cc.stylist_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY cc.provider ASC, cc.scope ASC, cc.is_default DESC, cc.created_at ASC`
    )
    .bind(...binds)
    .all<ChannelConnection & { salon_name: string; stylist_name: string | null }>();
  return ok(c, rows.results.map(toPublic));
});

channelConnections.get('/api/channel-connections/resolve', async (c) => {
  const salonId = c.req.query('salon_id') ?? c.get('staff')?.salon_id ?? 'default';
  const provider = c.req.query('provider') as ChannelProvider | undefined;
  const stylistId = c.req.query('stylist_id') ?? null;
  if (provider !== 'line' && provider !== 'instagram') return fail(c, 'provider must be line or instagram');

  const row = stylistId
    ? await c.env.DB
        .prepare(
          `SELECT cc.*, s.name AS salon_name, st.name AS stylist_name
           FROM channel_connections cc
           JOIN salons s ON s.id = cc.salon_id
           LEFT JOIN stylists st ON st.id = cc.stylist_id
           WHERE cc.salon_id = ? AND cc.provider = ? AND cc.is_active = 1
             AND (cc.stylist_id = ? OR cc.stylist_id IS NULL)
           ORDER BY CASE WHEN cc.stylist_id = ? THEN 0 ELSE 1 END, cc.is_default DESC, cc.created_at ASC
           LIMIT 1`
        )
        .bind(salonId, provider, stylistId, stylistId)
        .first<ChannelConnection & { salon_name: string; stylist_name: string | null }>()
    : await c.env.DB
        .prepare(
          `SELECT cc.*, s.name AS salon_name, st.name AS stylist_name
           FROM channel_connections cc
           JOIN salons s ON s.id = cc.salon_id
           LEFT JOIN stylists st ON st.id = cc.stylist_id
           WHERE cc.salon_id = ? AND cc.provider = ? AND cc.is_active = 1 AND cc.stylist_id IS NULL
           ORDER BY cc.is_default DESC, cc.created_at ASC
           LIMIT 1`
        )
        .bind(salonId, provider)
        .first<ChannelConnection & { salon_name: string; stylist_name: string | null }>();

  return row ? ok(c, toPublic(row)) : fail(c, 'Connection not found', 404);
});

channelConnections.post('/api/channel-connections', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor', 'stylist']);
  if (forbidden) return forbidden;
  const body = await readJson<ConnectionInput>(c);
  const salonId = body.salon_id ?? c.get('staff')?.salon_id ?? 'default';
  const stylistId = body.stylist_id || null;
  const provider = body.provider;
  if (provider !== 'line' && provider !== 'instagram') return fail(c, 'provider must be line or instagram');
  if (!body.account_name?.trim()) return fail(c, 'account_name is required');
  if (stylistId && !(await stylistBelongsToSalon(c.env.DB, stylistId, salonId))) return fail(c, 'Stylist does not belong to salon', 400);
  if (!canManageStylistConnection(c, stylistId)) return fail(c, 'Forbidden', 403);

  const id = crypto.randomUUID();
  const now = jstNow();
  const scope = stylistId ? 'stylist' : 'salon';
  const isDefault = body.is_default === true || body.is_default === 1;
  if (isDefault) await demoteOtherDefaults(c.env.DB, salonId, provider, stylistId, id);

  await c.env.DB
    .prepare(
      `INSERT INTO channel_connections
       (id, salon_id, stylist_id, provider, scope, account_name, provider_account_id, harness_api_url, harness_api_key, is_default, is_active, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      salonId,
      stylistId,
      provider,
      scope,
      body.account_name.trim(),
      body.provider_account_id?.trim() || null,
      normalizeUrl(body.harness_api_url),
      body.harness_api_key?.trim() || null,
      isDefault ? 1 : 0,
      body.is_active === false || body.is_active === 0 ? 0 : 1,
      body.metadata ?? null,
      now,
      now
    )
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM channel_connections WHERE id = ?').bind(id).first<ChannelConnection>();
  return ok(c, row ? toPublic(row) : { id }, 201);
});

channelConnections.put('/api/channel-connections/:id', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor', 'stylist']);
  if (forbidden) return forbidden;
  const existing = await c.env.DB
    .prepare('SELECT * FROM channel_connections WHERE id = ?')
    .bind(c.req.param('id'))
    .first<ChannelConnection>();
  if (!existing) return fail(c, 'Connection not found', 404);
  if (!canManageStylistConnection(c, existing.stylist_id)) return fail(c, 'Forbidden', 403);
  const body = await readJson<ConnectionInput>(c);
  if (body.provider && body.provider !== existing.provider) return fail(c, 'provider cannot be changed');
  if (body.salon_id && body.salon_id !== existing.salon_id) return fail(c, 'salon_id cannot be changed');
  if (body.stylist_id !== undefined && (body.stylist_id || null) !== existing.stylist_id) return fail(c, 'stylist_id cannot be changed');

  const isDefault = body.is_default === true || body.is_default === 1;
  if (isDefault) await demoteOtherDefaults(c.env.DB, existing.salon_id, existing.provider, existing.stylist_id, existing.id);

  await c.env.DB
    .prepare(
      `UPDATE channel_connections
       SET account_name = COALESCE(?, account_name),
           provider_account_id = ?,
           harness_api_url = ?,
           harness_api_key = COALESCE(?, harness_api_key),
           is_default = COALESCE(?, is_default),
           is_active = COALESCE(?, is_active),
           metadata = COALESCE(?, metadata),
           updated_at = ?
       WHERE id = ?`
    )
    .bind(
      body.account_name?.trim() || null,
      body.provider_account_id !== undefined ? body.provider_account_id?.trim() || null : existing.provider_account_id,
      body.harness_api_url !== undefined ? normalizeUrl(body.harness_api_url) : existing.harness_api_url,
      body.harness_api_key?.trim() || null,
      body.is_default === undefined ? null : isDefault ? 1 : 0,
      body.is_active === undefined ? null : body.is_active === false || body.is_active === 0 ? 0 : 1,
      body.metadata ?? null,
      jstNow(),
      existing.id
    )
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM channel_connections WHERE id = ?').bind(existing.id).first<ChannelConnection>();
  return row ? ok(c, toPublic(row)) : fail(c, 'Connection not found', 404);
});

channelConnections.delete('/api/channel-connections/:id', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor', 'stylist']);
  if (forbidden) return forbidden;
  const existing = await c.env.DB
    .prepare('SELECT * FROM channel_connections WHERE id = ?')
    .bind(c.req.param('id'))
    .first<ChannelConnection>();
  if (!existing) return fail(c, 'Connection not found', 404);
  if (!canManageStylistConnection(c, existing.stylist_id)) return fail(c, 'Forbidden', 403);
  await c.env.DB
    .prepare('UPDATE channel_connections SET is_active = 0, updated_at = ? WHERE id = ?')
    .bind(jstNow(), existing.id)
    .run();
  return ok(c, { deleted: true });
});

export { channelConnections };
