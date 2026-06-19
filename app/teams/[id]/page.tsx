'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Team {
  id: number; name: string; code: string | null; country: string | null;
  founded: number | null; logo: string | null; venueName: string | null; venueCity: string | null;
}
interface Player {
  id: number; name: string; firstname: string | null; lastname: string | null;
  age: number | null; nationality: string | null; height: string | null;
  weight: string | null; photo: string | null; injured: boolean;
}
interface Standing {
  id: number; rank: number; points: number; played: number | null;
  win: number | null; draw: number | null; lose: number | null;
  goalsFor: number | null; goalsAgainst: number | null;
  league: { id: number; name: string }; season: { year: string } | null;
}
interface RecentMatch {
  id: number; utcDate: string; leagueName: string; homeScore: number | null;
  awayScore: number | null; side: 'home' | 'away';
  opponent: { id: number; name: string; code: string | null; logo: string | null };
}
interface TeamDetail { team: Team; players: Player[]; standings: Standing[]; recentMatches: RecentMatch[] }

function Result({ side, hs, as: away }: { side: 'home' | 'away'; hs: number | null; as: number | null }) {
  if (hs == null || away == null) return <span className="text-muted-2">-</span>;
  const ourScore = side === 'home' ? hs : away;
  const theirScore = side === 'home' ? away : hs;
  const outcome = ourScore > theirScore ? 'W' : ourScore === theirScore ? 'D' : 'L';
  const color = outcome === 'W' ? 'bg-win/10 text-win' : outcome === 'D' ? 'bg-draw/10 text-draw' : 'bg-loss/10 text-loss';
  return <span className={`rounded px-2 py-1 font-mono text-[9px] font-bold ${color}`}>{outcome} {hs}-{away}</span>;
}

export default function TeamDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teams/${params.id}`)
      .then(r => r.json())
      .then((d: TeamDetail & { error?: string }) => {
        if (!d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner message="Loading team..." />;
  if (!data) return <div className="py-20 text-center text-loss">Team not found.</div>;

  const { team, players, standings, recentMatches } = data;

  return (
    <div className="gaffer-screen space-y-6">
      <Link href="/teams" className="inline-flex font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-muted hover:text-lime">
        Back to teams
      </Link>

      <section className="border border-border bg-panel p-6 rounded-card sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-card border border-border bg-bg">
            {team.logo ? (
              <img src={team.logo} alt="" className="h-20 w-20 object-contain" />
            ) : (
              <span className="font-display text-2xl text-muted">{team.code ?? '?'}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-lime">Club profile</p>
            <h1 className="mt-2 font-display text-[clamp(44px,7vw,78px)] uppercase leading-[0.9] tracking-[0.5px] text-ink">
              {team.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
              {team.code && <span>{team.code}</span>}
              {team.country && <span>{team.country}</span>}
              {team.founded && <span>Founded {team.founded}</span>}
              {team.venueName && <span>{team.venueName}{team.venueCity ? ` / ${team.venueCity}` : ''}</span>}
            </div>
          </div>
        </div>
      </section>

      {standings.length > 0 && (
        <section className="overflow-hidden border border-border bg-panel rounded-card">
          <div className="border-b border-border px-5 py-4">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Competition record</p>
            <h2 className="mt-1 text-base font-extrabold text-ink">League standings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border bg-panel-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                  <th className="px-5 py-3 text-left">League</th>
                  <th className="px-4 py-3 text-left">Season</th>
                  <th className="px-4 py-3 text-center">Rank</th>
                  <th className="px-4 py-3 text-center">Played</th>
                  <th className="px-4 py-3 text-center">W-D-L</th>
                  <th className="px-4 py-3 text-center">GF-GA</th>
                  <th className="px-5 py-3 text-right text-lime">Points</th>
                </tr>
              </thead>
              <tbody>
                {standings.map(standing => (
                  <tr key={standing.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-semibold text-ink">{standing.league.name}</td>
                    <td className="px-4 py-3 text-muted">{standing.season?.year ?? '-'}</td>
                    <td className="px-4 py-3 text-center font-mono text-ink">{standing.rank}</td>
                    <td className="px-4 py-3 text-center text-muted">{standing.played ?? '-'}</td>
                    <td className="px-4 py-3 text-center text-muted">{standing.win ?? '-'}-{standing.draw ?? '-'}-{standing.lose ?? '-'}</td>
                    <td className="px-4 py-3 text-center text-muted">{standing.goalsFor ?? '-'}-{standing.goalsAgainst ?? '-'}</td>
                    <td className="px-5 py-3 text-right font-display text-lg text-lime">{standing.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-border bg-panel p-5 rounded-card">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Roster</p>
              <h2 className="mt-1 text-base font-extrabold text-ink">Squad</h2>
            </div>
            <span className="font-mono text-[10px] text-muted">{players.length} players</span>
          </div>
          {players.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted">
              No players are available. Run a player sync from{' '}
              <Link href="/admin/sync" className="font-semibold text-lime">Admin Sync</Link>.
            </p>
          ) : (
            <div className="max-h-[520px] overflow-y-auto scrollbar-thin">
              {players.map(player => (
                <Link key={player.id} href={`/players/${player.id}`} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-chip border border-border bg-bg">
                    {player.photo ? (
                      <img src={player.photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-[11px] text-muted">{player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{player.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">{player.nationality ?? '-'}{player.age != null ? ` / ${player.age}y` : ''}</p>
                  </div>
                  {player.injured && <span className="rounded bg-loss/10 px-2 py-1 font-mono text-[9px] font-bold text-loss">INJ</span>}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="border border-border bg-panel p-5 rounded-card">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Form</p>
              <h2 className="mt-1 text-base font-extrabold text-ink">Recent matches</h2>
            </div>
            <span className="font-mono text-[10px] text-muted">{recentMatches.length} matches</span>
          </div>
          {recentMatches.length === 0 ? (
            <p className="text-sm text-muted">No finished matches are available for this team.</p>
          ) : (
            <div>
              {recentMatches.map(match => (
                <button
                  key={match.id}
                  onClick={() => router.push(`/matches/${match.id}`)}
                  className="grid w-full grid-cols-[52px_20px_1fr_auto] items-center gap-2 border-b border-border py-3 text-left last:border-0"
                >
                  <span className="font-mono text-[10px] text-muted">{format(new Date(match.utcDate), 'dd MMM')}</span>
                  <span className="font-mono text-[9px] text-muted-2">{match.side === 'home' ? 'H' : 'A'}</span>
                  <span className="truncate text-sm text-ink">{match.opponent.name}</span>
                  <Result side={match.side} hs={match.homeScore} as={match.awayScore} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
