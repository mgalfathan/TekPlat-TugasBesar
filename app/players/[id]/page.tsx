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
  team: {
    id: number;
    name: string;
    logo: string | null;
    code: string | null;
    country: string | null;
    venueName: string | null;
  } | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="border-l border-border pl-4">
      <div className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-muted-2">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value ?? '-'}</div>
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
  if (!player) return <div className="py-20 text-center text-loss">Player not found.</div>;

  return (
    <div className="gaffer-screen space-y-6">
      <Link
        href="/players"
        className="inline-flex font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-muted transition-colors hover:text-lime"
      >
        Back to players
      </Link>

      <section className="overflow-hidden border border-border bg-panel rounded-card">
        <div className="grid md:grid-cols-[220px_1fr]">
          <div className="flex min-h-52 items-center justify-center border-b border-border bg-panel-2 p-7 md:border-b-0 md:border-r">
            <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-card border border-border bg-bg">
              {player.photo ? (
                <img src={player.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-4xl text-muted">
                  {player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-lime">
                  Player profile
                </p>
                <h1 className="mt-2 font-display text-[clamp(42px,6vw,72px)] uppercase leading-[0.92] tracking-[0.5px] text-ink">
                  {player.name}
                </h1>
                {player.firstname && player.lastname && (
                  <p className="mt-2 text-sm text-muted">{player.firstname} {player.lastname}</p>
                )}
              </div>
              <span className={`w-fit rounded px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${
                player.injured ? 'bg-loss/10 text-loss' : 'bg-win/10 text-win'
              }`}>
                {player.injured ? 'Injured' : 'Available'}
              </span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-y-5 sm:grid-cols-4">
              <Field label="Age" value={player.age} />
              <Field label="Nationality" value={player.nationality} />
              <Field label="Height" value={player.height} />
              <Field label="Weight" value={player.weight} />
            </div>
          </div>
        </div>
      </section>

      {player.team && (
        <section className="border border-border bg-panel p-5 rounded-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Current club</p>
              <h2 className="mt-1 text-base font-extrabold text-ink">Team assignment</h2>
            </div>
            <Link href={`/teams/${player.team.id}`} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-muted hover:text-lime">
              View club
            </Link>
          </div>
          <Link
            href={`/teams/${player.team.id}`}
            className="flex items-center gap-4 border-t border-border pt-4 transition-colors hover:text-lime"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-chip border border-border bg-bg">
              {player.team.logo ? (
                <img src={player.team.logo} alt="" className="h-9 w-9 object-contain" />
              ) : (
                <span className="font-display text-sm text-muted">{player.team.code ?? '?'}</span>
              )}
            </div>
            <div>
              <p className="font-bold text-ink">{player.team.name}</p>
              <p className="mt-1 text-xs text-muted">
                {player.team.country ?? 'Unknown country'}
                {player.team.venueName ? ` / ${player.team.venueName}` : ''}
              </p>
            </div>
          </Link>
        </section>
      )}

      <p className="font-mono text-[10px] leading-relaxed text-muted-2">
        Match-level player statistics require the PlayerMatchStats sync and are not part of the free-tier flow.
      </p>
    </div>
  );
}
