'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, Filter, MessageCircle, Plus, RefreshCw, Search } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError, getApiKey } from '@/lib/api';
import { avatarClassFromSeed, displayInitial } from '@/lib/avatar-class';
import {
  jstAddDays,
  jstMondaySundayRangeContaining,
  jstMonthPrefix,
  jstTodayYmd,
  reservationDateKey
} from '@/lib/date-jst';

type ReservationRow = {
  id: string;
  start_at: string;
  end_at: string;
  friend_id: string;
  stylist_id: string;
  menu_ids: string;
  status: string;
  total_price: number;
  source: string | null;
};

type DateTab = 'today' | 'tomorrow' | 'week' | 'month';
type StatusFilter = 'all' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
type SortKey = 'time' | 'status' | 'amount';
type SortDir = 'asc' | 'desc';

function applyDateTab(items: ReservationRow[], tab: DateTab): ReservationRow[] {
  const today = jstTodayYmd();
  if (tab === 'today') return items.filter((r) => reservationDateKey(r.start_at) === today);
  if (tab === 'tomorrow') return items.filter((r) => reservationDateKey(r.start_at) === jstAddDays(today, 1));
  if (tab === 'week') {
    const { mon, sun } = jstMondaySundayRangeContaining(today);
    return items.filter((r) => {
      const k = reservationDateKey(r.start_at);
      return k >= mon && k <= sun;
    });
  }
  const pref = jstMonthPrefix();
  return items.filter((r) => reservationDateKey(r.start_at).startsWith(pref));
}

function countTab(items: ReservationRow[], tab: DateTab): number {
  return applyDateTab(items, tab).length;
}

function menuSummary(menuIdsJson: string): string {
  try {
    const arr = JSON.parse(menuIdsJson || '[]') as string[];
    if (!arr?.length) return '当日相談 / 未定';
    if (arr.length === 1) return 'メニュー 1件';
    return `メニュー ${arr.length}件`;
  } catch {
    return '—';
  }
}

function fmtSlot(iso: string): { d: string; t: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  }).format(d);
  const time = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
  return { d: date, t: time };
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    confirmed: '確定',
    completed: '完了',
    cancelled: 'キャンセル',
    no_show: '無断'
  };
  return m[s] || s;
}

function statusClass(s: string): string {
  if (s === 'completed') return 'done';
  if (s === 'cancelled') return 'cancel';
  if (s === 'no_show') return 'noshow';
  return 'confirmed';
}

function sourceLabel(s: string | null): string {
  if (!s) return '—';
  if (s === 'liff') return 'LIFF';
  return s;
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

export default function ReservationsPage() {
  const [items, setItems] = useState<ReservationRow[]>([]);
  const [stylistNames, setStylistNames] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const [dateTab, setDateTab] = useState<DateTab>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setError('');
    if (!getApiKey()) {
      setItems([]);
      setLoaded(true);
      setError('ログイン情報がありません。/login で API Key を入力してください。');
      return;
    }
    try {
      const [rez, salons] = await Promise.all([
        fetchApi<ReservationRow[]>('/api/reservations'),
        fetchApi<{ id: string }[]>('/api/salons').catch(() => [] as { id: string }[])
      ]);
      setItems(Array.isArray(rez) ? rez : []);
      const salonId = salons[0]?.id ?? 'default';
      try {
        const stylistsList = await fetchApi<{ id: string; name: string; display_name: string | null }[]>(
          `/api/stylists?salon_id=${encodeURIComponent(salonId)}`
        );
        const map: Record<string, string> = {};
        for (const s of stylistsList) map[s.id] = s.display_name || s.name;
        setStylistNames(map);
      } catch {
        setStylistNames({});
      }
      setLoaded(true);
    } catch (err) {
      setItems([]);
      setLoaded(true);
      setError(friendlyApiError(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tabCounts = useMemo(
    () => ({
      today: countTab(items, 'today'),
      tomorrow: countTab(items, 'tomorrow'),
      week: countTab(items, 'week'),
      month: countTab(items, 'month')
    }),
    [items]
  );

  const dateFiltered = useMemo(() => applyDateTab(items, dateTab), [items, dateTab]);

  const statusCounts = useMemo(() => {
    const base = dateFiltered;
    return {
      all: base.length,
      confirmed: base.filter((r) => r.status === 'confirmed').length,
      completed: base.filter((r) => r.status === 'completed').length,
      cancelled: base.filter((r) => r.status === 'cancelled').length,
      no_show: base.filter((r) => r.status === 'no_show').length
    };
  }, [dateFiltered]);

  const filtered = useMemo(() => {
    let rows = dateFiltered.slice();
    if (statusFilter !== 'all') rows = rows.filter((r) => r.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const st = stylistNames[r.stylist_id] ?? '';
        return (
          r.friend_id.toLowerCase().includes(q) ||
          st.toLowerCase().includes(q) ||
          menuSummary(r.menu_ids).toLowerCase().includes(q)
        );
      });
    }
    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'time') return (a.start_at < b.start_at ? -1 : a.start_at > b.start_at ? 1 : 0) * dir;
      if (sortKey === 'status') return a.status.localeCompare(b.status) * dir;
      return (a.total_price - b.total_price) * dir;
    });
    return rows;
  }, [dateFiltered, statusFilter, query, sortKey, sortDir, stylistNames]);

  useEffect(() => {
    setPage(1);
  }, [dateTab, statusFilter, query, sortKey, sortDir, pageSize]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, pages);
  const start = (pageClamped - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  function toggleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir(key === 'time' ? 'desc' : 'asc');
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

  function togglePageAll(checked: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const r of pageRows) {
        if (checked) n.add(r.id);
        else n.delete(r.id);
      }
      return n;
    });
  }

  const pids = pageRows.map((r) => r.id);
  const allPick = pids.length > 0 && pids.every((id) => selected.has(id));

  function exportCsv(rows: ReservationRow[]) {
    const hdr = ['id', 'start_at', 'friend_id', 'stylist_id', 'status', 'total_price', 'source'];
    const lines = [hdr.join(','), ...rows.map((r) => hdr.map((k) => String((r as never)[k] ?? '')).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations_${jstTodayYmd()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="page-reservations">
        <div className="page-head">
          <div>
            <h1>
              予約 <span className="count">{filtered.length.toLocaleString('ja-JP')} 件</span>
            </h1>
            <div className="sub">
              {applyDateTab(items, dateTab).length.toLocaleString('ja-JP')} 件が期間フィルタ内（全件 {items.length.toLocaleString('ja-JP')}）
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="seg" role="tablist">
              {(
                [
                  ['today', '今日', tabCounts.today],
                  ['tomorrow', '明日', tabCounts.tomorrow],
                  ['week', '今週', tabCounts.week],
                  ['month', '今月', tabCounts.month]
                ] as const
              ).map(([key, lab, cnt]) => (
                <button
                  key={key}
                  type="button"
                  className={dateTab === key ? 'active' : ''}
                  onClick={() => setDateTab(key)}
                  aria-selected={dateTab === key}>
                  {lab}{' '}
                  <span className="count">{cnt}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn" onClick={() => void load()}>
              <RefreshCw size={14} />更新
            </button>
            <button type="button" className="btn" onClick={() => exportCsv(filtered)} disabled={!filtered.length}>
              <Download size={14} />
              CSV
            </button>
            <button type="button" className="btn btn-primary" disabled title="管理画面からの追加は順次対応予定です">
              <Plus size={14} />予約を追加
            </button>
          </div>
        </div>

        {error && (
          <div className="auth-banner">
            <CalendarDays size={14} aria-hidden />
            <div>{error}</div>
          </div>
        )}

        {!error && loaded && (
          <>
            <div className="toolbar" style={{ marginBottom: 14 }}>
              <label className="search">
                <Search size={14} aria-hidden />
                <input placeholder="friend_id / スタイリスト / メニュー件数で絞り込み…" value={query} onChange={(e) => setQuery(e.target.value)} />
                {query ? (
                  <button type="button" className="clear" aria-label="クリア" onClick={() => setQuery('')}>
                    ×
                  </button>
                ) : null}
              </label>

              <div className="filter-chips">
                {(
                  [
                    ['all', 'すべて', statusCounts.all],
                    ['confirmed', '確定', statusCounts.confirmed],
                    ['completed', '完了', statusCounts.completed],
                    ['cancelled', 'キャンセル', statusCounts.cancelled],
                    ['no_show', '無断', statusCounts.no_show]
                  ] as const
                ).map(([key, lab, cnt]) => (
                  <button
                    key={key}
                    type="button"
                    className={`chip-f${statusFilter === key ? ' active' : ''}`}
                    onClick={() => setStatusFilter(key)}>
                    <span>{lab}</span>
                    <span className="sw">{cnt}</span>
                  </button>
                ))}
              </div>

              <div className="grow" />

              <button type="button" className="btn" disabled title="近日対応">
                <Filter size={13} />
                スタイリスト・流入元
              </button>
            </div>

            <div className={`bulkbar${selected.size ? ' show' : ''}`}>
              <span className="n">{selected.size} 件を選択中</span>
              <span className="sep" />
              <button
                type="button"
                className="b"
                disabled={!selected.size}
                onClick={() => exportCsv(items.filter((x) => selected.has(x.id)))}>
                CSV
              </button>
              <button type="button" className="x" aria-label="解除" onClick={() => setSelected(new Set())}>
                ×
              </button>
            </div>

            <div className="ds-panel">
              {filtered.length === 0 ? (
                <div className="state">
                  <div className="ill">
                    <CalendarDays size={34} strokeWidth={1.6} />
                  </div>
                  <b>該当する予約はありません</b>
                  <p>日付タブ・ステータス・検索を変更してください。</p>
                  <div className="actions">
                    <button type="button" className="btn" onClick={() => { setStatusFilter('all'); setQuery(''); }}>
                      フィルタを解除
                    </button>
                  </div>
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
                              checked={allPick}
                              ref={(el) => {
                                if (!el) return;
                                const some = pageRows.some((r) => selected.has(r.id));
                                el.indeterminate = some && !allPick;
                              }}
                              onChange={(e) => togglePageAll(e.target.checked)}
                              aria-label="このページを全選択"
                            />
                          </th>
                          <th className={thClass('time')} onClick={() => toggleSort('time')}>
                            日時
                            <SortIcons />
                          </th>
                          <th>顧客 / UUID</th>
                          <th>メニュー</th>
                          <th>スタイリスト</th>
                          <th className={thClass('status')} onClick={() => toggleSort('status')}>
                            状態
                            <SortIcons />
                          </th>
                          <th>流入元</th>
                          <th className={thClass('amount')} style={{ textAlign: 'right' }} onClick={() => toggleSort('amount')}>
                            金額
                            <SortIcons />
                          </th>
                          <th style={{ width: 88 }} aria-label="actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((r) => {
                          const slot = fmtSlot(r.start_at);
                          const custAv = avatarClassFromSeed(r.friend_id);
                          const stAv = avatarClassFromSeed(r.stylist_id);
                          const stName = stylistNames[r.stylist_id] ?? r.stylist_id.slice(0, 8);
                          const stInit = displayInitial(stName, r.stylist_id);
                          const picked = selected.has(r.id);
                          return (
                            <tr key={r.id} className={picked ? 'selected' : undefined}>
                              <td>
                                <input
                                  type="checkbox"
                                  className="check"
                                  checked={picked}
                                  onChange={() => toggleRow(r.id)}
                                  aria-label={`select ${r.id}`}
                                />
                              </td>
                              <td>
                                <div className="tcol-time">
                                  <span className="d">{slot.d}</span>
                                  <span className="t">{slot.t}</span>
                                </div>
                              </td>
                              <td>
                                <div className="cust res-cust">
                                  <div className={`av ${custAv}`}>{displayInitial(null, r.friend_id)}</div>
                                  <div className="nm">
                                    <Link href={`/customers/${encodeURIComponent(r.friend_id)}`}>{r.friend_id.slice(0, 13)}…</Link>
                                    <small
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => void navigator.clipboard.writeText(r.friend_id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ')
                                          void navigator.clipboard.writeText(r.friend_id);
                                      }}>
                                      {r.friend_id.slice(0, 8)}…{r.friend_id.slice(-4)}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="menu-cell">{menuSummary(r.menu_ids)}</div>
                              </td>
                              <td>
                                <span className="stylist-cell">
                                  <span className={`av-sm ${stAv}`}>{stInit}</span>
                                  {stName}
                                </span>
                              </td>
                              <td>
                                <span className={`stat ${statusClass(r.status)}`}>
                                  <span className="dt" aria-hidden />{statusLabel(r.status)}
                                </span>
                              </td>
                              <td>
                                <span className="source-pill">
                                  <span className="lab">{sourceLabel(r.source)}</span>
                                </span>
                              </td>
                              <td className="amount">¥{Number(r.total_price ?? 0).toLocaleString('ja-JP')}</td>
                              <td>
                                <div className="rowact">
                                  <Link href={`/messages?friend_id=${encodeURIComponent(r.friend_id)}`} title="メッセージ" aria-label="LINE">
                                    <MessageCircle size={16} strokeWidth={2} />
                                  </Link>
                                  <Link href={`/customers/${encodeURIComponent(r.friend_id)}`} title="顧客タイムライン" aria-label="タイムライン">
                                    <CalendarDays size={16} strokeWidth={2} />
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
                      <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                        {[10, 20, 50].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      件
                    </div>
                    <div className="right">
                      <button type="button" className="pn" disabled={pageClamped <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        ‹
                      </button>
                      <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
                        {pageClamped} / {pages}
                      </span>
                      <button type="button" className="pn" disabled={pageClamped >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
                        ›
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="note-foot">
              ※{' '}
              <code style={{ fontSize: 11 }}>friend_id</code>{' '}
              から顧客タイムラインへ進めます。オーナー / スタイリストロールにより API 側で一覧が切り替わります。
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
