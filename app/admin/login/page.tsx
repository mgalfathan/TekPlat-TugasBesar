'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Login failed');
      return;
    }
    if (data.role !== 'ADMIN') {
      setError('This account does not have admin access.');
      return;
    }
    router.push('/admin/sync');
    router.refresh();
  }

  return (
    <div className="gaffer-screen flex min-h-[calc(100vh-164px)] items-center justify-center py-8">
      <section className="w-full max-w-md border border-border bg-panel p-7 rounded-card sm:p-10">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-lime">Restricted access</p>
        <h1 className="mt-3 font-display text-5xl uppercase leading-none tracking-[0.5px] text-ink">Admin login.</h1>
        <p className="mt-3 text-sm text-muted">Authenticate with an administrator account.</p>

        {error && <div role="alert" className="mt-6 rounded-chip border border-loss/25 bg-loss/[0.06] px-4 py-3 text-sm text-loss">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="admin-email" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Email address</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="admin@example.com"
              required
              className="h-12 w-full rounded-chip border border-border-2 bg-bg px-4 text-sm text-ink outline-none placeholder:text-muted-2 focus:border-lime focus:ring-1 focus:ring-lime/20"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Password</label>
            <PasswordInput id="admin-password" name="password" autoComplete="current-password" value={password} onChange={setPassword} required />
          </div>
          <button type="submit" disabled={loading} className="h-12 w-full rounded-chip bg-lime font-mono text-xs font-bold uppercase tracking-[0.06em] text-lime-ink hover:brightness-110 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <Link href="/login" className="mt-6 block text-center font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-muted hover:text-lime">
          Standard login
        </Link>
      </section>
    </div>
  );
}
