import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Check, ChevronRight, Clock, MapPin, Scissors, Search, Sparkles, Store, Tags, UserRound } from 'lucide-react';
import { fetchApi, friendlyApiError } from './lib/api';
import './style.css';

type Salon = { id: string; name: string; theme_color: string | null };
type Stylist = { id: string; name: string; display_name: string | null; bio: string | null; specialties: string | null };
type Menu = { id: string; stylist_id: string; name: string; category: string; duration_min: number; price: number; description: string | null };
type Coupon = { id: string; code: string; name: string; type: string; value: number; applicable_menu_ids: string | null };
type Slot = { start_at: string; end_at: string; stylist_id: string; stylist_name: string };
type Step = 'salon' | 'plan' | 'stylist' | 'style' | 'menu' | 'coupon' | 'datetime' | 'confirm' | 'done' | 'history';
type Entry = 'stylist' | 'style' | 'menu' | 'datetime';

const fixedSalonId = initialSalonId();
const styleChoices = ['当日指定', 'お任せ', '似合わせカット', '透明感カラー', '髪質改善', '縮毛矯正', 'メンテナンス'];
const flows: Record<Entry, Step[]> = {
  stylist: ['stylist', 'coupon', 'style', 'datetime', 'confirm'],
  style: ['style', 'stylist', 'coupon', 'datetime', 'confirm'],
  menu: ['menu', 'stylist', 'coupon', 'datetime', 'confirm'],
  datetime: ['datetime', 'style', 'stylist', 'coupon', 'confirm']
};

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

function App() {
  const [step, setStep] = useState<Step>('salon');
  const [entry, setEntry] = useState<Entry | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [salonQuery, setSalonQuery] = useState('');
  const [nearMe, setNearMe] = useState(false);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [stylist, setStylist] = useState<Stylist | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoaded, setCouponsLoaded] = useState(false);
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

  function activeFlow() {
    return entry ? flows[entry] : [];
  }

  function nextStepFrom(current: Step) {
    const flow = activeFlow();
    const idx = flow.indexOf(current);
    if (idx < 0) return 'plan';
    const next = flow[idx + 1] ?? 'confirm';
    if (next === 'coupon' && couponsLoaded && coupons.length === 0 && !couponCode.trim()) {
      return flow[idx + 2] ?? 'confirm';
    }
    return next;
  }

  function previousStepFrom(current: Step) {
    const flow = activeFlow();
    const idx = flow.indexOf(current);
    if (idx <= 0) return 'plan';
    const prev = flow[idx - 1] ?? 'plan';
    if (prev === 'coupon' && couponsLoaded && coupons.length === 0 && !couponCode.trim()) {
      return flow[idx - 2] ?? 'plan';
    }
    return prev;
  }

  function startFlow(nextEntry: Entry) {
    setEntry(nextEntry);
    move(flows[nextEntry][0]!);
  }

  function goBack() {
    if (step === 'plan') {
      if (!fixedSalonId) move('salon');
      return;
    }
    if (step === 'history') {
      move(salon ? 'plan' : 'salon');
      return;
    }
    move(previousStepFrom(step));
  }

  function goNext() {
    if (step === 'datetime' && !slot) {
      setError('予約時間を選択してください。');
      return;
    }
    move(nextStepFrom(step));
  }

  function selectSalon(nextSalon: Salon) {
    setSalon(nextSalon);
    setEntry(null);
    setStylist(null);
    setMenus([]);
    setSelectedMenuIds([]);
    setCoupons([]);
    setCouponsLoaded(false);
    setAppliedCoupon(null);
    setHairStyle('');
    setSlot(null);
    move('plan');
  }

  function chooseStylist(nextStylist: Stylist | null) {
    setStylist(nextStylist);
    setAppliedCoupon(null);
    setCouponCode('');
    setSlot(null);
    setSlots([]);
    if (nextStylist) {
      setSelectedMenuIds((prev) => prev.filter((id) => menus.find((m) => m.id === id)?.stylist_id === nextStylist.id));
    }
  }

  async function loadCoupons(nextSalon: Salon, nextStylist: Stylist | null) {
    setCouponsLoaded(false);
    try {
      const query = nextStylist
        ? `stylist_id=${encodeURIComponent(nextStylist.id)}`
        : `salon_id=${encodeURIComponent(nextSalon.id)}`;
      setCoupons(await fetchApi<Coupon[]>(`/api/coupons?${query}&friend_id=${friendId()}`));
    } catch {
      setCoupons([]);
    } finally {
      setCouponsLoaded(true);
    }
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
    void fetchApi<Stylist[]>(`/api/stylists?salon_id=${encodeURIComponent(salon.id)}`)
      .then((items) => {
        setStylists(items);
        if (items.length === 1) setStylist(items[0]!);
      })
      .catch((err) => setError(friendlyApiError(err)));
  }, [salon]);

  useEffect(() => {
    if (!salon) return;
    void loadCoupons(salon, stylist);
  }, [salon, stylist?.id]);

  useEffect(() => {
    setSlots([]);
    setSlot(null);
  }, [date, selectedMenuIds.join(','), stylist?.id]);

  useEffect(() => {
    if (step === 'datetime') void loadSlots(date);
  }, [step]);

  useEffect(() => {
    if (step === 'coupon' && couponsLoaded && coupons.length === 0 && !couponCode.trim()) {
      move(nextStepFrom('coupon'));
    }
  }, [step, couponsLoaded, coupons.length, couponCode]);

  async function applyCoupon(code = couponCode) {
    if (!salon || !code) return;
    try {
      const query = stylist
        ? `stylist_id=${encodeURIComponent(stylist.id)}`
        : `salon_id=${encodeURIComponent(salon.id)}`;
      const result = await fetchApi<{ valid: boolean; coupon?: Coupon; message?: string }>(`/api/coupons/code/${encodeURIComponent(code)}?${query}&friend_id=${friendId()}`);
      if (!result.valid || !result.coupon) {
        setError(result.message ?? 'このクーポンは利用できません。コードをご確認ください。');
        return;
      }
      setAppliedCoupon(result.coupon);
      setCouponCode(result.coupon.code);
      const targetIds = result.coupon.applicable_menu_ids ? JSON.parse(result.coupon.applicable_menu_ids) as string[] : [];
      if (targetIds.length > 0) setSelectedMenuIds((prev) => Array.from(new Set([...prev, ...targetIds])));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function loadSlots(chosenDate = date) {
    setDate(chosenDate);
    if (!salon) return;
    try {
      const query = new URLSearchParams({ salon_id: salon.id, date: chosenDate });
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
          <span>{step === 'salon' ? '登録サロンを探す' : stylist?.display_name ?? stylist?.name ?? slot?.stylist_name ?? '予約'}</span>
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
          <div className="list">
            {filteredSalons.map((s) => (
              <button className={`row ${salon?.id === s.id ? 'selected' : ''}`} key={s.id} onClick={() => selectSalon(s)}>
                <Store size={22} />
                <span><strong>{s.name}</strong><small>{nearMe ? '現在地周辺の登録サロン' : `/s/${s.id}`}</small></span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
          {salons.length === 0 && !error && <p className="notice">現在予約できるサロンがありません。</p>}
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
            <button onClick={() => startFlow('stylist')}><UserRound size={22} /><span>スタイリスト</span><small>{stylist ? stylist.display_name ?? stylist.name : slot?.stylist_name ?? '指名から選ぶ'}</small></button>
            <button onClick={() => startFlow('style')}><Sparkles size={22} /><span>ヘアスタイル</span><small>{hairStyle || '髪型から選ぶ'}</small></button>
            <button onClick={() => startFlow('menu')}><Scissors size={22} /><span>メニュー</span><small>{selectedMenus.length ? `${selectedMenus.length}件 / ¥${total.toLocaleString('ja-JP')}` : '料金から選ぶ'}</small></button>
            <button onClick={() => startFlow('datetime')}><CalendarDays size={22} /><span>日付と時間</span><small>{slot ? slot.start_at : `${formatDateLabel(date)}から選ぶ`}</small></button>
          </div>
          <p className="notice">どこから選んでも予約できます。最後の確認画面で日時と金額を確認できます。</p>
        </section>
      )}

      {step === 'stylist' && (
        <section>
          <h1>スタイリストを選択</h1>
          <div className="list">
            {stylists.map((s) => (
              <button className={`row ${stylist?.id === s.id ? 'selected' : ''}`} key={s.id} onClick={() => chooseStylist(s)}>
                <UserRound size={22} />
                <span><strong>{s.display_name ?? s.name}</strong><small>{s.bio}</small></span>
                {stylist?.id === s.id ? <Check size={18} /> : <ChevronRight size={18} />}
              </button>
            ))}
          </div>
          {entry !== 'stylist' && <button className="wide" onClick={() => { chooseStylist(null); goNext(); }}>指名せずに進む</button>}
          <FlowBar label={stylist ? stylist.display_name ?? stylist.name : entry === 'stylist' ? '未選択' : '指名なし'} onBack={goBack} onNext={goNext} nextDisabled={entry === 'stylist' && !stylist} nextText="進む" />
        </section>
      )}

      {step === 'style' && (
        <section>
          <h1>ヘアスタイルを選択</h1>
          <div className="chips">
            {styleChoices.map((choice) => <button className={hairStyle === choice ? 'active' : ''} key={choice} onClick={() => setHairStyle(choice)}>{choice}</button>)}
          </div>
          {entry !== 'style' && <button className="wide" onClick={() => { setHairStyle('当日指定'); goNext(); }}>当日指定にする</button>}
          <FlowBar label={hairStyle || '未選択'} onBack={goBack} onNext={goNext} nextDisabled={entry === 'style' && !hairStyle} nextText="進む" />
        </section>
      )}

      {step === 'menu' && (
        <section>
          <h1>メニューを選択</h1>
          <div className="list">
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
          <FlowBar label={selectedMenus.length ? `${duration}分 / ¥${total.toLocaleString('ja-JP')}` : '未選択'} onBack={goBack} onNext={goNext} nextDisabled={entry === 'menu' && selectedMenus.length === 0} nextText="進む" />
        </section>
      )}

      {step === 'coupon' && (
        <section>
          <h1>クーポンを選択</h1>
          <div className="coupon">
            <Tags size={18} />
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="クーポンコード" />
            <button onClick={() => applyCoupon()}>適用</button>
          </div>
          <div className="list">
            {coupons.map((c) => (
              <button className={`row ${appliedCoupon?.id === c.id ? 'selected' : ''}`} key={c.id} onClick={() => { setAppliedCoupon(c); setCouponCode(c.code); }}>
                <Tags size={22} />
                <span><strong>{c.name}</strong><small>{c.code}</small></span>
                {appliedCoupon?.id === c.id && <Check size={18} />}
              </button>
            ))}
          </div>
          {couponsLoaded && coupons.length === 0 && <p className="notice">利用できるクーポンはありません。</p>}
          <button className="wide" onClick={() => { setAppliedCoupon(null); setCouponCode(''); goNext(); }}>選択しない</button>
          <FlowBar label={appliedCoupon ? appliedCoupon.name : '未選択'} onBack={goBack} onNext={goNext} nextDisabled={false} nextText="進む" />
        </section>
      )}

      {step === 'datetime' && (
        <section>
          <h1>希望日と時間</h1>
          <div className="datebar"><CalendarDays size={18} /><input type="date" value={date} onChange={(e) => void loadSlots(e.target.value)} /><button onClick={() => void loadSlots(date)}>候補</button></div>
          <div className="slots">
            {slots.map((s) => <button className={slot?.start_at === s.start_at && slot?.stylist_id === s.stylist_id ? 'active' : ''} key={`${s.stylist_id}-${s.start_at}`} onClick={() => setSlot(s)}><Clock size={15} />{s.start_at.slice(11, 16)}{!stylist && <small>{s.stylist_name}</small>}</button>)}
          </div>
          <FlowBar label={slot ? slot.start_at : '時間を選択'} onBack={goBack} onNext={goNext} nextDisabled={!slot} nextText="進む" />
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
  nextDisabled,
  onBack,
  onNext,
  nextText = '進む'
}: {
  label: string;
  nextDisabled: boolean;
  onBack: () => void;
  onNext: () => void;
  nextText?: string;
}) {
  return (
    <div className="bottom flow">
      <button className="back" onClick={onBack}>戻る</button>
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
