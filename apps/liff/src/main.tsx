import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Check, ChevronRight, Clock, MapPin, Scissors, Search, Sparkles, Store, Tags, UserRound } from 'lucide-react';
import { fetchApi, friendlyApiError } from './lib/api';
import './style.css';

type Salon = { id: string; name: string; theme_color: string | null };
type Stylist = { id: string; name: string; display_name: string | null; bio: string | null; specialties: string | null };
type Menu = { id: string; name: string; category: string; duration_min: number; price: number; description: string | null };
type Coupon = { id: string; code: string; name: string; type: string; value: number; applicable_menu_ids: string | null };
type Slot = { start_at: string; end_at: string; stylist_id: string; stylist_name: string };
type Step = 'salon' | 'plan' | 'stylist' | 'style' | 'menu' | 'datetime' | 'confirm' | 'done' | 'history';

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
  const canConfirm = Boolean(slot);
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
    setHairStyle('');
    setSlot(null);
    move('plan');
  }

  function chooseStylist(nextStylist: Stylist) {
    setStylist(nextStylist);
    setSelectedMenuIds([]);
    setAppliedCoupon(null);
    setCouponCode('');
    setSlot(null);
    setSlots([]);
  }

  function goBack() {
    if (step === 'plan') {
      if (!fixedSalonId) move('salon');
      return;
    }
    if (step === 'stylist') {
      move('plan');
      return;
    }
    if (step === 'style') move('plan');
    if (step === 'menu') move('plan');
    if (step === 'datetime') move('plan');
    if (step === 'confirm') move('datetime');
    if (step === 'history') move(salon ? 'plan' : 'salon');
  }

  function goNext() {
    if (step === 'salon') {
      if (!salon) setError('サロンを選択してください。');
      else move('plan');
    }
    if (step === 'plan') {
      if (!slot) move('datetime');
      else move('confirm');
    }
    if (step === 'stylist') {
      if (!stylist) setError('スタイリストを選択してください。');
      else move('plan');
    }
    if (step === 'style') {
      move('plan');
    }
    if (step === 'menu') {
      if (selectedMenuIds.length === 0) setError('メニューを選択してください。');
      else move('plan');
    }
    if (step === 'datetime') move('plan');
  }

  useEffect(() => {
    fetchApi<Salon[]>('/api/salons').then((items) => {
      setSalons(items);
      const selected = items.find((x) => x.id === fixedSalonId) ?? null;
      if (selected) {
        setSalon(selected);
        setStep('plan');
      } else if (items.length === 1 && fixedSalonId) {
        setSalon(items[0]!);
        setStep('plan');
      }
    }).catch((err) => setError(friendlyApiError(err)));
  }, []);

  useEffect(() => {
    if (!salon) return;
    void fetchApi<Menu[]>(`/api/menus?salon_id=${encodeURIComponent(salon.id)}`).then(setMenus).catch(() => setMenus([]));
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
    if (step === 'datetime' && salon && slots.length === 0) {
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
    setDate(chosenDate);
    if (!salon) {
      setSlots([]);
      setSlot(null);
      setError('');
      return;
    }
    try {
      const query = new URLSearchParams({
        salon_id: salon.id,
        date: chosenDate
      });
      if (stylist) query.set('stylist_id', stylist.id);
      if (selectedMenuIds.length > 0) query.set('menu_ids', selectedMenuIds.join(','));
      const data = await fetchApi<{ available_slots: Slot[] }>(`/api/reservations/availability?${query.toString()}`);
      setSlots(data.available_slots);
      setError(data.available_slots.length === 0 ? 'この日は予約できる時間がありません。別の日付を選んでください。' : '');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createReservation() {
    if (!salon || !slot) return;
    try {
      const data = await fetchApi<Record<string, unknown>>('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({
          salon_id: salon.id,
          stylist_id: slot.stylist_id || stylist?.id,
          friend_id: friendId(),
          menu_ids: selectedMenuIds,
          start_at: slot.start_at,
          customer_note: [
            hairStyle ? `希望スタイル: ${hairStyle}` : '',
            stylist ? '' : '担当者はサロンにお任せ',
            selectedMenus.length > 0 ? '' : 'メニューは当日相談',
            note
          ].filter(Boolean).join('\n'),
          coupon_code: selectedMenus.length > 0 ? appliedCoupon?.code : undefined
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

      {step === 'plan' && (
        <section>
          <h1>予約内容を選択</h1>
          <div className="grid-actions">
            <button onClick={() => move('stylist')}>
              <UserRound size={22} />
              <span>スタイリスト</span>
              <small>{stylist ? stylist.display_name ?? stylist.name : slot?.stylist_name ?? '任意で選択'}</small>
            </button>
            <button onClick={() => move('style')}>
              <Sparkles size={22} />
              <span>ヘアスタイル</span>
              <small>{hairStyle || '任意で選択'}</small>
            </button>
            <button onClick={() => move('menu')}>
              <Scissors size={22} />
              <span>メニュー</span>
              <small>{selectedMenus.length ? `${selectedMenus.length}件 / ${duration}分` : '当日相談も可'}</small>
            </button>
            <button onClick={() => move('datetime')}>
              <CalendarDays size={22} />
              <span>日付と時間</span>
              <small>{slot ? slot.start_at : `${formatDateLabel(date)}から探す`}</small>
            </button>
          </div>
          <div className="coupon">
            <Tags size={18} />
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="クーポンコード" />
            <button onClick={() => applyCoupon()}>適用</button>
          </div>
          <p className="notice">日時だけでも予約できます。担当者やメニューを選ぶと、空き時間と金額がより正確になります。</p>
          <FlowBar label={canConfirm ? '確認へ進めます' : '日時を選ぶと予約できます'} backDisabled={Boolean(fixedSalonId)} onBack={goBack} onNext={goNext} nextDisabled={!salon} nextText={canConfirm ? '確認へ' : '日時へ'} />
        </section>
      )}

      {step === 'stylist' && (
        <section>
          <h1>スタイリストを選択</h1>
          {stylists.length === 0 && !error && <p className="notice">現在予約できるスタイリストが登録されていません。</p>}
          <div className="list">
            {stylists.map((s) => (
              <button className={`row ${stylist?.id === s.id ? 'selected' : ''}`} key={s.id} onClick={() => chooseStylist(s)}>
                <UserRound size={22} />
                <span><strong>{s.display_name ?? s.name}</strong><small>{s.bio}</small></span>
                {stylist?.id === s.id ? <Check size={18} /> : <ChevronRight size={18} />}
              </button>
            ))}
          </div>
          <FlowBar label={stylist ? stylist.display_name ?? stylist.name : '未選択'} onBack={goBack} onNext={goNext} nextDisabled={!stylist} nextText="決定" />
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
          <button className="wide" onClick={() => { setHairStyle(''); move('plan'); }}>選ばずに進む</button>
          <FlowBar label={hairStyle || '任意'} onBack={goBack} onNext={goNext} nextDisabled={false} nextText="決定" />
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
          <button className="wide" onClick={() => { setSelectedMenuIds([]); setAppliedCoupon(null); move('plan'); }}>当日相談にする</button>
          <FlowBar label={selectedMenus.length ? `${duration}分 / ¥${total.toLocaleString('ja-JP')}` : '当日相談'} onBack={goBack} onNext={goNext} nextDisabled={false} nextText="決定" />
        </section>
      )}

      {step === 'datetime' && (
        <section>
          <h1>希望日と時間</h1>
          {(!stylist || selectedMenuIds.length === 0) && <p className="notice">未選択の項目はサロン側で調整します。メニュー未選択の場合、目安60分で候補を出します。</p>}
          <div className="datechips">
            {dateOptions().map((d) => <button className={date === d ? 'active' : ''} key={d} onClick={() => void loadSlots(d)}>{formatDateLabel(d)}</button>)}
          </div>
          <div className="datebar"><CalendarDays size={18} /><input type="date" value={date} onChange={(e) => void loadSlots(e.target.value)} /><button onClick={() => void loadSlots(date)}>候補</button></div>
          <div className="slots">
            {slots.map((s) => <button className={slot?.start_at === s.start_at && slot?.stylist_id === s.stylist_id ? 'active' : ''} key={`${s.stylist_id}-${s.start_at}`} onClick={() => setSlot(s)}><Clock size={15} />{s.start_at.slice(11, 16)}{!stylist && <small>{s.stylist_name}</small>}</button>)}
          </div>
          <FlowBar label={slot ? slot.start_at : `${formatDateLabel(date)}を希望`} onBack={goBack} onNext={slot ? goNext : () => move('plan')} nextDisabled={false} nextText="決定" />
        </section>
      )}

      {step === 'confirm' && (
        <section>
          <h1>予約内容の確認</h1>
          <div className="summary">
            <div><span>サロン</span><strong>{salon?.name}</strong></div>
            <div><span>スタイリスト</span><strong>{stylist?.display_name ?? stylist?.name ?? slot?.stylist_name ?? 'サロンで調整'}</strong></div>
            <div><span>希望スタイル</span><strong>{hairStyle || '未選択'}</strong></div>
            {selectedMenus.map((m) => <div key={m.id}><span>{m.name}</span><strong>¥{m.price.toLocaleString('ja-JP')}</strong></div>)}
            {appliedCoupon && <div className="discount"><span>{appliedCoupon.name}</span><strong>{appliedCoupon.code}</strong></div>}
            <div><span>来店日時</span><strong>{slot?.start_at}</strong></div>
            <div><span>合計</span><strong>{selectedMenus.length ? `¥${total.toLocaleString('ja-JP')} / ${duration}分` : '当日確定 / 目安60分'}</strong></div>
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
