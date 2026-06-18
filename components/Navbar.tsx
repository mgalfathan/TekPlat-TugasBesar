'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const links = [
  { href: '/dashboard', n: '01', label: 'Dashboard' },
  { href: '/leaderboard', n: '02', label: 'Analytics' },
  { href: '/results', n: '03', label: 'Results' },
  { href: '/metrics', n: '04', label: 'Metrics' },
  { href: '/standings', n: '05', label: 'Standings' },
  { href: '/simulator', n: '06', label: 'Simulator' },
  { href: '/teams', n: '07', label: 'Teams' },
  { href: '/players', n: '08', label: 'Players' },
];

interface User { id: number; email: string; role: string }

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const isAdminPage = pathname.startsWith('/admin');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-[rgba(11,12,8,0.86)] backdrop-blur-[14px]">
      <div className="max-w-page mx-auto flex items-center gap-6 h-16 px-7">
        <Link
          href="/"
          className="font-display text-2xl uppercase tracking-[0.5px] shrink-0 whitespace-nowrap"
        >
          THE<span className="text-lime">GAFFER</span>
        </Link>

        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 scrollbar-thin">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== '/dashboard' && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  'flex items-center gap-[7px] px-[13px] py-2 rounded-[7px] font-mono text-[11.5px] font-medium uppercase tracking-[0.06em] whitespace-nowrap transition-colors',
                  active
                    ? 'bg-lime text-lime-ink'
                    : 'text-muted hover:text-ink hover:bg-white/[0.04]'
                )}
              >
                <span className={clsx('font-bold', active ? 'text-lime-ink/55' : 'text-muted-2')}>{l.n}</span>
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isAdminPage && (
            <Link href="/" className="font-mono text-[11px] text-muted-2 hover:text-ink transition-colors">← App</Link>
          )}
          {user ? (
            <>
              {user.role === 'ADMIN' && !isAdminPage && (
                <Link
                  href="/admin/sync"
                  className="font-mono text-[11px] font-semibold tracking-[0.05em] text-lime border border-[rgba(200,242,58,0.3)] bg-[rgba(200,242,58,0.08)] px-[11px] py-[7px] rounded-[7px] hover:bg-[rgba(200,242,58,0.16)] transition-colors"
                >
                  ADMIN
                </Link>
              )}
              <span className="hidden md:inline font-mono text-[11px] text-muted">
                <b className="font-medium text-ink">{user.email}</b>
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-[0.05em] bg-[rgba(200,242,58,0.16)] text-lime">
                  {user.role}
                </span>
              </span>
              <button
                onClick={handleLogout}
                className="font-mono text-[11px] text-muted-2 border border-border px-[11px] py-[7px] rounded-[7px] hover:text-ink hover:border-border-2 transition-colors"
              >
                LOGOUT
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-mono text-[11px] text-muted-2 border border-border px-[11px] py-[7px] rounded-[7px] hover:text-ink hover:border-border-2 transition-colors"
              >
                LOGIN
              </Link>
              <Link
                href="/register"
                className="font-mono text-[11px] font-bold tracking-[0.05em] bg-lime text-lime-ink px-[13px] py-[7px] rounded-[7px] hover:brightness-110 transition"
              >
                REGISTER
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
