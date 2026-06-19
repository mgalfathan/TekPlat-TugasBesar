'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';

export default function LoginPage() {
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
    if (data.role === 'ADMIN') router.push('/admin/sync');
    else router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="gaffer-screen flex min-h-[calc(100vh-164px)] items-center py-8">
      <div className="grid w-full overflow-hidden rounded-card border border-border bg-panel lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex min-h-[260px] flex-col justify-between border-b border-border bg-panel-2 p-7 sm:p-10 lg:min-h-[560px] lg:border-b-0 lg:border-r">
          <div>
            <div className="mb-7 flex items-center gap-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-lime">
              <span className="h-2 w-2 rounded-full bg-lime" />
              Member access
            </div>
            <h1 className="max-w-lg font-display text-[clamp(48px,7vw,86px)] uppercase leading-[0.9] tracking-[0.5px] text-ink">
              Back in
              <br />
              the <span className="text-lime">dugout.</span>
            </h1>
          </div>
          <p className="mt-10 max-w-sm text-sm leading-relaxed text-muted">
            Pick up where you left off with your saved metrics, simulations, and football data.
          </p>
        </section>

        <section className="flex items-center p-7 sm:p-10 lg:p-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-lime">
                Sign in
              </p>
              <h2 className="text-2xl font-extrabold text-ink">Welcome back</h2>
              <p className="mt-2 text-sm text-muted">Enter your account details to continue.</p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-chip border border-loss/25 bg-loss/[0.06] px-4 py-3 text-sm text-loss"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  className="h-12 w-full rounded-chip border border-border-2 bg-bg px-4 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 hover:border-white/20 focus:border-lime focus:ring-1 focus:ring-lime/20"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label
                    htmlFor="password"
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-muted transition-colors hover:text-lime"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-chip bg-lime px-5 font-mono text-xs font-bold uppercase tracking-[0.07em] text-lime-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted">
              New to The Gaffer?{' '}
              <Link
                href="/register"
                className="font-semibold text-ink transition-colors hover:text-lime"
              >
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
