'use client';

import './messages.css';
import { useState } from 'react';
import {
  Calendar,
  Filter,
  Image as ImageIcon,
  MoreHorizontal,
  Paperclip,
  PenSquare,
  Search,
  Send,
  Smile,
  Tag,
  User,
  Volume,
  ChevronRight,
  FileText
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';

type ThreadBadge = 'gate' | 'book' | 'urgent' | 'coupon' | 'vip' | 'new';
type ThreadSrc = 'line' | 'ig';

type Thread = {
  id: string;
  name: string;
  initials: string;
  av: string;
  src: ThreadSrc;
  srcL: string;
  preview: string;
  t: string;
  unread: number;
  badges: ThreadBadge[];
  sel?: boolean;
};

const FILTERS: { key: string; label: string; n: number }[] = [
  { key: 'all', label: 'すべて', n: 38 },
  { key: 'unread', label: '未読', n: 12 },
  { key: 'mine', label: '自分の担当', n: 5 },
  { key: 'gate', label: 'Gate 経由', n: 8 },
  { key: 'urgent', label: '要対応', n: 3 }
];

const THREADS: Thread[] = [
  { id: 't1', name: '花田 ななみ', initials: 'HN', av: 'a1', src: 'line', srcL: 'L', preview: 'クーポンありがとうございます！5/8 13:30 で予約…', t: '5分前', unread: 0, badges: ['gate', 'vip'], sel: true },
  { id: 't2', name: '佐藤 みか', initials: 'SM', av: 'a2', src: 'line', srcL: 'L', preview: 'You: 候補日時をお送りしますね', t: '12分前', unread: 2, badges: ['gate', 'new'] },
  { id: 't3', name: '山田 あい', initials: 'YA', av: 'a3', src: 'ig', srcL: 'IG', preview: '同じ髪型にしたいです！詳細教えてください', t: '34分前', unread: 1, badges: ['gate', 'urgent'] },
  { id: 't4', name: '渡辺 結衣', initials: 'WY', av: 'a4', src: 'line', srcL: 'L', preview: '本日はありがとうございました🌸とてもかわいくて…', t: '1時間前', unread: 0, badges: ['book'] },
  { id: 't5', name: '木村 さやか', initials: 'KS', av: 'a5', src: 'line', srcL: 'L', preview: '予約日変更したいのですが…来週どこか空きありますか？', t: '2時間前', unread: 3, badges: ['urgent', 'book'] },
  { id: 't6', name: '高橋 ゆり', initials: 'TY', av: 'a6', src: 'ig', srcL: 'IG', preview: 'リールのトリートメント気になりました', t: '3時間前', unread: 1, badges: ['gate'] },
  { id: 't7', name: '中村 リサ', initials: 'NR', av: 'a7', src: 'line', srcL: 'L', preview: 'You: 当日お会いできるのを楽しみにしております', t: '昨日', unread: 0, badges: ['book', 'coupon'] },
  { id: 't8', name: '鈴木 まり', initials: 'SM', av: 'a2', src: 'ig', srcL: 'IG', preview: 'ブライダルカラーの相談したいです', t: '昨日', unread: 1, badges: ['gate', 'new'] },
  { id: 't9', name: '松本 みゆ', initials: 'MM', av: 'a4', src: 'line', srcL: 'L', preview: 'ありがとうございました！またお願いします', t: '2日前', unread: 0, badges: ['vip', 'book'] },
  { id: 't10', name: '藤田 さくら', initials: 'FS', av: 'a1', src: 'line', srcL: 'L', preview: 'You: クーポンを送付しました', t: '2日前', unread: 0, badges: ['coupon'] }
];

const BADGE_LABEL: Record<ThreadBadge, string> = {
  gate: 'Gate',
  book: '予約',
  urgent: '要対応',
  coupon: 'クーポン',
  vip: 'VIP',
  new: '新規'
};

type Msg =
  | { type: 'sep'; text: string }
  | { type: 'system'; text: string }
  | { type: 'them'; text: string; t: string }
  | { type: 'me'; text: string; t: string; read?: boolean }
  | { type: 'me-card'; card: { title: string; body: string; cta: string[] }; t: string; read?: boolean };

const MESSAGES: Msg[] = [
  { type: 'sep', text: '4月12日（金）' },
  { type: 'system', text: 'Engagement Gate gate_v2 経由で会話開始' },
  { type: 'them', text: 'こんにちは！「春の限定カラー10%OFF」のクーポンを受け取りたいです🌸', t: '14:23' },
  { type: 'me', text: 'ななみさん、ご連絡ありがとうございます🌸 クーポンお送りしますね。', t: '14:25', read: true },
  { type: 'me-card', card: { title: '春の限定カラー 10%OFF', body: 'カラー全メニュー対象 ・ 5/31まで', cta: ['コードをコピー', '予約に進む'] }, t: '14:26', read: true },
  { type: 'them', text: 'ありがとうございます！前回もカラーお願いしたのですが、また YUKI さんで予約取れますか？', t: '14:32' },
  { type: 'me', text: 'もちろんです！ご来店履歴も引き継がれているのでスムーズです。\n候補日時をお送りしますね。', t: '14:35', read: true },
  { type: 'sep', text: '5月2日（土）今日' },
  { type: 'me', text: 'お待たせしました。来週の空き状況です：\n・5/8（木）13:30\n・5/9（金）11:00 / 16:30\n・5/10（土）10:00', t: '10:42', read: true },
  { type: 'them', text: 'クーポンありがとうございます！5/8 13:30 で予約お願いします', t: '5分前' }
];

const QUICK_BTNS: { label: string; icon?: React.ReactNode }[] = [
  { label: 'テンプレ', icon: <FileText size={12} strokeWidth={2.4} /> },
  { label: '承諾✓' },
  { label: '確認中' },
  { label: '候補送信' },
  { label: 'クーポン送付', icon: <Tag size={12} strokeWidth={2.4} /> },
  { label: '予約リンク', icon: <Calendar size={12} strokeWidth={2.4} /> }
];

export default function MessagesPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [composer, setComposer] = useState('');

  return (
    <AppShell>
      <div className="inbox">
        <aside className="list">
          <div className="list-hd">
            <div className="row">
              <h2>
                受信箱 <span className="c">12 未読</span>
              </h2>
              <div className="grow" />
              <button type="button" className="ic-btn" title="新規メッセージ">
                <PenSquare size={14} strokeWidth={2} />
              </button>
              <button type="button" className="ic-btn" title="フィルタ">
                <Filter size={14} strokeWidth={2} />
              </button>
            </div>
            <label className="msgs-search">
              <Search size={13} strokeWidth={2} />
              <input placeholder="名前・メッセージで検索…" />
            </label>
          </div>
          <div className="filters">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`fchip${activeFilter === f.key ? ' active' : ''}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label} <span className="n">{f.n}</span>
              </button>
            ))}
          </div>
          <div className="threads">
            {THREADS.map((t) => (
              <div key={t.id} className={`thr${t.unread > 0 ? ' unread' : ''}${t.sel ? ' sel' : ''}`}>
                <div className={`thr-av ${t.av}`}>
                  {t.initials}
                  <div className={`src ${t.src}`}>{t.srcL}</div>
                </div>
                <div className="thr-mid">
                  <div className="nm">
                    <b>{t.name}</b>
                  </div>
                  <div className="last">{t.preview}</div>
                  <div className="badges">
                    {t.badges.map((b) => (
                      <span key={b} className={`badge-mini ${b}`}>
                        {BADGE_LABEL[b]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="thr-r">
                  <span className="t">{t.t}</span>
                  {t.unread > 0 && <span className="unr">{t.unread}</span>}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="thread">
          <div className="thread-hd">
            <div className="thread-av">
              HN
              <div className="src">L</div>
            </div>
            <div className="thread-info">
              <div className="nm">
                花田 ななみ <span className="vip-tag">VIP</span>
              </div>
              <div className="meta">
                <span>
                  <span className="dot" />
                  オンライン
                </span>
                <span>LINE</span>
                <code>friend_U7a3…f29</code>
                <span>
                  リンク済み: <b style={{ color: '#334155' }}>@hana_____01</b>
                </span>
              </div>
            </div>
            <div className="thread-actions">
              <button type="button" className="ic-btn" title="予約を作成">
                <Calendar size={14} strokeWidth={2} />
              </button>
              <button type="button" className="ic-btn" title="プロフィール">
                <User size={14} strokeWidth={2} />
              </button>
              <button type="button" className="ic-btn" title="その他">
                <MoreHorizontal size={14} strokeWidth={2.4} />
              </button>
            </div>
          </div>

          <div className="source-banner">
            <span className="ic">
              <Filter size={13} strokeWidth={2.2} />
            </span>
            <span>
              Gate 経由 ・ <b>春の限定カラー10%OFF</b>
              <code>gate_v2</code> 投稿に「予約」コメントから流入（4/12 14:23）
            </span>
            <span className="grow" />
            <a>キャンペーンを見る →</a>
          </div>

          <div className="messages-area">
            {MESSAGES.map((m, i) => {
              if (m.type === 'sep') return <div key={i} className="day-sep">{m.text}</div>;
              if (m.type === 'system') return <div key={i} className="bub system">{m.text}</div>;
              if (m.type === 'me-card') {
                return (
                  <div key={i} className="row-msg me">
                    <div className="bub bub-card me" style={{ padding: 0 }}>
                      <div className="img">{m.card.title}</div>
                      <div className="body">
                        <b>{m.card.body}</b>
                        <small>タップでクーポン詳細を表示</small>
                      </div>
                      <div className="cta">
                        {m.card.cta.map((c) => (
                          <a key={c}>{c}</a>
                        ))}
                      </div>
                    </div>
                    <div className="meta">
                      {m.t}
                      {m.read && <span className="read">既読</span>}
                    </div>
                  </div>
                );
              }
              const me = m.type === 'me';
              return (
                <div key={i} className={`row-msg${me ? ' me' : ''}`}>
                  {!me && <div className="av">HN</div>}
                  <div className={`bub ${me ? 'me' : 'them'}`}>{m.text}</div>
                  <div className="meta">
                    {m.t}
                    {me && m.read && <span className="read">既読</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="quick">
            <span className="label">クイック</span>
            {QUICK_BTNS.map((b) => (
              <button key={b.label} type="button" className="qbtn">
                {b.icon}
                {b.label}
              </button>
            ))}
          </div>

          <div className="composer">
            <div className="composer-row">
              <button type="button" className="ctool" title="絵文字">
                <Smile size={18} strokeWidth={2} />
              </button>
              <button type="button" className="ctool" title="画像">
                <ImageIcon size={18} strokeWidth={2} />
              </button>
              <button type="button" className="ctool" title="添付">
                <Paperclip size={18} strokeWidth={2} />
              </button>
              <textarea
                placeholder="メッセージを入力…  Enter で送信、Shift+Enter で改行"
                rows={1}
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
              />
              <button type="button" className="ctool send" disabled={composer.trim().length === 0}>
                <Send size={16} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </section>

        <aside className="ctx">
          <div className="ctx-hd">
            <h3>顧客情報</h3>
            <button type="button" className="ic-btn">
              <MoreHorizontal size={13} strokeWidth={2.4} />
            </button>
          </div>
          <div className="ctx-section">
            <div className="ctx-card">
              <div className="av">HN</div>
              <div className="nm">
                <b>花田 ななみ</b>
                <small>uuid: c_8f3a2…d09</small>
              </div>
            </div>
            <div className="ctx-stat">
              <div className="it">
                <div className="k">来店</div>
                <div className="v">
                  7<small>回</small>
                </div>
              </div>
              <div className="it">
                <div className="k">累計</div>
                <div className="v">¥68,400</div>
              </div>
              <div className="it">
                <div className="k">指名</div>
                <div className="v">YUKI</div>
              </div>
              <div className="it">
                <div className="k">最終来店</div>
                <div className="v">
                  42<small>日前</small>
                </div>
              </div>
            </div>
          </div>

          <div className="ctx-section">
            <h4>次回予約</h4>
            <div className="next-book">
              <div className="top">
                <span>確定済み</span>
                <span style={{ fontSize: 10 }}>確認済 ✓</span>
              </div>
              <div className="when">2026-05-08（木）13:30</div>
              <div className="menu">カラー＋トリートメント ・ YUKI 担当</div>
            </div>
          </div>

          <div className="ctx-section">
            <h4>identity 結合</h4>
            <div className="ctx-list">
              <div className="it">
                <span className="dt p" />
                <div className="nm">
                  <b>Instagram</b>
                  <small>@hana_____01 ・ 4/12 14:23 結合</small>
                </div>
              </div>
              <div className="it">
                <span className="dt" />
                <div className="nm">
                  <b>LINE</b>
                  <small>friend_U7a3…f29 ・ 4/12 14:25 結合</small>
                </div>
              </div>
              <div className="it">
                <span className="dt b" />
                <div className="nm">
                  <b>来店履歴</b>
                  <small>会員ID 1042 ・ 2024 年から</small>
                </div>
              </div>
            </div>
          </div>

          <div className="ctx-section">
            <h4>最近のアクティビティ</h4>
            <div className="ctx-list">
              <div className="it">
                <span className="dt" />
                <div className="nm">
                  <b>LINE 返信</b>
                  <small>5分前 ・ 担当 YUKI</small>
                </div>
              </div>
              <div className="it">
                <span className="dt p" />
                <div className="nm">
                  <b>Gate 経由でDM受信</b>
                  <small>4/12 ・ gate_v2 / 春の限定カラー</small>
                </div>
              </div>
              <div className="it">
                <span className="dt a" />
                <div className="nm">
                  <b>クーポン引換</b>
                  <small>4/12 ・ 春10%OFF</small>
                </div>
              </div>
              <div className="it">
                <span className="dt b" />
                <div className="nm">
                  <b>来店</b>
                  <small>3/27 ・ カラー＋カット ・ ¥9,800</small>
                </div>
              </div>
            </div>
          </div>

          <div className="ctx-section">
            <h4>タグ</h4>
            <div className="ctx-tags">
              <span className="tg">VIP</span>
              <span className="tg">カラー定期</span>
              <span className="tg">YUKI 指名</span>
              <span className="tg">IG経由</span>
              <span className="tg add">+ 追加</span>
            </div>
          </div>

          <div className="ctx-section" style={{ borderBottom: 0 }}>
            <a className="ctx-link">
              <span>顧客タイムラインを見る</span>
              <ChevronRight size={12} strokeWidth={2} />
            </a>
            <a className="ctx-link">
              <span>分析でこの顧客を絞り込む</span>
              <ChevronRight size={12} strokeWidth={2} />
            </a>
            <a className="ctx-link" style={{ color: 'var(--rose)' }}>
              <span>このスレッドをミュート</span>
              <Volume size={12} strokeWidth={2} />
            </a>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
