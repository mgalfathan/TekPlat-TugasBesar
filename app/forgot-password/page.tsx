'use client';

import { useState } from 'react';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Reset failed');
      return;
    }
    setMessage(data.message ?? 'Password updated.');
    setPassword('');
  }

  return (
    <div className="gaffer-screen flex min-h-[calc(100vh-164px)] items-center justify-center py-8">
      <section className="w-full max-w-lg border border-border bg-panel p-7 rounded-card sm:p-10">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-lime">Account recovery</p>
        <h1 className="mt-3 font-display text-5xl uppercase leading-none tracking-[0.5px] text-ink">Reset password.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">Enter your account email and choose a new password.</p>

        {error && <div role="alert" className="mt-6 rounded-chip border border-loss/25 bg-loss/[0.06] px-4 py-3 text-sm text-loss">{error}</div>}
        {message && <div role="status" className="mt-6 rounded-chip border border-win/25 bg-win/[0.06] px-4 py-3 text-sm text-win">{message}</div>}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
              className="h-12 w-full rounded-chip border border-border-2 bg-bg px-4 text-sm text-ink outline-none placeholder:text-muted-2 focus:border-lime focus:ring-1 focus:ring-lime/20"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">New password</label>
            <PasswordInput id="new-password" name="password" autoComplete="new-password" value={password} onChange={setPassword} placeholder="At least 8 characters" minLength={8} required />
          </div>
          <button type="submit" disabled={loading} className="h-12 w-full rounded-chip bg-lime font-mono text-xs font-bold uppercase tracking-[0.06em] text-lime-ink hover:brightness-110 disabled:opacity-50">
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>

        <div className="mt-7 border-t border-border pt-5 text-center text-sm text-muted">
          Remembered it? <Link href="/login" className="font-semibold text-ink hover:text-lime">Sign in</Link>
        </div>
      </section>
    </div>
  );
}
