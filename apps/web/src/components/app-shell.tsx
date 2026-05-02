'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Scissors,
  Settings,
  Tags,
  UserRound,
  Users
} from 'lucide-react';

const navSections: {
  label: string;
  items: { href: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[];
}[] = [
  {
    label: '運用',
    items: [
      { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard },
      { href: '/reservations', label: '予約', icon: CalendarDays },
      { href: '/stylists', label: 'スタイリスト', icon: UserRound },
      { href: '/customers', label: '顧客', icon: Users }
    ]
  },
  {
    label: 'プロモーション',
    items: [
      { href: '/menus', label: 'メニュー', icon: Scissors },
      { href: '/coupons', label: 'クーポン', icon: Tags },
      { href: '/campaigns', label: 'キャンペーン', icon: Megaphone },
      { href: '/messages', label: 'メッセージ', icon: MessageSquare }
    ]
  },
  {
    label: '分析・設定',
    items: [
      { href: '/analytics', label: '分析', icon: BarChart3 },
      { href: '/settings', label: '設定', icon: Settings }
    ]
  }
];

function navActive(path: string, href: string): boolean {
  if (href === '/admin') return path === '/admin';
  return path === href || path.startsWith(`${href}/`);
}

function crumbLabel(path: string): string {
  if (path.startsWith('/customers/')) return '顧客タイムライン';
  const map: Record<string, string> = {
    '/admin': 'ダッシュボード',
    '/reservations': '予約',
    '/stylists': 'スタイリスト',
    '/customers': '顧客',
    '/menus': 'メニュー',
    '/coupons': 'クーポン',
    '/campaigns': 'キャンペーン',
    '/messages': 'メッセージ',
    '/analytics': '分析',
    '/settings': '設定'
  };
  return map[path] ?? 'ページ';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [salonName, setSalonName] = useState('サロン');

  useEffect(() => {
    const key = localStorage.getItem('salon_api_key') || localStorage.getItem('salon_session');
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!key || !base) return;
    fetch(`${base}/api/salons`, { headers: { Authorization: `Bearer ${key}` } })
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: { name?: string }[] }) => {
        const name = body.data?.[0]?.name;
        if (name) setSalonName(name);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  function logout() {
    localStorage.removeItem('salon_api_key');
    localStorage.removeItem('salon_session');
    router.push('/login');
  }

  return (
    <div className="shell">
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`} id="sidebar" aria-label="メインナビゲーション">
        <div className="sb-brand">
          <div className="mark" aria-hidden="true">
            S
          </div>
          <div className="name">
            <span>Salon Harness</span>
            <small>Operator Console</small>
          </div>
        </div>

        <button type="button" className="sb-shop" title="サロン（将来: 切替）">
          <div className="avatar">店</div>
          <div className="nm">
            {salonName}
            <small>管理コンソール</small>
          </div>
          <ChevronDown className="chev" size={14} aria-hidden />
        </button>

        <nav className="nav">
          {navSections.map((sec) => (
            <Fragment key={sec.label}>
              <div className="nav-section">{sec.label}</div>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const active = navActive(path, item.href);
                return (
                  <Link key={item.href} href={item.href} className={`nav-item${active ? ' active' : ''}`}>
                    <Icon size={16} strokeWidth={2} />
                    {item.label}
                  </Link>
                );
              })}
            </Fragment>
          ))}
        </nav>

        <div className="sb-foot">
          <div className="av">店</div>
          <div className="who">
            スタッフ
            <small>ログイン中</small>
          </div>
          <button type="button" className="ic" title="ログアウト" aria-label="ログアウト" onClick={logout}>
            <LogOut size={14} strokeWidth={2} />
          </button>
        </div>
      </aside>

      <div
        className={`scrim${mobileOpen ? ' show' : ''}`}
        role="presentation"
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />

      <div className="main">
        <header className="topbar">
          <button type="button" className="menu-btn" aria-label="メニューを開く" onClick={() => setMobileOpen(true)}>
            <Menu size={18} strokeWidth={2} />
          </button>
          <nav className="crumb" aria-label="パンくず">
            <span>{salonName}</span>
            <ChevronRight size={12} aria-hidden />
            <b>{crumbLabel(path)}</b>
          </nav>
          <div className="top-spacer" />
          <label className="top-search">
            <span className="sr-only">検索</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input placeholder="顧客・予約・friend_id を検索…" disabled title="近日対応" />
            <kbd>⌘K</kbd>
          </label>
          <button type="button" className="top-icon" title="ヘルプ" aria-label="ヘルプ" disabled>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <button type="button" className="top-icon" title="通知" aria-label="通知" disabled>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </header>

        <div className="page">{children}</div>
      </div>
    </div>
  );
}
