'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CalendarDays, Megaphone, MessageSquare, Scissors, Settings, Tags, Users, LayoutDashboard, UserRound } from 'lucide-react';

const items = [
  { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/reservations', label: '予約', icon: CalendarDays },
  { href: '/stylists', label: 'スタイリスト', icon: UserRound },
  { href: '/customers', label: '顧客', icon: Users },
  { href: '/menus', label: 'メニュー', icon: Scissors },
  { href: '/coupons', label: 'クーポン', icon: Tags },
  { href: '/campaigns', label: 'キャンペーン', icon: Megaphone },
  { href: '/messages', label: 'メッセージ', icon: MessageSquare },
  { href: '/analytics', label: '分析', icon: BarChart3 },
  { href: '/settings', label: '設定', icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Salon Harness</div>
        <nav className="nav">
          {items.map((item) => {
            const Icon = item.icon;
            const active = path === item.href || (item.href !== '/admin' && path.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : undefined}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
