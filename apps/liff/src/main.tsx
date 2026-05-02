import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Scissors, Sparkles, Store, Tags, UserRound } from 'lucide-react';
import { fetchApi, friendlyApiError } from './lib/api';
import './style.css';

type Salon = { id: string; name: string; theme_color: string | null };
type Stylist = { id: string; name: string; display_name: string | null; bio: string | null; specialties: string | null };
type Menu = { id: string; name: string; category: string; duration_min: number; price: number; description: string | null };
type Coupon = { id: string; code: string; name: string; type: string; value: number; applicable_menu_ids: string | null };
type Slot = { start_at: string; end_at: string };
type Step = 'salon' | 'plan' | 'stylist' | 'style' | 'menu' | 'datetime' | 'confirm' | 'done' | 'history';

const styleChoices = [
  'お任せ',
  '似合わせカット',
  '透明感カラー',
  '髪質改善',
  '縮毛矯正',
  'メンテナンス'
];

function params() {
  return new URLSearchParams(location.search);
}

function initialSalonId() {
  const pathMatch = location.pathname.match(/^\/s\/([^/]+)/);
  return pathMatch?.[1] ?? params().get('salon') ?? '';
}

function friendId() {
  return params().get('friend_id') ?? 'preview_friend';
}

function formatDateLabel(date: string) {
  const d = new Date(`${date}T00:00:00+09:00`);
  return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(d);
}

function dateOptions() {
  const today = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function App() {
  const [step, setStep] = useState<Step>('salon');
  const [history, setHistory] = useState<Step[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [stylist, setStylist] = useState<Stylist | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState(params().get('coupon') ?? '');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [hairStyle, setHairStyle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [note, setNote] = useState('');
  const [reservation, setReservation] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  function go(next: Step) {
    setHistory((prev) => [...prev, step]);
    setStep(next);
    setError('');
  }

  function back() {
    const prev = history.at(-1);
    if (!prev) return;
    setHistory((xs) => xs.slice(0, -1));
    setStep(prev);
    setError('');
  }

  useEffect(() => {
    fetchApi<Salon[]>('/api/salons').then((items) => {
      setSalons(items);
      const requested = initialSalonId();
      const selected = items.find((x) => x.id === requested) ?? (items.length === 1 ? items[0] : null);
      if (selected) {
        setSalon(selected);
        setStep('plan');
      }
    }).catch((err) => setError(friendlyApiError(err)));
  }, []);

  useEffect(() => {
    if (!salon) return;
    fetchApi<Stylist[]>(`/api/stylists?salon_id=${encodeURIComponent(salon.id)}`)
      .then((items) => {
        setStylists(items);
        if (items.length === 1) setStylist(items[0]!);
      })
      .catch((err) => setError(friendlyApiError(err)));
  }, [salon]);

  useEffect(() => {
    if (!stylist) return;
    void Promise.all([
      fetchApi<Menu[]>(`/api/menus?stylist_id=${stylist.id}`).then(setMenus),
      fetchApi<Coupon[]>(`/api/coupons?stylist_id=${stylist.id}&friend_id=${friendId()}`).then(setCoupons).catch(() => setCoupons([]))
    ]);
  }, [stylist]);

  useEffect(() => {
    setSlots([]);
    setSlot(null);
  }, [date, selectedMenuIds.join(','), stylist?.id]);

  const selectedMenus = useMemo(() => menus.filter((m) => selectedMenuIds.includes(m.id)), [menus, selectedMenuIds]);
  const total = selectedMenus.reduce((sum, menu) => sum + menu.price, 0);
  const duration = selectedMenus.reduce((sum, menu) => sum + menu.duration_min, 0);
  const discountHint = appliedCoupon ? `${appliedCoupon.name} (${appliedCoupon.code})` : '未適用';

  async function applyCoupon(code = couponCode) {
    if (!stylist || !code) {
      setError('先にスタイリストを選択してください。');
      return;
    }
    try {
      const result = await fetchApi<{ valid: boolean; coupon?: Coupon; message?: string }>(`/api/coupons/code/${encodeURIComponent(code)}?stylist_id=${stylist.id}&friend_id=${friendId()}`);
      if (!result.valid || !result.coupon) {
        setError(result.message ?? 'このクーポンは利用できません。コードをご確認ください。');
        return;
      }
      setAppliedCoupon(result.coupon);
      const targetIds = result.coupon.applicable_menu_ids ? JSON.parse(result.coupon.applicable_menu_ids) as string[] : [];
      if (targetIds.length > 0) setSelectedMenuIds((prev) => Array.from(new Set([...prev, ...targetIds])));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function loadSlots(chosenDate = date) {
    if (!stylist || selectedMenuIds.length === 0) {
      setError('スタイリストとメニューを選んでください。');
      return;
    }
    try {
      setDate(chosenDate);
      const data = await fetchApi<{ available_slots: Slot[] }>(`/api/reservations/availability?stylist_id=${stylist.id}&date=${chosenDate}&menu_ids=${selectedMenuIds.join(',')}`);
      setSlots(data.available_slots);
      setError(data.available_slots.length === 0 ? 'この日は予約できる時間がありません。別の日付を選んでください。' : '');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createReservation() {
    if (!stylist || !slot) return;
    try {
      const data = await fetchApi<Record<string, unknown>>('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({
          stylist_id: stylist.id,
          friend_id: friendId(),
          menu_ids: selectedMenuIds,
          start_at: slot.start_at,
          customer_note: [hairStyle ? `希望スタイル: ${hairStyle}` : '', note].filter(Boolean).join('\n'),
          coupon_code: appliedCoupon?.code
        })
      });
      setReservation(data);
      go('done');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  return (
    <main className="app">
      <header className="top">
        <button className="iconbtn" onClick={back} disabled={history.length === 0 || step === 'done'} aria-label="戻る">
          <ChevronLeft size={20} />
        </button>
        <div>
          <strong>{salon?.name ?? 'Salon Harness'}</strong>
          <span>{stylist?.display_name ?? stylist?.name ?? hairStyle}</span>
        </div>
        <button className="ghost" onClick={() => go('history')}>履歴</button>
      </header>
      {error && <p className="error">{error}</p>}

      {step === 'salon' && (
        <section>
          <h1>サロンを選択</h1>
          {salons.length === 0 && !error && <p className="notice">現在予約できるサロンがありません。</p>}
          <div className="list">
            {salons.map((s) => (
              <button className="row" key={s.id} onClick={() => { setSalon(s); go('plan'); }}>
                <Store size={22} />
                <span><strong>{s.name}</strong><small>{s.id}</small></span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'plan' && (
        <section>
          <h1>予約内容を選択</h1>
          <div className="coupon">
            <Tags size={18} />
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="クーポンコード" />
            <button onClick={() => applyCoupon()}>適用</button>
          </div>
          <div className="grid-actions">
            <button onClick={() => go('stylist')}><UserRound size={22} /><span>スタイリスト</span><small>{stylist ? stylist.display_name ?? stylist.name : '選択する'}</small></button>
            <button onClick={() => go('style')}><Sparkles size={22} /><span>ヘアスタイル</span><small>{hairStyle || '希望を選ぶ'}</small></button>
            <button onClick={() => go('menu')}><Scissors size={22} /><span>メニュー</span><small>{selectedMenus.length ? `${selectedMenus.length}件 / ${duration}分` : '選択する'}</small></button>
            <button onClick={() => go('datetime')}><CalendarDays size={22} /><span>日付と時間</span><small>{slot ? slot.start_at : '候補を見る'}</small></button>
          </div>
          <BottomBar label={`クーポン: ${discountHint}`} disabled={!stylist || selectedMenuIds.length === 0} onClick={() => go('datetime')} text="日程へ" />
        </section>
      )}

      {step === 'stylist' && (
        <section>
          <h1>スタイリスト選択</h1>
          {stylists.length === 0 && !error && <p className="notice">現在予約できるスタイリストが登録されていません。</p>}
          <div className="list">
            {stylists.map((s) => (
              <button className={`row ${stylist?.id === s.id ? 'selected' : ''}`} key={s.id} onClick={() => { setStylist(s); go('plan'); }}>
                <UserRound size={22} />
                <span><strong>{s.display_name ?? s.name}</strong><small>{s.bio}</small></span>
                {stylist?.id === s.id ? <Check size={18} /> : <ChevronRight size={18} />}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'style' && (
        <section>
          <h1>ヘアスタイル選択</h1>
          <div className="chips">
            {styleChoices.map((choice) => (
              <button className={hairStyle === choice ? 'active' : ''} key={choice} onClick={() => { setHairStyle(choice); go('plan'); }}>{choice}</button>
            ))}
          </div>
        </section>
      )}

      {step === 'menu' && (
        <section>
          <h1>メニュー選択</h1>
          {!stylist && <p className="notice">先にスタイリストを選択してください。</p>}
          <div className="list">
            {coupons.map((c) => <button className="chip" key={c.id} onClick={() => { setCouponCode(c.code); void applyCoupon(c.code); }}>{c.name}</button>)}
            {menus.map((m) => {
              const checked = selectedMenuIds.includes(m.id);
              return (
                <button className={`row ${checked ? 'selected' : ''}`} key={m.id} onClick={() => setSelectedMenuIds((prev) => checked ? prev.filter((id) => id !== m.id) : [...prev, m.id])}>
                  <Scissors size={22} />
                  <span><strong>{m.name}</strong><small>{m.duration_min}分 / ¥{m.price.toLocaleString('ja-JP')}</small></span>
                  {checked && <Check size={18} />}
                </button>
              );
            })}
          </div>
          <BottomBar label={`${duration}分 / ¥${total.toLocaleString('ja-JP')}`} disabled={selectedMenuIds.length === 0} onClick={() => go('plan')} text="決定" />
        </section>
      )}

      {step === 'datetime' && (
        <section>
          <h1>希望日を選択</h1>
          <div className="datechips">
            {dateOptions().map((d) => <button className={date === d ? 'active' : ''} key={d} onClick={() => loadSlots(d)}>{formatDateLabel(d)}</button>)}
          </div>
          <div className="datebar"><CalendarDays size={18} /><input type="date" value={date} onChange={(e) => void loadSlots(e.target.value)} /><button onClick={() => loadSlots(date)}>候補</button></div>
          <div className="slots">
            {slots.map((s) => <button className={slot?.start_at === s.start_at ? 'active' : ''} key={s.start_at} onClick={() => setSlot(s)}><Clock size={15} />{s.start_at.slice(11, 16)}</button>)}
          </div>
          <BottomBar label={slot ? slot.start_at : '時間を選択'} disabled={!slot} onClick={() => go('confirm')} text="確認へ" />
        </section>
      )}

      {step === 'confirm' && (
        <section>
          <h1>予約内容の確認</h1>
          <div className="summary">
            <div><span>サロン</span><strong>{salon?.name}</strong></div>
            <div><span>スタイリスト</span><strong>{stylist?.display_name ?? stylist?.name}</strong></div>
            <div><span>希望スタイル</span><strong>{hairStyle || '未選択'}</strong></div>
            {selectedMenus.map((m) => <div key={m.id}><span>{m.name}</span><strong>¥{m.price.toLocaleString('ja-JP')}</strong></div>)}
            {appliedCoupon && <div className="discount"><span>{appliedCoupon.name}</span><strong>{appliedCoupon.code}</strong></div>}
            <div><span>来店日時</span><strong>{slot?.start_at}</strong></div>
            <div><span>合計</span><strong>¥{total.toLocaleString('ja-JP')} / {duration}分</strong></div>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="ご要望" rows={4} />
          <BottomBar label="内容を確認してください" disabled={!slot} onClick={createReservation} text="予約を確定" />
        </section>
      )}

      {step === 'done' && (
        <section className="done">
          <div className="mark"><Check size={42} /></div>
          <h1>予約完了</h1>
          <p>{String(reservation?.start_at ?? slot?.start_at)}</p>
          <button onClick={() => window.close()}>閉じる</button>
        </section>
      )}

      {step === 'history' && <History onBack={back} />}
    </main>
  );
}

function BottomBar({ label, disabled, onClick, text = '次へ' }: { label: string; disabled: boolean; onClick: () => void; text?: string }) {
  return <div className="bottom"><span>{label}</span><button disabled={disabled} onClick={onClick}>{text}</button></div>;
}

function History({ onBack }: { onBack: () => void }) {
  return (
    <section>
      <h1>予約履歴</h1>
      <p className="notice">予約履歴の詳細表示は次の実装で接続します。</p>
      <button className="ghost" onClick={onBack}>戻る</button>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
