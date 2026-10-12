'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logoutAction } from '@/app/admin/actions';
import type { Role } from '@/lib/admin/permissions';

const links = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/menu', label: 'Menu Manager' },
  { href: '/admin/locations', label: 'Truck Locations' },
  { href: '/admin/catering', label: 'Catering' },
  { href: '/admin/promotions', label: 'Promotions' },
  { href: '/admin/content', label: 'Website Content' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/activity', label: 'Activity Log' },
];

export default function Shell({ role, name, children }: { role: Role; name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = [...links];
  if (role === 'NOCTARIS_ADMIN') {
    items.push({ href: '/admin/settings', label: 'Settings' }, { href: '/admin/users', label: 'User Management' });
  }

  return (
    <div className="admin-body">
      <div className="admin-shell">
        <aside className={open ? 'admin-sidebar open' : 'admin-sidebar'}>
          <Link className="admin-brand" href="/admin" onClick={() => setOpen(false)}>
            <Image src="/brand/fluffys-logo-display.png" alt="" width={54} height={71} />
            <span>Fluffy&apos;s admin</span>
          </Link>
          <nav className="admin-nav" aria-label="Admin">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="admin-main">
          <button className="button secondary admin-menu-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? 'Close menu' : 'Admin menu'}
          </button>
          <div className="admin-top">
            <p className="admin-muted">
              Signed in as {name} · {role === 'NOCTARIS_ADMIN' ? 'Noctaris admin' : 'Owner'}
            </p>
            <form action={logoutAction}>
              <button className="button secondary" type="submit">
                Log out
              </button>
            </form>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
