'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  MapPin,
  Megaphone,
  ScrollText,
  Settings,
  Truck,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { logoutAction } from '@/app/admin/actions';
import type { Role } from '@/lib/admin/permissions';

const links = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/locations', label: 'Truck Locations', icon: MapPin },
  { href: '/admin/catering', label: 'Catering', icon: Truck },
  { href: '/admin/promotions', label: 'Promotions', icon: Megaphone },
  { href: '/admin/content', label: 'Website Content', icon: FileText },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/activity', label: 'Activity Log', icon: ScrollText },
];

const restricted = [
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/users', label: 'User Management', icon: Users },
];

export default function Shell({ role, name, children }: { role: Role; name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = role === 'NOCTARIS_ADMIN' ? [...links, ...restricted] : links;
  const roleLabel = role === 'NOCTARIS_ADMIN' ? 'Noctaris admin' : 'Owner';

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="admin-body">
      <div className="admin-shell">
        {open ? <button className="admin-scrim" type="button" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
        <aside className={open ? 'admin-sidebar is-open' : 'admin-sidebar'} id="admin-nav">
          <Link className="admin-brand" href="/admin">
            <Image src="/brand/fluffys-logo-display.png" alt="" width={48} height={63} />
            <span>Fluffy&apos;s Bistro</span>
          </Link>
          <nav className="admin-nav" aria-label="Admin">
            {items.map((item) => {
              const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
                  <Icon aria-hidden="true" size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="admin-sidebar-foot">
            <p>
              <strong>{name}</strong>
              <span>{roleLabel}</span>
            </p>
            <form action={logoutAction}>
              <button className="button secondary" type="submit">
                Log out
              </button>
            </form>
          </div>
        </aside>
        <div className="admin-main">
          <div className="admin-topbar">
            <button className="admin-icon-btn" type="button" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen((value) => !value)}>
              {open ? 'Close' : 'Menu'}
            </button>
            <p>
              {name} · {roleLabel}
            </p>
          </div>
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
