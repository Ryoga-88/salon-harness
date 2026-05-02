import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Check, ChevronRight, Clock, Scissors, Tags, UserRound } from 'lucide-react';
import { fetchApi, friendlyApiError } from './lib/api';
import './style.css';

type Stylist = { id: string; name: string; display_name: string | null; bio: string | null; specialties: string | null };
type Menu = { id: string; name: string; category: string; duration_min: number; price: number; description: string | null };
type Coupon = { id: string; code: string; name: string; type: string; value: number; applicable_menu_ids: string | null };
type Slot = { start_at: string; end_at: string };

function friendId() {
  return new URLSearchParams(location.search).get('friend_id') ?? 'preview_friend';
}

function App() {
  const [step, setStep] = useState<'stylist' | 'menu' | 'datetime' | 'confirm' | 'done' | 'history'>('stylist');
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [stylist, setStylist] = useState<Stylist | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState(new URLSearchParams(location.search).get('coupon') ?? '');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [note, setNote] = useState('');
  const [reservation, setReservation] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApi<Stylist[]>('/api/stylists').then((items) => {
      setStylists(items);
      if (items.length === 1) {
        setStylist(items[0]!);
        setStep('menu');
      }
    }).catch((err) => setError(friendlyApiError(err)));
  }, []);

  useEffect(() => {
    if (!stylist) return;
    void Promise.all([
      fetchApi<Menu[]>(`/api/menus?stylist_id=${stylist.id}`).then(setMenus),
      fetchApi<Coupon[]>(`/api/coupons?stylist_id=${stylist.id}&friend_id=${friendId()}`).then(setCoupons).catch(() => setCoupons([]))
    ]);
  }, [stylist]);

  const selectedMenus = useMemo(() => menus.filter((m) => selectedMenuIds.includes(m.id)), [menus, selectedMenuIds]);
  const total = selectedMenus.reduce((sum, menu) => sum + menu.price, 0);
  const duration = selectedMenus.reduce((sum, menu) => sum + menu.duration_min, 0);

  async function applyCoupon(code = couponCode) {
    if (!stylist || !code) return;
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

  async function loadSlots() {
    if (!stylist || selectedMenuIds.length === 0) return;
    try {
      const data = await fetchApi<{ available_slots: Slot[] }>(`/api/reservations/availability?stylist_id=${stylist.id}&date=${date}&menu_ids=${selectedMenuIds.join(',')}`);
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
          customer_note: note,
          coupon_code: appliedCoupon?.code
        })
      });
      setReservation(data);
      setStep('done');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  return (
    <main className="app">
      <header className="top">
        <div>
          <strong>Salon Harness</strong>
          <span>{stylist?.display_name ?? stylist?.name ?? ''}</span>
        </div>
        <button className="ghost" onClick={() => setStep('history')}>履歴</button>
      </header>
      {error && <p className="error">{error}</p>}

      {step === 'stylist' && (
        <section>
          <h1>スタイリスト選択</h1>
          {stylists.length === 0 && !error && <p className="notice">現在予約できるスタイリストが登録されていません。</p>}
          <div className="list">
            {stylists.map((s) => (
              <button className="row" key={s.id} onClick={() => { setStylist(s); setStep('menu'); }}>
                <UserRound size={22} />
                <span><strong>{s.display_name ?? s.name}</strong><small>{s.bio}</small></span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'menu' && (
        <section>
          <h1>メニュー選択</h1>
          <div className="coupon">
            <Tags size={18} />
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="クーポンコード" />
            <button onClick={() => applyCoupon()}>適用</button>
          </div>
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
          <BottomBar label={`${duration}分 / ¥${total.toLocaleString('ja-JP')}`} disabled={selectedMenuIds.length === 0} onClick={() => setStep('datetime')} />
        </section>
      )}

      {step === 'datetime' && (
        <section>
          <h1>日時選択</h1>
          <div className="datebar"><CalendarDays size={18} /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /><button onClick={loadSlots}>検索</button></div>
          <div className="slots">
            {slots.map((s) => <button className={slot?.start_at === s.start_at ? 'active' : ''} key={s.start_at} onClick={() => setSlot(s)}><Clock size={15} />{s.start_at.slice(11, 16)}</button>)}
          </div>
          <BottomBar label={slot ? slot.start_at : '日時を選択'} disabled={!slot} onClick={() => setStep('confirm')} />
        </section>
      )}

      {step === 'confirm' && (
        <section>
          <h1>予約確認</h1>
          <div className="summary">
            {selectedMenus.map((m) => <div key={m.id}><span>{m.name}</span><span>¥{m.price.toLocaleString('ja-JP')}</span></div>)}
            {appliedCoupon && <div className="discount"><span>{appliedCoupon.name}</span><span>{appliedCoupon.code}</span></div>}
            <div><strong>来店日時</strong><strong>{slot?.start_at}</strong></div>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="ご要望" rows={4} />
          <BottomBar label="予約を確定する" disabled={!slot} onClick={createReservation} />
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

      {step === 'history' && <History onBack={() => setStep(stylist ? 'menu' : 'stylist')} />}
    </main>
  );
}

function BottomBar({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return <div className="bottom"><span>{label}</span><button disabled={disabled} onClick={onClick}>次へ</button></div>;
}

function History({ onBack }: { onBack: () => void }) {
  return (
    <section>
      <h1>予約履歴</h1>
      <button className="ghost" onClick={onBack}>戻る</button>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
