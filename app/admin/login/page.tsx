'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    if (!res.ok) { setError(data.error ?? 'Login failed'); return; }
    if (data.role !== 'ADMIN') { setError('Not an admin account'); return; }
    router.push('/admin/sync');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
      <div className="bg-[#111827] border border-white/10 rounded-xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
        <p className="text-gray-400 text-sm mb-6">The Gaffer administration</p>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full bg-[#1a2535] border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa]"
          />
          <PasswordInput value={password} onChange={setPassword} placeholder="Password" required />
          <button
            type="submit" disabled={loading}
            className="w-full bg-[#00d4aa] hover:bg-[#00b899] text-black font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
