'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/results', label: 'Results' },
  { href: '/standings', label: 'Standings' },
  { href: '/leaderboard', label: 'Analytics' },
  { href: '/predictions', label: 'Predictions' },
  { href: '/metrics', label: 'Metrics' },
  { href: '/teams', label: 'Teams' },
  { href: '/players', label: 'Players' },
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
    <nav className="border-b border-white/5 bg-[#0d1424]/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-4 h-14">
        <Link href="/" className="text-[#00d4aa] font-bold text-lg tracking-tight shrink-0">⚽ Sportlytics</Link>
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={clsx('px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors',
                pathname === l.href || (l.href !== '/dashboard' && pathname.startsWith(l.href))
                  ? 'bg-[#00d4aa]/15 text-[#00d4aa]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              )}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdminPage && (
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition">← App</Link>
          )}
          {user ? (
            <>
              {user.role === 'ADMIN' && !isAdminPage && (
                <Link href="/admin/sync" className="px-3 py-1.5 rounded text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition font-semibold">
                  Admin
                </Link>
              )}
              <span className="hidden md:inline text-xs text-slate-400">
                {user.email}
                <span className={clsx('ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold',
                  user.role === 'ADMIN' ? 'bg-amber-500/15 text-amber-400' : 'bg-[#00d4aa]/15 text-[#00d4aa]'
                )}>{user.role}</span>
              </span>
              <button onClick={handleLogout} className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white hover:bg-white/5 transition">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 py-1.5 rounded text-xs text-slate-300 hover:text-white hover:bg-white/5 transition">
                Login
              </Link>
              <Link href="/register" className="px-3 py-1.5 rounded text-xs bg-[#00d4aa] text-black font-semibold hover:bg-[#00b899] transition">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
