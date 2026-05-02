'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, MoreHorizontal, Plus, RefreshCw, Search, Users, X } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError, getApiKey } from '@/lib/api';
import { avatarClassFromSeed, displayInitial } from '@/lib/avatar-class';
import { daysSinceJst, jstTodayYmd } from '@/lib/date-jst';

const LS_HIDE_LINE_ALERT = 'salon_hide_line_harness_cust_alert';

type CustomerRow = {
  friend_id: string;
  display_name: string | null;
  sources: string[];
  has_ig: boolean;
  has_line_identity: boolean;
  reservation_count: number;
  last_reservation_at: string | null;
};

type CustomersResponse = { line_harness_configured: boolean; items: CustomerRow[] };

type SortKey = 'name' | 'bookings' | 'last';
type SortDir = 'asc' | 'desc';
type FilterChip = 'all' | 'both' | 'ig' | 'line' | 'vip' | 'dorm';

function channelBucket(row: CustomerRow): 'both' | 'ig' | 'line' | 'none' {
  if (row.has_ig && row.has_line_identity) return 'both';
  if (row.has_ig) return 'ig';
  if (row.has_line_identity) return 'line';
  return 'none';
}

function isDormant(row: CustomerRow): boolean {
  if (!row.last_reservation_at) return true;
  const d = daysSinceJst(row.last_reservation_at.slice(0, 10));
  return d === null || d >= 90;
}

function SortIcons() {
  return (
    <span className="sort">
      <svg className="up" width="8" height="5" viewBox="0 0 8 5" fill="currentColor" aria-hidden>
        <path d="M4 0l4 5H0z" />
      </svg>
      <svg className="dn" width="8" height="5" viewBox="0 0 8 5" fill="currentColor" aria-hidden>
        <path d="M4 5L0 0h8z" />
      </svg>
    </span>
  );
}

export default function CustomersPage() {
  const [payload, setPayload] = useState<CustomersResponse | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterChip>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hideLineAlert, setHideLineAlert] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setHideLineAlert(localStorage.getItem(LS_HIDE_LINE_ALERT) === '1');
    } catch {
      setHideLineAlert(false);
    }
  }, []);

  const load = useCallback(async () => {
    setError('');
    if (!getApiKey()) {
      setPayload(null);
      setError('ログイン情報がありません。/login で API Key を入力してください。');
      return;
    }
    try {
      setPayload(await fetchApi<CustomersResponse>('/api/customers'));
    } catch (err) {
      setPayload(null);
      setError(friendlyApiError(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rawItems = payload?.items ?? [];

  const stats = useMemo(() => {
    const total = rawItems.length;
    const bridged = rawItems.filter((r) => channelBucket(r) === 'both').length;
    const igOnly = rawItems.filter((r) => channelBucket(r) === 'ig').length;
    const lineOnly = rawItems.filter((r) => channelBucket(r) === 'line').length;
    const dormant = rawItems.filter((r) => isDormant(r)).length;
    const vip = 0;
    return { total, bridged, igOnly, lineOnly, dormant, vip };
  }, [rawItems]);

  const filtered = useMemo(() => {
    let rows = rawItems.slice();
    if (filter !== 'all') {
      if (filter === 'both') rows = rows.filter((r) => channelBucket(r) === 'both');
      else if (filter === 'ig') rows = rows.filter((r) => channelBucket(r) === 'ig');
      else if (filter === 'line') rows = rows.filter((r) => channelBucket(r) === 'line');
      else if (filter === 'vip') rows = []; /* API 未有り */
      else if (filter === 'dorm') rows = rows.filter((r) => isDormant(r));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const name = (r.display_name ?? '').toLowerCase();
        return name.includes(q) || r.friend_id.toLowerCase().includes(q);
      });
    }
    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') {
        const na = a.display_name || a.friend_id;
        const nb = b.display_name || b.friend_id;
        return na.localeCompare(nb, 'ja') * dir;
      }
      if (sortKey === 'bookings') return (a.reservation_count - b.reservation_count) * dir;
      const la = a.last_reservation_at || '';
      const lb = b.last_reservation_at || '';
      return (la < lb ? -1 : la > lb ? 1 : 0) * dir;
    });
    return rows;
  }, [rawItems, filter, query, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [filter, query, sortKey, sortDir, pageSize]);

  const maxBookings = useMemo(() => Math.max(1, ...filtered.map((r) => r.reservation_count)), [filtered]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, pages);
  const start = (pageClamped - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const chipCounts = useMemo(
    () => ({
      all: rawItems.length,
      both: rawItems.filter((r) => channelBucket(r) === 'both').length,
      ig: rawItems.filter((r) => channelBucket(r) === 'ig').length,
      line: rawItems.filter((r) => channelBucket(r) === 'line').length,
      vip: 0,
      dorm: rawItems.filter((r) => isDormant(r)).length
    }),
    [rawItems]
  );

  function toggleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir(key === 'last' || key === 'bookings' ? 'desc' : 'asc');
    } else setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  }

  function thClass(key: SortKey) {
    if (sortKey !== key) return 'sortable';
    return `sortable ${sortDir === 'asc' ? 'asc' : 'desc'}`;
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const r of pageRows) {
        if (checked) n.add(r.friend_id);
        else n.delete(r.friend_id);
      }
      return n;
    });
  }

  const pageIds = pageRows.map((r) => r.friend_id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  async function copyFriendId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      /* ignore */
    }
  }

  function exportCsv(which: 'filtered' | 'selected') {
    const rows =
      which === 'selected'
        ? filtered.filter((r) => selected.has(r.friend_id))
        : filtered;
    const header = ['friend_id', 'display_name', 'sources', 'reservation_count', 'last_reservation_at'];
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [r.friend_id, `"${(r.display_name ?? '').replace(/"/g, '""')}"`, r.sources.join(';'), String(r.reservation_count), r.last_reservation_at ?? ''].join(
          ','
        )
      )
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${jstTodayYmd()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const showLineAlert = payload && !payload.line_harness_configured && !hideLineAlert;

  function dismissLineAlert(save: boolean) {
    setHideLineAlert(true);
    if (save) {
      try {
        localStorage.setItem(LS_HIDE_LINE_ALERT, '1');
      } catch {
        /* ignore */
      }
    }
  }

  function channelTags(row: CustomerRow) {
    const bucket = channelBucket(row);
    if (bucket === 'both')
      return (
        <span className="ch-row">
          <span className="ch ig">
            <span className="d" />IG
          </span>
          <span className="ch li">
            <span className="d" />
            LINE
          </span>
        </span>
      );
    if (bucket === 'ig')
      return (
        <span className="ch ig">
          <span className="d" />IG のみ
        </span>
      );
    if (bucket === 'line')
      return (
        <span className="ch li">
          <span className="d" />
          LINE のみ
        </span>
      );
    return (
      <span className="ch gh">
        <span className="d" />
        未連携
      </span>
    );
  }

  function formatLast(iso: string | null): { main: string; sub: string } {
    if (!iso) return { main: '未予約', sub: '—' };
    const d = daysSinceJst(iso.slice(0, 10));
    let main = iso.slice(0, 10);
    if (d === 0) main = '今日';
    else if (d === 1) main = '昨日';
    else if (d !== null && d < 7) main = `${d}日前`;
    else if (d !== null && d < 30) main = `${Math.floor(d / 7)}週間前`;
    else if (d !== null) main = `${Math.floor(d / 30)}ヶ月前`;
    return { main, sub: iso.slice(0, 10) };
  }

  return (
    <AppShell>
      <div className="page-customers">
        <div className="page-head">
          <div>
            <h1>
              顧客 <span className="count">{stats.total.toLocaleString('ja-JP')} 人</span>
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => void load()}>
              <RefreshCw size={14} />更新
            </button>
            <button type="button" className="btn" onClick={() => exportCsv('filtered')} disabled={filtered.length === 0}>
              <Download size={14} />
              CSV
            </button>
            <button type="button" className="btn btn-primary" disabled title="LINE / line-harness 側での友だち追加後に一覧へ反映されます">
              <Plus size={14} />
              顧客を追加
            </button>
          </div>
        </div>

        <p className="lede">
          チャネル横断の統合顧客一覧。Instagram と LINE は <code>identity_links</code> で同一 <code>friend_id</code>（UUID）に統合されます。
          <span className="pulse" aria-hidden /> Workers API と連携済みです。
        </p>

        {showLineAlert && (
          <div className="cust-alert" role="status">
            <div className="ico">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <b>LINE Harness が未設定、または友だち API に接続できていません</b>
              <div className="sub">
                Worker の <code className="mono">LINE_HARNESS_API_URL</code> / <code className="mono">LINE_HARNESS_API_KEY</code> を確認してください。
              </div>
            </div>
            <div className="acts">
              <button type="button" className="btn sm" onClick={() => dismissLineAlert(false)}>
                閉じる
              </button>
              <Link href="/settings" className="btn btn-primary sm">
                設定を開く
              </Link>
              <button type="button" className="x" aria-label="閉じる" onClick={() => dismissLineAlert(true)}>
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="panel" style={{ color: 'var(--rose)' }}>
            {error}
          </p>
        )}

        {!error && (
          <>
            <div className="stats">
              <div className="stat-card">
                <div className="k">
                  <span className="dt" style={{ background: 'var(--accent)' }} />統合済み（IG ↔ LINE）
                </div>
                <div className="v">
                  {stats.bridged.toLocaleString('ja-JP')} <small>/ {stats.total.toLocaleString('ja-JP')}</small>
                </div>
                <div className="d">両チャネル identity あり</div>
              </div>
              <div className="stat-card">
                <div className="k">
                  <span className="dt" style={{ background: 'var(--purple)' }} />
                  Instagram のみ
                </div>
                <div className="v">{stats.igOnly.toLocaleString('ja-JP')}</div>
                <div className="d">LINE 側 identity 未取得</div>
              </div>
              <div className="stat-card">
                <div className="k">
                  <span className="dt" style={{ background: 'var(--blue)' }} />
                  LINE のみ
                </div>
                <div className="v">{stats.lineOnly.toLocaleString('ja-JP')}</div>
                <div className="d">IG 側 identity 未取得</div>
              </div>
              <div className="stat-card">
                <div className="k">
                  <span className="dt" style={{ background: 'var(--amber)' }} />
                  休眠（90日〜）
                </div>
                <div className="v">{stats.dormant.toLocaleString('ja-JP')}</div>
                <div className="d">最終予約から 90 日以上</div>
              </div>
            </div>

            <div className="toolbar" style={{ marginBottom: 14 }}>
              <label className="search">
                <Search size={14} aria-hidden />
                <input placeholder="名前 / friend_id で絞り込み…" value={query} onChange={(e) => setQuery(e.target.value)} />
                {query ? (
                  <button type="button" className="clear" aria-label="クリア" onClick={() => setQuery('')}>
                    <X size={13} />
                  </button>
                ) : null}
              </label>

              <div className="filter-chips">
                {(
                  [
                    ['all', 'すべて'],
                    ['both', 'IG + LINE'],
                    ['ig', 'IG のみ'],
                    ['line', 'LINE のみ'],
                    ['vip', 'VIP'],
                    ['dorm', '休眠']
                  ] as const
                ).map(([key, lab]) => (
                  <button
                    key={key}
                    type="button"
                    className={`chip-f${filter === key ? ' active' : ''}`}
                    onClick={() => setFilter(key)}>
                    <span>{lab}</span>
                    <span className="sw">{chipCounts[key].toLocaleString('ja-JP')}</span>
                  </button>
                ))}
              </div>

              <div className="grow" />

              <button type="button" className="btn" disabled title="近日対応">
                詳細フィルタ
              </button>
            </div>

            <div className={`bulkbar${selected.size ? ' show' : ''}`}>
              <span className="n">{selected.size} 人を選択中</span>
              <span className="sep" />
              <button type="button" className="b" disabled title="複数送信は別途ワークフローで対応予定">
                LINE 一斉送信
              </button>
              <button type="button" className="b" disabled title="近日対応">
                クーポン配布
              </button>
              <button type="button" className="b" disabled={selected.size === 0} onClick={() => exportCsv('selected')}>
                <Download size={13} /> CSV
              </button>
              <button type="button" className="x" aria-label="選択解除" onClick={() => setSelected(new Set())}>
                <X size={14} />
              </button>
            </div>

            <div className="ds-panel">
              {filtered.length === 0 ? (
                <div className="state">
                  <div className="ill">
                    <Users size={34} strokeWidth={1.6} />
                  </div>
                  <b>該当する顧客はいません</b>
                  <p>検索またはフィルタを変更してください。</p>
                  <button type="button" className="btn" onClick={() => { setFilter('all'); setQuery(''); }}>
                    フィルタを解除
                  </button>
                </div>
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th className="cb">
                            <input
                              type="checkbox"
                              className="check"
                              checked={allPageSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = somePageSelected && !allPageSelected;
                              }}
                              onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                              aria-label="このページを全選択"
                            />
                          </th>
                          <th className={thClass('name')} onClick={() => toggleSort('name')}>
                            表示名
                            <SortIcons />
                          </th>
                          <th>統合 ID</th>
                          <th>チャネル</th>
                          <th className={thClass('bookings')} style={{ textAlign: 'right' }} onClick={() => toggleSort('bookings')}>
                            予約数
                            <SortIcons />
                          </th>
                          <th className={thClass('last')} onClick={() => toggleSort('last')}>
                            最終予約
                            <SortIcons />
                          </th>
                          <th style={{ textAlign: 'right' }}>相対規模</th>
                          <th style={{ width: 140, textAlign: 'right' }} aria-label="actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row) => {
                          const av = avatarClassFromSeed(row.friend_id);
                          const pct = Math.min(100, Math.round((row.reservation_count / maxBookings) * 100));
                          const initial = displayInitial(row.display_name, row.friend_id);
                          const sel = selected.has(row.friend_id);
                          const lm = formatLast(row.last_reservation_at);
                          return (
                            <tr key={row.friend_id} className={sel ? 'selected' : undefined}>
                              <td>
                                <input
                                  type="checkbox"
                                  className="check"
                                  checked={sel}
                                  onChange={() => toggleRow(row.friend_id)}
                                  aria-label={`select ${row.friend_id}`}
                                />
                              </td>
                              <td>
                                <div className="cust">
                                  <div className={`av ${av}`}>{initial}</div>
                                  <div className="nm">
                                    <div className="nname">{row.display_name || '（名称未設定）'}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={`uuid-pill mono${copiedId === row.friend_id ? ' copied' : ''}`}
                                  onClick={() => void copyFriendId(row.friend_id)}
                                  title="クリックでコピー">
                                  {(row.friend_id.slice(0, 8) + '…' + row.friend_id.slice(-4)) as string}
                                </button>
                              </td>
                              <td>{channelTags(row)}</td>
                              <td className="num">{row.reservation_count}</td>
                              <td>
                                <div className="last">
                                  {lm.main}
                                  <small>{lm.sub}</small>
                                </div>
                              </td>
                              <td>
                                <div className="ltv">
                                  <div className="bar" style={{ ['--ltv-pct' as string]: `${pct}%` }}>
                                    <i />
                                  </div>
                                  <span className="num" style={{ minWidth: 36 }}>
                                    {pct}%
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div className="end-acts">
                                  <Link href={`/customers/${encodeURIComponent(row.friend_id)}`} className="btn btn-primary sm">
                                    タイムライン
                                  </Link>
                                  <Link href={`/messages?friend_id=${encodeURIComponent(row.friend_id)}`} className="btn-ghost-inline" title="メッセージ">
                                    <MoreHorizontal size={18} />
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="pager">
                    <div>
                      <span>
                        {filtered.length === 0 ? '0' : `${start + 1}–${Math.min(start + pageSize, filtered.length)}`}
                      </span>{' '}
                      / <span>{filtered.length.toLocaleString('ja-JP')}</span> 件・
                      <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} aria-label="1ページあたり">
                        {[10, 20, 50].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      件
                    </div>
                    <div className="right">
                      <button
                        type="button"
                        className="pn"
                        disabled={pageClamped <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="前へ">
                        ‹
                      </button>
                      <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
                        {pageClamped} / {pages}
                      </span>
                      <button
                        type="button"
                        className="pn"
                        disabled={pageClamped >= pages}
                        onClick={() => setPage((p) => Math.min(pages, p + 1))}
                        aria-label="次へ">
                        ›
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
