import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Check, ChevronRight, Clock, MapPin, Scissors, Search, Sparkles, Store, Tags, UserRound } from 'lucide-react';
import { fetchApi, friendlyApiError } from './lib/api';
import './style.css';

type Salon = { id: string; name: string; theme_color: string | null };
type Stylist = { id: string; name: string; display_name: string | null; bio: string | null; specialties: string | null };
type Menu = { id: string; name: string; category: string; duration_min: number; price: number; description: string | null };
type Coupon = { id: string; code: string; name: string; type: string; value: number; applicable_menu_ids: string | null };
type Slot = { start_at: string; end_at: string };
type Step = 'salon' | 'stylist' | 'style' | 'menu' | 'datetime' | 'confirm' | 'done' | 'history';

const styleChoices = ['お任せ', '似合わせカット', '透明感カラー', '髪質改善', '縮毛矯正', 'メンテナンス'];
const fixedSalonId = initialSalonId();

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
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [salonQuery, setSalonQuery] = useState('');
  const [nearMe, setNearMe] = useState(false);
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

  const selectedMenus = useMemo(() => menus.filter((m) => selectedMenuIds.includes(m.id)), [menus, selectedMenuIds]);
  const total = selectedMenus.reduce((sum, menu) => sum + menu.price, 0);
  const duration = selectedMenus.reduce((sum, menu) => sum + menu.duration_min, 0);
  const filteredSalons = useMemo(() => {
    const q = salonQuery.trim().toLowerCase();
    return salons.filter((s) => !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [salons, salonQuery]);

  function move(next: Step) {
    setStep(next);
    setError('');
  }

  function selectSalon(nextSalon: Salon) {
    setSalon(nextSalon);
    setStylist(null);
    setMenus([]);
    setSelectedMenuIds([]);
    setCoupons([]);
    setAppliedCoupon(null);
    setSlot(null);
    move('stylist');
  }

  function goBack() {
    if (step === 'stylist') {
      if (!fixedSalonId) move('salon');
      return;
    }
    if (step === 'style') move('stylist');
    if (step === 'menu') move('style');
    if (step === 'datetime') move('menu');
    if (step === 'confirm') move('datetime');
    if (step === 'history') move(salon ? 'stylist' : 'salon');
  }

  function goNext() {
    if (step === 'salon') {
      if (!salon) setError('サロンを選択してください。');
      else move('stylist');
    }
    if (step === 'stylist') {
      if (!stylist) setError('スタイリストを選択してください。');
      else move('style');
    }
    if (step === 'style') {
      if (!hairStyle) setError('希望のヘアスタイルを選択してください。');
      else move('menu');
    }
    if (step === 'menu') {
      if (selectedMenuIds.length === 0) setError('メニューを選択してください。');
      else move('datetime');
    }
    if (step === 'datetime') {
      if (!slot) setError('予約時間を選択してください。');
      else move('confirm');
    }
  }

  useEffect(() => {
    fetchApi<Salon[]>('/api/salons').then((items) => {
      setSalons(items);
      const selected = items.find((x) => x.id === fixedSalonId) ?? null;
      if (selected) {
        setSalon(selected);
        setStep('stylist');
      } else if (items.length === 1 && fixedSalonId) {
        setSalon(items[0]!);
        setStep('stylist');
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

  useEffect(() => {
    if (step === 'datetime' && stylist && selectedMenuIds.length > 0 && slots.length === 0) {
      void loadSlots(date);
    }
  }, [step]);

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
      move('done');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  return (
    <main className="app">
      <header className="top">
        <div>
          <strong>{salon?.name ?? 'Salon Harness'}</strong>
          <span>{step === 'salon' ? '登録サロンを探す' : stylist?.display_name ?? stylist?.name ?? '予約'}</span>
        </div>
        <button className="ghost" onClick={() => move('history')}>履歴</button>
      </header>
      {error && <p className="error">{error}</p>}

      {step === 'salon' && (
        <section>
          <h1>サロンを探す</h1>
          <div className="searchbar">
            <Search size={18} />
            <input value={salonQuery} onChange={(e) => setSalonQuery(e.target.value)} placeholder="エリア・サロン名で検索" />
          </div>
          <button className={`wide ${nearMe ? 'selected' : ''}`} onClick={() => setNearMe((v) => !v)}>
            <MapPin size={18} />
            <span>{nearMe ? '現在地周辺を優先中' : '家や現在地の近くから探す'}</span>
          </button>
          {salons.length === 0 && !error && <p className="notice">現在予約できるサロンがありません。</p>}
          <div className="list">
            {filteredSalons.map((s) => (
              <button className={`row ${salon?.id === s.id ? 'selected' : ''}`} key={s.id} onClick={() => selectSalon(s)}>
                <Store size={22} />
                <span><strong>{s.name}</strong><small>{nearMe ? '現在地周辺の登録サロン' : `/s/${s.id}`}</small></span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
          <p className="notice">LINEからはサロン専用URLで直接予約に進めます。</p>
        </section>
      )}

      {step === 'stylist' && (
        <section>
          <h1>スタイリストを選択</h1>
          {stylists.length === 0 && !error && <p className="notice">現在予約できるスタイリストが登録されていません。</p>}
          <div className="list">
            {stylists.map((s) => (
              <button className={`row ${stylist?.id === s.id ? 'selected' : ''}`} key={s.id} onClick={() => setStylist(s)}>
                <UserRound size={22} />
                <span><strong>{s.display_name ?? s.name}</strong><small>{s.bio}</small></span>
                {stylist?.id === s.id ? <Check size={18} /> : <ChevronRight size={18} />}
              </button>
            ))}
          </div>
          <FlowBar label={stylist ? stylist.display_name ?? stylist.name : '未選択'} backDisabled={Boolean(fixedSalonId)} onBack={goBack} onNext={goNext} nextDisabled={!stylist} />
        </section>
      )}

      {step === 'style' && (
        <section>
          <h1>ヘアスタイルを選択</h1>
          <div className="chips">
            {styleChoices.map((choice) => (
              <button className={hairStyle === choice ? 'active' : ''} key={choice} onClick={() => setHairStyle(choice)}>{choice}</button>
            ))}
          </div>
          <FlowBar label={hairStyle || '未選択'} onBack={goBack} onNext={goNext} nextDisabled={!hairStyle} />
        </section>
      )}

      {step === 'menu' && (
        <section>
          <h1>メニューとクーポン</h1>
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
          <FlowBar label={`${duration}分 / ¥${total.toLocaleString('ja-JP')}`} onBack={goBack} onNext={goNext} nextDisabled={selectedMenuIds.length === 0} />
        </section>
      )}

      {step === 'datetime' && (
        <section>
          <h1>希望日と時間</h1>
          <div className="datechips">
            {dateOptions().map((d) => <button className={date === d ? 'active' : ''} key={d} onClick={() => void loadSlots(d)}>{formatDateLabel(d)}</button>)}
          </div>
          <div className="datebar"><CalendarDays size={18} /><input type="date" value={date} onChange={(e) => void loadSlots(e.target.value)} /><button onClick={() => void loadSlots(date)}>候補</button></div>
          <div className="slots">
            {slots.map((s) => <button className={slot?.start_at === s.start_at ? 'active' : ''} key={s.start_at} onClick={() => setSlot(s)}><Clock size={15} />{s.start_at.slice(11, 16)}</button>)}
          </div>
          <FlowBar label={slot ? slot.start_at : '時間を選択'} onBack={goBack} onNext={goNext} nextDisabled={!slot} nextText="確認へ" />
        </section>
      )}

      {step === 'confirm' && (
        <section>
          <h1>予約内容の確認</h1>
          <div className="summary">
            <div><span>サロン</span><strong>{salon?.name}</strong></div>
            <div><span>スタイリスト</span><strong>{stylist?.display_name ?? stylist?.name}</strong></div>
            <div><span>希望スタイル</span><strong>{hairStyle}</strong></div>
            {selectedMenus.map((m) => <div key={m.id}><span>{m.name}</span><strong>¥{m.price.toLocaleString('ja-JP')}</strong></div>)}
            {appliedCoupon && <div className="discount"><span>{appliedCoupon.name}</span><strong>{appliedCoupon.code}</strong></div>}
            <div><span>来店日時</span><strong>{slot?.start_at}</strong></div>
            <div><span>合計</span><strong>¥{total.toLocaleString('ja-JP')} / {duration}分</strong></div>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="ご要望" rows={4} />
          <FlowBar label="内容を確認してください" onBack={goBack} onNext={createReservation} nextDisabled={!slot} nextText="予約を確定" />
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

      {step === 'history' && <History onBack={goBack} />}
    </main>
  );
}

function FlowBar({
  label,
  backDisabled = false,
  nextDisabled,
  onBack,
  onNext,
  nextText = '進む'
}: {
  label: string;
  backDisabled?: boolean;
  nextDisabled: boolean;
  onBack: () => void;
  onNext: () => void;
  nextText?: string;
}) {
  return (
    <div className="bottom flow">
      <button className="back" disabled={backDisabled} onClick={onBack}>戻る</button>
      <span>{label}</span>
      <button disabled={nextDisabled} onClick={onNext}>{nextText}</button>
    </div>
  );
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
