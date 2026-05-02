'use client';

import './settings.css';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Brush,
  Check,
  Clock,
  CreditCard,
  Home,
  Link2,
  Plus,
  Settings as SettingsIcon,
  ShieldAlert,
  Terminal,
  Users
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Salon = {
  id: string;
  name: string;
  business_type: string;
  theme_color: string | null;
};

type SectionKey =
  | 'general'
  | 'hours'
  | 'brand'
  | 'connections'
  | 'webhook'
  | 'reservation'
  | 'notify'
  | 'team'
  | 'billing'
  | 'danger';

const SECTIONS: { group: string; items: { key: SectionKey; label: string; icon: React.ComponentType<{ size?: number }>; alert?: boolean }[] }[] = [
  {
    group: '店舗',
    items: [
      { key: 'general', label: '店舗情報', icon: Home },
      { key: 'hours', label: '営業時間 / 休日', icon: Clock },
      { key: 'brand', label: 'ブランディング', icon: Brush }
    ]
  },
  {
    group: '連携',
    items: [
      { key: 'connections', label: '外部連携', icon: Link2, alert: true },
      { key: 'webhook', label: 'Webhook / API', icon: Terminal }
    ]
  },
  {
    group: '運用',
    items: [
      { key: 'reservation', label: '予約ルール', icon: SettingsIcon },
      { key: 'notify', label: '通知', icon: Bell },
      { key: 'team', label: 'チーム / 権限', icon: Users }
    ]
  },
  {
    group: 'アカウント',
    items: [
      { key: 'billing', label: 'プラン・請求', icon: CreditCard },
      { key: 'danger', label: '危険な操作', icon: AlertTriangle }
    ]
  }
];

const HOURS = [
  { day: '月', sub: 'Mon', closed: true },
  { day: '火', sub: 'Tue', open: '10:00', close: '20:00', on: true },
  { day: '水', sub: 'Wed', open: '10:00', close: '20:00', on: true },
  { day: '木', sub: 'Thu', open: '10:00', close: '20:00', on: true },
  { day: '金', sub: 'Fri', open: '10:00', close: '21:00', on: true },
  { day: '土', sub: 'Sat', open: '09:00', close: '20:00', on: true },
  { day: '日', sub: 'Sun', open: '09:00', close: '19:00', on: true }
];

const TEAM = [
  { code: 'MS', name: '松井 さくら', email: 'matsui@harness-aoyama.jp', role: 'owner', roleLabel: 'オーナー', dept: '—', mfa: 'ok', last: '5分前', bg: 'linear-gradient(135deg,#a78bfa,#3b82f6)' },
  { code: 'YK', name: 'YUKI', email: 'yuki@harness-aoyama.jp', role: 'mgr', roleLabel: 'マネージャー', dept: 'スタイリスト', mfa: 'ok', last: '1時間前', bg: 'linear-gradient(135deg,#fbbf77,#e1306c)' },
  { code: 'AO', name: 'AOI', email: 'aoi@harness-aoyama.jp', role: 'staff', roleLabel: 'スタッフ', dept: 'スタイリスト', mfa: 'ok', last: '3時間前', bg: 'linear-gradient(135deg,#34d399,#0d9488)' },
  { code: 'KN', name: 'KEN', email: 'ken@harness-aoyama.jp', role: 'staff', roleLabel: 'スタッフ', dept: 'スタイリスト', mfa: 'warn', last: '昨日', bg: 'linear-gradient(135deg,#fde68a,#b45309)' },
  { code: 'MM', name: 'MOMO', email: 'momo@harness-aoyama.jp', role: 'staff', roleLabel: 'スタッフ', dept: 'スタイリスト・受付', mfa: 'ok', last: '2時間前', bg: 'linear-gradient(135deg,#fbcfe8,#be185d)' },
  { code: 'TK', name: '田中 拓海', email: 'accounting@harness-aoyama.jp', role: 'read', roleLabel: '閲覧のみ', dept: '会計', mfa: 'ok', last: '3日前', bg: 'linear-gradient(135deg,#94a3b8,#475569)' }
];

const NOTIFY_ROWS = [
  { label: '予約が入った', sub: '新規・指名問わず', on: [true, false, true, true] },
  { label: '予約が変更された', on: [true, false, true, false] },
  { label: '予約がキャンセルされた', on: [true, true, true, true] },
  { label: 'IG コメントを検知', sub: 'キャンペーンキーワード一致', on: [true, false, false, true] },
  { label: 'LINE で要対応の返信', on: [true, false, true, false] },
  { label: 'キャンペーンが目標を達成', on: [true, true, false, true] },
  { label: 'API エラー / 連携異常', on: [true, true, false, true] }
];

const PERMISSION_ROWS = [
  { label: '予約の閲覧 / 編集', vals: ['✓', '✓', '✓ （自分の担当のみ）', '閲覧のみ'] },
  { label: '顧客カルテ閲覧', vals: ['✓', '✓', '✓', '✓'] },
  { label: 'キャンペーン作成・配信', vals: ['✓', '✓', '—', '—'] },
  { label: 'クーポン発行', vals: ['✓', '✓', '—', '—'] },
  { label: '分析ダッシュボード', vals: ['✓', '✓', '担当のみ', '✓'] },
  { label: '設定 / 連携 / 請求', vals: ['✓', '—', '—', '—'] }
];

export default function SettingsPage() {
  const [section, setSection] = useState<SectionKey>('general');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      setSalons(await fetchApi<Salon[]>('/api/salons'));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell>
      <div className="page-settings">
        <aside className="secnav">
          {SECTIONS.map((group) => (
            <div key={group.group}>
              <h6>{group.group}</h6>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={`sec-item${section === item.key ? ' active' : ''}`}
                    onClick={() => setSection(item.key)}
                  >
                    <Icon size={14} />
                    {item.label}
                    {item.alert && <span className="alert-dot" />}
                  </div>
                );
              })}
            </div>
          ))}
        </aside>

        <main className="pmain">
          {section === 'general' && (
            <section>
              <div className="page-head">
                <h1>店舗情報</h1>
                <div className="sub">
                  店舗の基本情報。ここで設定した内容が予約フォーム、LINE 公式メッセージ、メール、領収書などに反映されます。
                  {error && <span style={{ color: 'var(--rose)', marginLeft: 8 }}>{error}</span>}
                </div>
              </div>
              <div className="save-bar">
                <span className="dot" />
                <span><b>未保存の変更があります</b></span>
                <span className="grow" />
                <small>2025/04/30 14:32 最終保存</small>
                <button type="button" className="btn sm">破棄</button>
                <button type="button" className="btn btn-primary sm">変更を保存</button>
              </div>

              <div className="scard">
                <div className="ch"><h3>基本情報</h3></div>
                <div className="body">
                  <div className="row">
                    <div className="lbl">店舗名</div>
                    <div className="ctl"><input className="input" defaultValue={salons[0]?.name || 'Salon Harness 青山フラッグシップ'} /></div>
                    <div className="meta" />
                  </div>
                  <div className="row">
                    <div className="lbl">表示名<small>予約フォームでの表示</small></div>
                    <div className="ctl"><input className="input" defaultValue="Salon Harness 青山店" /></div>
                  </div>
                  <div className="row">
                    <div className="lbl">ハンドル<small>予約URLとQRに使用</small></div>
                    <div className="ctl">
                      <input className="input mono" defaultValue={salons[0]?.id || 'harness-aoyama'} readOnly />
                      <span className="meta mono">/r/<b style={{ color: 'var(--ink)', fontWeight: 600 }}>{salons[0]?.id || 'harness-aoyama'}</b></span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="lbl">電話番号</div>
                    <div className="ctl"><input className="input medium" defaultValue="03-6447-2189" /></div>
                  </div>
                  <div className="row">
                    <div className="lbl">メール</div>
                    <div className="ctl"><input className="input" type="email" defaultValue="info@harness-aoyama.jp" /></div>
                  </div>
                  <div className="row">
                    <div className="lbl">住所</div>
                    <div className="ctl"><input className="input" defaultValue="東京都港区南青山3-15-9 青山ビル B1F" /></div>
                  </div>
                  <div className="row">
                    <div className="lbl">最寄駅</div>
                    <div className="ctl"><input className="input medium" defaultValue="表参道駅 A4出口 徒歩4分" /></div>
                  </div>
                  <div className="row">
                    <div className="lbl">紹介文<small>予約フォーム上部・LINE 友だち追加時に表示</small></div>
                    <div className="ctl">
                      <textarea className="textarea" defaultValue="パーソナライズされたカラーとケアにこだわるサロン。お一人お一人の髪質と理想に合わせた施術を、4名のスタイリストでお届けします。" />
                    </div>
                  </div>
                </div>
              </div>

              {salons.length > 0 && (
                <div className="scard">
                  <div className="ch"><h3>連携済みサロン（{salons.length}）</h3></div>
                  <div className="body">
                    {salons.map((salon) => (
                      <div key={salon.id} className="row">
                        <div className="lbl">{salon.name}<small>ID: {salon.id}</small></div>
                        <div className="ctl">
                          <span className="meta">種別: {salon.business_type}</span>
                          {salon.theme_color && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 4,
                                  background: salon.theme_color,
                                  border: '1px solid var(--line)'
                                }}
                              />
                              <span className="mono" style={{ fontSize: 12 }}>{salon.theme_color}</span>
                            </span>
                          )}
                        </div>
                        <div className="meta">/s/{salon.id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {section === 'hours' && (
            <section>
              <div className="page-head">
                <h1>営業時間 / 休日</h1>
                <div className="sub">予約可能な時間帯と定休日。ここで設定した時間外は予約フォームに表示されません。臨時休業は別途登録できます。</div>
              </div>
              <div className="scard">
                <div className="ch"><h3>レギュラー営業時間</h3><div className="grow" /><button type="button" className="btn sm">テンプレートに保存</button></div>
                <div className="body">
                  {HOURS.map((h) => (
                    <div key={h.day} className="hours-row">
                      <div className="day">{h.day}<span className="sub">{h.sub}</span></div>
                      {h.closed ? (
                        <div className="closed">休業日</div>
                      ) : (
                        <>
                          <div><input className="input short" defaultValue={h.open} /></div>
                          <div><input className="input short" defaultValue={h.close} /></div>
                        </>
                      )}
                      <div className={`toggle${h.on ? ' on' : ''}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="scard">
                <div className="ch"><h3>臨時休業 / 営業</h3><div className="grow" /><button type="button" className="btn sm"><Plus size={12} />追加</button></div>
                <div className="body">
                  <div className="row">
                    <div className="lbl">5/3 〜 5/6 <small>GW 連休（休業）</small></div>
                    <div className="ctl"><span className="status warn">適用中</span></div>
                    <div className="meta"><button type="button" className="btn sm">編集</button> <button type="button" className="btn sm btn-danger">削除</button></div>
                  </div>
                  <div className="row">
                    <div className="lbl">6/15 <small>研修のため臨時休業</small></div>
                    <div className="ctl"><span className="status ok">予約済</span></div>
                    <div className="meta"><button type="button" className="btn sm">編集</button> <button type="button" className="btn sm btn-danger">削除</button></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {section === 'brand' && (
            <section>
              <div className="page-head">
                <h1>ブランディング</h1>
                <div className="sub">予約フォーム、LINE 公式メッセージ、領収書PDF などに反映されるロゴ・色・フォント。</div>
              </div>
              <div className="scard">
                <div className="ch"><h3>ロゴ・カバー</h3></div>
                <div className="body">
                  <div className="row">
                    <div className="lbl">ロゴ<small>正方形 / 512×512px 推奨</small></div>
                    <div className="ctl">
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg,#0f766e,#14a89c)',
                          display: 'grid',
                          placeItems: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 24
                        }}
                      >
                        S
                      </div>
                      <button type="button" className="btn sm">画像をアップロード</button>
                      <button type="button" className="btn sm btn-danger">削除</button>
                    </div>
                    <div className="meta" />
                  </div>
                  <div className="row">
                    <div className="lbl">カバー画像<small>予約フォーム上部 / 1600×600px 推奨</small></div>
                    <div className="ctl">
                      <div style={{ width: 200, height: 75, borderRadius: 8, background: 'linear-gradient(135deg,#fde6c2,#0f766e)', border: '1px solid var(--line)' }} />
                      <button type="button" className="btn sm">画像をアップロード</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="scard">
                <div className="ch"><h3>カラーテーマ</h3></div>
                <div className="body">
                  <div className="row">
                    <div className="lbl">プライマリ色</div>
                    <div className="ctl">
                      <div className="swatches">
                        {['#0f766e', '#1d4ed8', '#be185d', '#b45309', '#5b21b6', '#172026'].map((c, i) => (
                          <div key={c} className={`sw${i === 0 ? ' sel' : ''}`} style={{ background: c }} />
                        ))}
                      </div>
                      <input className="input mono short" defaultValue="#0F766E" />
                    </div>
                  </div>
                  <div className="row">
                    <div className="lbl">フォント</div>
                    <div className="ctl">
                      <select className="selectx" style={{ maxWidth: 240 }}>
                        <option>Noto Sans JP（既定）</option>
                        <option>Yu Gothic</option>
                        <option>Hiragino Kaku Gothic</option>
                        <option>Klee One</option>
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="lbl">予約フォームの雰囲気</div>
                    <div className="ctl">
                      <select className="selectx" style={{ maxWidth: 240 }}>
                        <option>ミニマル（既定）</option>
                        <option>ラグジュアリー</option>
                        <option>カジュアル</option>
                        <option>モード</option>
                      </select>
                      <a style={{ fontSize: 12, color: 'var(--accent-600)', fontWeight: 600 }}>プレビュー →</a>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {section === 'connections' && (
            <section>
              <div className="page-head">
                <h1>外部連携</h1>
                <div className="sub">Instagram、LINE 公式アカウント、Google カレンダーなどとの接続。Gate（IGコメント→自動DM→LINE 送客）の前提となる設定です。</div>
              </div>
              <div className="scard">
                <div className="ch"><h3>SNS / メッセージング</h3></div>
                <div className="body">
                  <div className="conn">
                    <div className="icon ig">IG</div>
                    <div className="info">
                      <b>Instagram Business <span className="status ok"><span className="pulse" />接続済</span></b>
                      <div className="meta">
                        <span>@harness_aoyama</span><span>•</span>
                        <span>フォロワー 14,820</span><span>•</span>
                        <span>Webhook 受信中（DM・コメント）</span>
                      </div>
                    </div>
                    <div className="actions">
                      <button type="button" className="btn sm">権限を再認可</button>
                      <button type="button" className="btn sm">設定</button>
                    </div>
                  </div>
                  <div className="conn">
                    <div className="icon line">L</div>
                    <div className="info">
                      <b>LINE 公式アカウント <span className="status ok"><span className="pulse" />接続済</span></b>
                      <div className="meta">
                        <span>@harness-aoyama</span><span>•</span>
                        <span>友だち 3,184人</span><span>•</span>
                        <span>メッセージAPI / リッチメニュー連携 ON</span>
                      </div>
                    </div>
                    <div className="actions"><button type="button" className="btn sm">設定</button></div>
                  </div>
                </div>
              </div>
              <div className="scard">
                <div className="ch"><h3>カレンダー / 予約 / 決済</h3></div>
                <div className="body">
                  <div className="conn">
                    <div className="icon gcal"><Clock size={20} /></div>
                    <div className="info">
                      <b>Google カレンダー <span className="status ok"><span className="pulse" />4 アカウント同期</span></b>
                      <div className="meta"><span>YUKI / AOI / KEN / MOMO</span><span>•</span><span>双方向同期 ・ 60秒間隔</span></div>
                    </div>
                    <div className="actions">
                      <button type="button" className="btn sm">同期状況</button>
                      <button type="button" className="btn sm">スタイリストを追加</button>
                    </div>
                  </div>
                  <div className="conn">
                    <div className="icon stripe">S</div>
                    <div className="info">
                      <b>Stripe（事前決済）<span className="status warn">確認待ち</span></b>
                      <div className="meta"><span>本人確認書類のアップロードが必要</span><span>•</span><span>テストモード</span></div>
                    </div>
                    <div className="actions"><button type="button" className="btn sm btn-primary">設定を完了</button></div>
                  </div>
                  <div className="conn">
                    <div className="icon gmap"><ShieldAlert size={18} /></div>
                    <div className="info">
                      <b>Google ビジネスプロフィール <span className="status err">未接続</span></b>
                      <div className="meta"><span>口コミ取得 ・ 予約ボタン表示の連携が利用可</span></div>
                    </div>
                    <div className="actions"><button type="button" className="btn sm btn-primary">接続する</button></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {section === 'webhook' && (
            <section>
              <div className="page-head">
                <h1>Webhook / API</h1>
                <div className="sub">他システムへのイベント通知 と REST API トークン。<code style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, background: 'var(--header)', border: '1px solid var(--line)', padding: '1px 6px', borderRadius: 4 }}>reservation.*</code>, <code style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, background: 'var(--header)', border: '1px solid var(--line)', padding: '1px 6px', borderRadius: 4 }}>customer.*</code>, <code style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, background: 'var(--header)', border: '1px solid var(--line)', padding: '1px 6px', borderRadius: 4 }}>campaign.*</code> などのイベントを購読できます。</div>
              </div>
              <div className="scard">
                <div className="ch"><h3>Webhook エンドポイント</h3><div className="grow" /><button type="button" className="btn sm"><Plus size={12} />追加</button></div>
                <div className="body">
                  <div className="row">
                    <div className="lbl">予約通知 → Slack<small>#salon-ops</small></div>
                    <div className="ctl"><input className="input mono" defaultValue="https://hooks.slack.com/services/T0***/B0***/x9k**" readOnly /></div>
                    <div className="meta"><span className="status ok"><span className="pulse" />稼働中</span></div>
                  </div>
                  <div className="row">
                    <div className="lbl">CRM 同期 → Hubspot</div>
                    <div className="ctl"><input className="input mono" defaultValue="https://api.hubapi.com/integrations/v1/salon-harness/event" readOnly /></div>
                    <div className="meta"><span className="status warn">直近 3xx エラー</span></div>
                  </div>
                </div>
              </div>
              <div className="scard">
                <div className="ch"><h3>API トークン</h3><div className="grow" /><button type="button" className="btn sm btn-primary">新規発行</button></div>
                <div className="body">
                  <div className="tk">
                    <div>
                      <div className="nm">Production / Read+Write</div>
                      <div className="meta">最終使用 8分前 ・ 14,892 リクエスト / 30日 ・ 作成 2024/11/02</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="btn sm">権限</button>
                      <button type="button" className="btn sm">ローテート</button>
                      <button type="button" className="btn sm btn-danger">取消</button>
                    </div>
                  </div>
                  <div className="tk">
                    <div>
                      <div className="nm">Analytics export / Read only</div>
                      <div className="meta">最終使用 昨日 ・ 218 リクエスト / 30日 ・ 作成 2025/01/15</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="btn sm">権限</button>
                      <button type="button" className="btn sm">ローテート</button>
                      <button type="button" className="btn sm btn-danger">取消</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="scard">
                <div className="ch"><h3>最近のイベント</h3><div className="grow" /><a style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent-600)' }}>すべてのログを開く →</a></div>
                <div className="body" style={{ padding: 0 }}>
                  <div className="wh"><div className="code" style={{ color: 'var(--green)' }}>200</div><div className="ev">reservation.created</div><div className="desc">花田 ななみ さん / 5/12 14:00 カラー＋カット</div><div className="t">2分前</div></div>
                  <div className="wh"><div className="code" style={{ color: 'var(--green)' }}>200</div><div className="ev">customer.line_linked</div><div className="desc">@yuki_kk さん（IG）→ 山田 結さん（顧客）に統合</div><div className="t">14分前</div></div>
                  <div className="wh"><div className="code" style={{ color: 'var(--green)' }}>200</div><div className="ev">campaign.dm_sent</div><div className="desc">春の限定カラー10%OFF / 142件配信完了</div><div className="t">1時間前</div></div>
                  <div className="wh"><div className="code" style={{ color: 'var(--amber)' }}>429</div><div className="ev">webhook.retry</div><div className="desc">Hubspot エンドポイント / 3回目リトライ成功</div><div className="t">2時間前</div></div>
                  <div className="wh"><div className="code" style={{ color: 'var(--rose)' }}>5xx</div><div className="ev">webhook.failed</div><div className="desc">Hubspot エンドポイント / 接続タイムアウト</div><div className="t">2時間前</div></div>
                </div>
              </div>
            </section>
          )}

          {section === 'reservation' && (
            <section>
              <div className="page-head">
                <h1>予約ルール</h1>
                <div className="sub">受付の制限、キャンセルポリシー、リマインドのタイミングなど。</div>
              </div>
              <div className="scard">
                <div className="ch"><h3>受付制限</h3></div>
                <div className="body">
                  <div className="row"><div className="lbl">受付開始<small>X日前から予約可能</small></div><div className="ctl"><input className="input short" type="number" defaultValue={60} /> 日前</div></div>
                  <div className="row"><div className="lbl">受付締切<small>X時間前まで予約可能</small></div><div className="ctl"><input className="input short" type="number" defaultValue={2} /> 時間前</div></div>
                  <div className="row"><div className="lbl">最大同時予約数</div><div className="ctl"><input className="input short" type="number" defaultValue={2} /> 件 / 顧客</div></div>
                  <div className="row"><div className="lbl">指名なし予約を許可</div><div className="ctl"><div className="toggle on" /></div></div>
                  <div className="row"><div className="lbl">前後バッファ<small>予約間に自動で確保する空き</small></div><div className="ctl"><input className="input short" type="number" defaultValue={15} /> 分</div></div>
                </div>
              </div>
              <div className="scard">
                <div className="ch"><h3>キャンセルポリシー</h3></div>
                <div className="body">
                  <div className="row"><div className="lbl">無料キャンセル期限</div><div className="ctl"><input className="input short" type="number" defaultValue={24} /> 時間前まで</div></div>
                  <div className="row"><div className="lbl">キャンセル料</div><div className="ctl"><input className="input short" type="number" defaultValue={50} /> %（24時間以内のキャンセル時）</div></div>
                  <div className="row"><div className="lbl">無断キャンセル<small>3回連続でブラックリスト</small></div><div className="ctl"><div className="toggle on" /></div></div>
                  <div className="row"><div className="lbl">ポリシーの注意書き<small>予約フォーム下部に表示</small></div><div className="ctl"><textarea className="textarea" defaultValue="前日24時以降のキャンセル・変更はメニュー料金の50%を頂戴いたします。お時間に変更がある場合はお早めにご連絡ください。" /></div></div>
                </div>
              </div>
              <div className="scard">
                <div className="ch"><h3>リマインド</h3></div>
                <div className="body">
                  <div className="row"><div className="lbl">予約3日前リマインド</div><div className="ctl"><div className="toggle on" /><span className="meta">LINE / メール</span></div></div>
                  <div className="row"><div className="lbl">予約前日リマインド</div><div className="ctl"><div className="toggle on" /><span className="meta">LINE 既読率 +18%</span></div></div>
                  <div className="row"><div className="lbl">来店当日 1時間前</div><div className="ctl"><div className="toggle on" /></div></div>
                  <div className="row"><div className="lbl">アフターケアメッセージ<small>来店翌日に自動送信</small></div><div className="ctl"><div className="toggle" /><span className="meta">テンプレート未設定</span></div></div>
                </div>
              </div>
            </section>
          )}

          {section === 'notify' && (
            <section>
              <div className="page-head">
                <h1>通知</h1>
                <div className="sub">スタッフへの各種通知の配信先。チャネル別に細かく ON / OFF できます。</div>
              </div>
              <div className="scard">
                <div className="body" style={{ padding: 0 }}>
                  <table className="nmx">
                    <thead><tr><th>イベント</th><th>アプリ内</th><th>メール</th><th>LINE WORKS</th><th>Slack</th></tr></thead>
                    <tbody>
                      {NOTIFY_ROWS.map((row) => (
                        <tr key={row.label}>
                          <td className="lbl"><b>{row.label}</b>{row.sub && <small>{row.sub}</small>}</td>
                          {row.on.map((on, i) => (
                            <td key={i}><div className={`toggle${on ? ' on' : ''}`} /></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="scard">
                <div className="ch"><h3>静音時間 / Do Not Disturb</h3></div>
                <div className="body">
                  <div className="row"><div className="lbl">静音時間</div><div className="ctl"><input className="input short" defaultValue="22:00" /> 〜 <input className="input short" defaultValue="08:00" /></div><div className="meta"><div className="toggle on" /></div></div>
                  <div className="row"><div className="lbl">緊急通知のみ通す<small>キャンセル / API 障害</small></div><div className="ctl"><div className="toggle on" /></div></div>
                </div>
              </div>
            </section>
          )}

          {section === 'team' && (
            <section>
              <div className="page-head">
                <h1>チーム / 権限</h1>
                <div className="sub">この店舗にアクセスできるメンバーと、それぞれが扱える機能の範囲。</div>
              </div>
              <div className="scard">
                <div className="ch"><h3>メンバー（{TEAM.length}人）</h3><div className="grow" /><button type="button" className="btn sm btn-primary"><Plus size={12} />招待</button></div>
                <div className="body" style={{ padding: 0 }}>
                  <table className="role-tb">
                    <thead><tr><th>名前</th><th>権限</th><th>担当</th><th>2要素</th><th className="r">最終ログイン</th><th /></tr></thead>
                    <tbody>
                      {TEAM.map((m) => (
                        <tr key={m.email}>
                          <td>
                            <div className="who">
                              <div className="av" style={{ background: m.bg }}>{m.code}</div>
                              <div><b>{m.name}</b><div className="last">{m.email}</div></div>
                            </div>
                          </td>
                          <td><span className={`role-pill ${m.role}`}>{m.roleLabel}</span></td>
                          <td>{m.dept}</td>
                          <td><span className={`status ${m.mfa === 'ok' ? 'ok' : 'warn'}`}>{m.mfa === 'ok' ? '有効' : '未設定'}</span></td>
                          <td className="r last">{m.last}</td>
                          <td className="r"><button type="button" className="btn sm">…</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="scard">
                <div className="ch"><h3>権限マトリクス</h3><div className="grow" /><a style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent-600)' }}>カスタム権限を作成 →</a></div>
                <div className="body" style={{ padding: 0 }}>
                  <table className="nmx">
                    <thead><tr><th>機能</th><th>オーナー</th><th>マネージャー</th><th>スタッフ</th><th>閲覧のみ</th></tr></thead>
                    <tbody>
                      {PERMISSION_ROWS.map((row) => (
                        <tr key={row.label}>
                          <td className="lbl"><b>{row.label}</b></td>
                          {row.vals.map((v, i) => <td key={i}>{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {section === 'billing' && (
            <section>
              <div className="page-head">
                <h1>プラン・請求</h1>
                <div className="sub">現在のプランと利用状況、請求先情報、過去の請求書。</div>
              </div>
              <div className="scard">
                <div className="ch"><h3>現在のプラン</h3><div className="grow" /><button type="button" className="btn sm">プラン比較</button></div>
                <div className="plan">
                  <div>
                    <div className="pname">Plan<b>Salon Pro</b><small>¥19,800 / 月（年間契約 ・ 次回請求 5/15）</small></div>
                    <ul>
                      <li><Check size={12} />無制限の予約・顧客</li>
                      <li><Check size={12} />Instagram + LINE Gate（無制限キャンペーン）</li>
                      <li><Check size={12} />API + Webhook + 分析エクスポート</li>
                      <li><Check size={12} />10 メンバーまで（追加 +¥1,500/人）</li>
                    </ul>
                  </div>
                  <div>
                    <div className="meter">
                      <h6>LINE 配信</h6>
                      <div className="v">1,920<small>/ 3,000 通</small></div>
                      <div className="b"><i style={{ width: '64%' }} /></div>
                    </div>
                    <div className="meter">
                      <h6>SMS リマインド</h6>
                      <div className="v">68<small>/ 100 通</small></div>
                      <div className="b"><i className="warn" style={{ width: '68%' }} /></div>
                    </div>
                    <div className="meter">
                      <h6>ストレージ</h6>
                      <div className="v">2.1<small>/ 10 GB</small></div>
                      <div className="b"><i style={{ width: '21%' }} /></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="scard">
                <div className="ch"><h3>支払い方法</h3><div className="grow" /><button type="button" className="btn sm">追加</button></div>
                <div className="body">
                  <div className="row">
                    <div className="lbl">カード</div>
                    <div className="ctl">
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 34, height: 22, background: 'linear-gradient(135deg,#1d4ed8,#0c4a6e)', borderRadius: 4, color: '#fff', fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center' }}>VISA</div>
                        <span className="mono" style={{ fontSize: 12.5 }}>•••• 4291</span>
                        <span className="meta">有効期限 09/27</span>
                      </div>
                    </div>
                    <div className="meta"><span className="status ok">主要</span></div>
                  </div>
                </div>
              </div>
              <div className="scard">
                <div className="ch"><h3>請求書</h3><div className="grow" /><button type="button" className="btn sm">CSV エクスポート</button></div>
                <div className="body">
                  {[
                    { date: '2025-04-15', no: 'INV-2025-0412', label: '4月分 Salon Pro' },
                    { date: '2025-03-15', no: 'INV-2025-0312', label: '3月分 Salon Pro' },
                    { date: '2025-02-15', no: 'INV-2025-0212', label: '2月分 Salon Pro' }
                  ].map((inv) => (
                    <div key={inv.no} className="row">
                      <div className="lbl">{inv.date}<small>{inv.no}</small></div>
                      <div className="ctl">¥19,800 ・ {inv.label}</div>
                      <div className="meta"><span className="status ok">支払済</span> <button type="button" className="btn sm">PDF</button></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {section === 'danger' && (
            <section>
              <div className="page-head">
                <h1>危険な操作</h1>
                <div className="sub">取り消しできない操作です。実行前にバックアップとチームへの連絡を強く推奨します。</div>
              </div>
              <div className="scard danger">
                <div className="ch"><h3 style={{ color: 'var(--rose)' }}>店舗データのエクスポート</h3></div>
                <div className="body">
                  <div className="row">
                    <div className="lbl">全データ ZIP<small>顧客 / 予約 / 売上 / メッセージ全履歴</small></div>
                    <div className="ctl"><span className="meta">推定容量 1.8GB ・ 生成に約10分</span></div>
                    <div className="meta"><button type="button" className="btn sm">エクスポート開始</button></div>
                  </div>
                </div>
              </div>
              <div className="scard danger">
                <div className="ch"><h3 style={{ color: 'var(--rose)' }}>店舗を一時停止</h3></div>
                <div className="body">
                  <div className="row">
                    <div className="lbl">予約の新規受付を停止</div>
                    <div className="ctl"><span className="meta">既存予約は維持。LINE / IG 公開ページに「営業停止中」を表示します。</span></div>
                    <div className="meta"><button type="button" className="btn sm btn-danger">一時停止</button></div>
                  </div>
                </div>
              </div>
              <div className="scard danger">
                <div className="ch"><h3 style={{ color: 'var(--rose)' }}>店舗を削除</h3></div>
                <div className="body">
                  <div className="row">
                    <div className="lbl">この店舗とすべてのデータを削除</div>
                    <div className="ctl"><span className="meta">30日間は復元可能。それ以降はすべてのデータが完全に削除されます。</span></div>
                    <div className="meta"><button type="button" className="btn sm btn-danger">店舗を削除…</button></div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </AppShell>
  );
}
