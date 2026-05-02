'use client';

import './stylists.css';
import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Download,
  LayoutGrid,
  Plus,
  Search,
  TrendingUp,
  Trophy,
  Users
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Stylist = {
  id: string;
  salon_id: string;
  name: string;
  display_name: string | null;
  email: string | null;
  bio: string | null;
  specialties: string | null;
};

type Salon = { id: string; name: string };

type DemoStylist = {
  id: string;
  code: string;
  name: string;
  full: string;
  role: string;
  roleC: 's' | 't' | 'j';
  tenure: string;
  off: string;
  status: 'on' | 'off' | 'busy';
  bg: string;
  util: number;
  utilD: number;
  bookings: number;
  nominee: number;
  gateCv: number;
  revenue: string;
  revD: number;
  specialties: string[];
};

const DEMO_STYLISTS: DemoStylist[] = [
  {
    id: 'yuki', code: 'YK', name: 'YUKI', full: '佐藤 ゆき', role: 'トップ', roleC: 't',
    tenure: '4年2ヶ月', off: '火・水', status: 'on',
    bg: 'linear-gradient(135deg,#fbbf77,#e1306c)',
    util: 82, utilD: 5.4,
    bookings: 86, nominee: 71, gateCv: 53, revenue: '¥1.42M', revD: 12.4,
    specialties: ['外国人風カラー', 'ハイライト', 'ボブカット', 'トリートメント']
  },
  {
    id: 'aoi', code: 'AO', name: 'AOI', full: '青木 葵', role: 'シニア', roleC: 's',
    tenure: '2年8ヶ月', off: '月', status: 'on',
    bg: 'linear-gradient(135deg,#a78bfa,#3b82f6)',
    util: 74, utilD: 2.1,
    bookings: 64, nominee: 58, gateCv: 32, revenue: '¥980K', revD: 4.2,
    specialties: ['縮毛矯正', 'ショートカット', 'メンズカット']
  },
  {
    id: 'ken', code: 'KN', name: 'KEN', full: '高橋 健', role: 'シニア', roleC: 's',
    tenure: '3年6ヶ月', off: '木', status: 'busy',
    bg: 'linear-gradient(135deg,#34d399,#0d9488)',
    util: 68, utilD: -1.8,
    bookings: 42, nominee: 48, gateCv: 21, revenue: '¥780K', revD: -2.1,
    specialties: ['ブライダル', 'アップスタイル', 'メンズパーマ']
  },
  {
    id: 'momo', code: 'MM', name: 'MOMO', full: '森田 もも', role: 'ジュニア', roleC: 'j',
    tenure: '10ヶ月', off: '日', status: 'off',
    bg: 'linear-gradient(135deg,#fbcfe8,#be185d)',
    util: 61, utilD: 8.6,
    bookings: 28, nominee: 35, gateCv: 14, revenue: '¥420K', revD: 22.4,
    specialties: ['前髪カット', 'インナーカラー', 'ヘアセット']
  }
];

const STATUS_LABEL: Record<DemoStylist['status'], string> = {
  on: '勤務中',
  off: '休み',
  busy: '休憩中'
};

export default function StylistsPage() {
  const [activeTab, setActiveTab] = useState<'roster' | 'schedule' | 'performance'>('roster');
  const [range, setRange] = useState<'7' | '30' | '90'>('30');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [items, setItems] = useState<Stylist[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const salonItems = await fetchApi<Salon[]>('/api/salons');
      setSalons(salonItems);
      const salonId = salonItems[0]?.id || 'default';
      setItems(await fetchApi<Stylist[]>(`/api/stylists?salon_id=${encodeURIComponent(salonId)}`));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  const apiCount = items.length || salons.length;

  return (
    <AppShell>
      <div className="page-stylists">
        <div className="page-head">
          <div>
            <h1>スタイリスト</h1>
            <div className="sub">
              在籍 {DEMO_STYLISTS.length} 名のシフト・稼働率・指名率を一元管理。<code>identity_link</code> 経由の予約は担当者へ自動アサインされ、<code>analytics</code> の担当別ファネルにそのまま反映されます。
              {apiCount > 0 && <> 連携済みデータ {items.length} 件 / サロン {salons.length} 件。</>}
            </div>
            {error && <div className="err">{error}</div>}
          </div>
          <div className="actions">
            <div className="seg">
              <button className={range === '7' ? 'active' : ''} onClick={() => setRange('7')}>7日</button>
              <button className={range === '30' ? 'active' : ''} onClick={() => setRange('30')}>30日</button>
              <button className={range === '90' ? 'active' : ''} onClick={() => setRange('90')}>90日</button>
            </div>
            <button className="btn"><Download size={14} />CSV</button>
            <button className="btn btn-primary"><Plus size={14} />スタイリスト追加</button>
          </div>
        </div>

        <div className="mtiles">
          <div className="mtile">
            <div className="k"><TrendingUp size={11} />店舗 平均稼働率</div>
            <div className="v">71.2<small>%</small></div>
            <div className="d"><span className="delta up">▲ +4.8pt</span> 業界中央値 58%</div>
          </div>
          <div className="mtile">
            <div className="k"><Trophy size={11} />指名率（30日）</div>
            <div className="v">64.0<small>%</small></div>
            <div className="d">指名 134件 / 全予約 209件</div>
          </div>
          <div className="mtile">
            <div className="k"><Users size={11} />Gate &rarr; 担当指名</div>
            <div className="v">47.5<small>%</small></div>
            <div className="d">IG 経由予約のうち指名込みで来店</div>
          </div>
          <div className="mtile">
            <div className="k"><CalendarDays size={11} />今週シフト</div>
            <div className="v">142<small>h</small></div>
            <div className="d">確定 ・ 申請中 8h ・ 不足 0</div>
          </div>
        </div>

        <div className="tabs">
          <button
            type="button"
            className={`tab${activeTab === 'roster' ? ' active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            <LayoutGrid size={13} />一覧 <span className="n">{DEMO_STYLISTS.length}</span>
          </button>
          <button
            type="button"
            className={`tab${activeTab === 'schedule' ? ' active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <CalendarDays size={13} />シフト <span className="n">今週</span>
          </button>
          <button
            type="button"
            className={`tab${activeTab === 'performance' ? ' active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            <TrendingUp size={13} />パフォーマンス
          </button>
        </div>

        {activeTab === 'roster' && (
          <div>
            <div className="roster-tools">
              <label className="search">
                <Search size={13} />
                <input placeholder="名前・専門・スキルで検索…" />
              </label>
              <select>
                <option>役職: すべて</option>
                <option>シニア</option>
                <option>トップ</option>
                <option>ジュニア</option>
              </select>
              <select>
                <option>状態: すべて</option>
                <option>勤務中</option>
                <option>休憩中</option>
                <option>休み</option>
              </select>
              <select>
                <option value="util">並び替え: 稼働率</option>
                <option value="nominee">指名率</option>
                <option value="cv">Gate&rarr;CV</option>
                <option value="rev">売上</option>
              </select>
              <div className="grow" />
              <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>クリックで詳細パネル</span>
            </div>
            <div className="grid-cards">
              {DEMO_STYLISTS.map((s) => {
                const utilC = s.util >= 80 ? 'high' : s.util < 55 ? 'low' : '';
                const statusL = STATUS_LABEL[s.status];
                return (
                  <div key={s.id} className="scard">
                    <div className="top">
                      <div className="av" style={{ background: s.bg }}>
                        {s.code}
                        <div className={`stat ${s.status}`} title={statusL} />
                      </div>
                      <div className="nm">
                        <b>
                          {s.name} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>・ {s.full}</span>
                        </b>
                        <small>{statusL} ・ {s.tenure} ・ 休 {s.off}</small>
                        <span className={`role ${s.roleC}`}>{s.role}</span>
                      </div>
                    </div>
                    <div className="util-bar">
                      <div className="urow">
                        <span>稼働率（30日）</span>
                        <span>
                          <b>{s.util}<small>%</small></b>
                          <span
                            className="delta"
                            style={{ color: s.utilD >= 0 ? 'var(--green)' : 'var(--rose)', marginLeft: 6 }}
                          >
                            {s.utilD >= 0 ? '▲' : '▼'} {Math.abs(s.utilD)}pt
                          </span>
                        </span>
                      </div>
                      <div className="track"><div className={`fill ${utilC}`} style={{ width: `${s.util}%` }} /></div>
                    </div>
                    <div className="stats">
                      <div className="it">予約<b>{s.bookings}<small>件</small></b></div>
                      <div className="it">指名率<b>{s.nominee}<small>%</small></b></div>
                      <div className="it">Gate&rarr;CV<b>{s.gateCv}<small>件</small></b></div>
                    </div>
                    <div className="skills">
                      {s.specialties.map((sk, i) => (
                        <span key={sk} className={`sk${i === 0 ? ' spec' : ''}`}>{sk}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="form-card">
            <h3><CalendarDays size={14} />今週のシフト</h3>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
              シフト編集インターフェースは近日対応予定。既存の Google カレンダー連携で同期しています。
            </p>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="form-card">
            <h3><Trophy size={14} />担当別 リーダーボード（{range}日）</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {[...DEMO_STYLISTS].sort((a, b) => b.bookings - a.bookings).map((s, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 10px',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      fontSize: 12.5
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: s.bg,
                        color: '#fff',
                        fontWeight: 700,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11
                      }}
                    >
                      {s.code}
                    </div>
                    <div style={{ flex: 1 }}>
                      <b style={{ fontWeight: 600 }}>{medal} {s.name}</b>
                      <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 1 }}>
                        {s.role} ・ {s.full}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{s.bookings}件</b>
                      <div style={{ color: 'var(--muted)', fontSize: 11 }}>{s.revenue}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
