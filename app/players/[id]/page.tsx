'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Player {
  id: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  age: number | null;
  birthDate: string | null;
  nationality: string | null;
  height: string | null;
  weight: string | null;
  photo: string | null;
  injured: boolean;
  team: { id: number; name: string; logo: string | null; code: string | null; country: string | null; venueName: string | null } | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="bg-white/5 rounded-lg px-3 py-2">
      <div className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</div>
      <div className="text-slate-100 text-sm font-medium">{value ?? '—'}</div>
    </div>
  );
}

export default function PlayerPage({ params }: { params: { id: string } }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${params.id}`)
      .then(r => r.json())
      .then((d: { player?: Player; error?: string }) => {
        if (!d.error && d.player) setPlayer(d.player);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner message="Loading player profile..." />;
  if (!player) return <div className="text-center py-20 text-red-400">Player not found.</div>;

  return (
    <div className="space-y-6">
      <Link href="/players" className="text-sm text-slate-500 hover:text-[#00d4aa] inline-block">
        ← Players
      </Link>

      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-5">
          {player.photo ? (
            <img src={player.photo} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-[#00d4aa]/30" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-slate-400 font-bold">
              {player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white">{player.name}</h1>
            {player.firstname && player.lastname && (
              <p className="text-slate-400 text-sm mt-0.5">{player.firstname} {player.lastname}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              {player.nationality && (
                <span className="px-2 py-0.5 rounded-full bg-[#00d4aa]/10 text-[#00d4aa]">{player.nationality}</span>
              )}
              {player.injured && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Injured</span>
              )}
              {!player.injured && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Fit</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
          <Field label="Age" value={player.age} />
          <Field label="Nationality" value={player.nationality} />
          <Field label="Height" value={player.height} />
          <Field label="Weight" value={player.weight} />
        </div>

        {player.team && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="text-slate-500 text-xs uppercase tracking-wide mb-2">Current Team</div>
            <Link href={`/teams?team=${player.team.id}`} className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-3 -m-3 transition">
              {player.team.logo ? (
                <img src={player.team.logo} alt="" className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xs text-slate-300 font-bold">
                  {player.team.code ?? '?'}
                </div>
              )}
              <div>
                <p className="text-white font-bold">{player.team.name}</p>
                <p className="text-slate-500 text-xs">{player.team.country ?? '—'} {player.team.venueName ? `· ${player.team.venueName}` : ''}</p>
              </div>
            </Link>
          </div>
        )}

        <p className="text-slate-600 text-xs mt-6">
          Match-level statistics (goals, assists, minutes) require <code className="text-slate-500">PlayerMatchStats</code> sync — not included in the free-tier sync flow.
        </p>
      </div>
    </div>
  );
}
