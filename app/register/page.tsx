'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Registration failed');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="gaffer-screen flex min-h-[calc(100vh-164px)] items-center py-8">
      <div className="grid w-full overflow-hidden rounded-card border border-border bg-panel lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex min-h-[260px] flex-col justify-between border-b border-border bg-panel-2 p-7 sm:p-10 lg:min-h-[620px] lg:border-b-0 lg:border-r">
          <div>
            <div className="mb-7 flex items-center gap-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-lime">
              <span className="h-2 w-2 rounded-full bg-lime" />
              New signing
            </div>
            <h1 className="max-w-lg font-display text-[clamp(48px,7vw,86px)] uppercase leading-[0.9] tracking-[0.5px] text-ink">
              Join the
              <br />
              <span className="text-lime">touchline.</span>
            </h1>
          </div>
          <p className="mt-10 max-w-sm text-sm leading-relaxed text-muted">
            Create your account and keep your football analysis in one place.
          </p>
        </section>

        <section className="flex items-center p-7 sm:p-10 lg:p-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-lime">
                Register
              </p>
              <h2 className="text-2xl font-extrabold text-ink">Create your account</h2>
              <p className="mt-2 text-sm text-muted">Set up your details to get started.</p>
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
                  htmlFor="name"
                  className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted"
                >
                  Name <span className="font-normal text-muted-2">(optional)</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                  className="h-12 w-full rounded-chip border border-border-2 bg-bg px-4 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 hover:border-white/20 focus:border-lime focus:ring-1 focus:ring-lime/20"
                />
              </div>

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
                <label
                  htmlFor="password"
                  className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted"
                >
                  Password
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
                <p className="mt-2 font-mono text-[10px] text-muted-2">Minimum 8 characters</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-chip bg-lime px-5 font-mono text-xs font-bold uppercase tracking-[0.07em] text-lime-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-ink transition-colors hover:text-lime"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
