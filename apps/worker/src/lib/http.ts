import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function ok<T>(c: Context, data: T, status = 200): Response {
  return c.json({ success: true, data }, status as ContentfulStatusCode);
}

export function fail(c: Context, error: string, status = 400, reason?: string): Response {
  return c.json({ success: false, error, reason }, status as ContentfulStatusCode);
}

export async function readJson<T>(c: Context): Promise<T> {
  try {
    return await c.req.json<T>();
  } catch {
    throw new Error('invalid JSON body');
  }
}
