'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/live', label: '🔴 Live' },
  { href: '/fixtures', label: 'Fixtures' },
  { href: '/results', label: 'Results' },
  { href: '/standings', label: 'Standings' },
  { href: '/leaderboard', label: 'Analytics' },
  { href: '/predictions', label: 'Predictions' },
  { href: '/metrics', label: 'Metrics' },
  { href: '/teams', label: 'Teams' },
  { href: '/players', label: 'Players' },
];

export function Navbar() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
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
          {isAdmin
            ? <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition">← App</Link>
            : <Link href="/admin/sync" className="px-3 py-1.5 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition">Admin</Link>
          }
        </div>
      </div>
    </nav>
  );
}
