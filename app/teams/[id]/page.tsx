'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Team { id: number; name: string; code: string | null; country: string | null; founded: number | null; logo: string | null; venueName: string | null; venueCity: string | null }
interface Player { id: number; name: string; firstname: string | null; lastname: string | null; age: number | null; nationality: string | null; height: string | null; weight: string | null; photo: string | null; injured: boolean }
interface Standing { id: number; rank: number; points: number; played: number | null; win: number | null; draw: number | null; lose: number | null; goalsFor: number | null; goalsAgainst: number | null; league: { id: number; name: string }; season: { year: string } | null }
interface RecentMatch { id: number; utcDate: string; leagueName: string; homeScore: number | null; awayScore: number | null; side: 'home' | 'away'; opponent: { id: number; name: string; code: string | null; logo: string | null } }

interface TeamDetail { team: Team; players: Player[]; standings: Standing[]; recentMatches: RecentMatch[] }

function Result({ side, hs, as: aw }: { side: 'home' | 'away'; hs: number | null; as: number | null }) {
  if (hs == null || aw == null) return <span className="text-slate-600">—</span>;
  const ourScore = side === 'home' ? hs : aw;
  const theirScore = side === 'home' ? aw : hs;
  const outcome = ourScore > theirScore ? 'W' : ourScore === theirScore ? 'D' : 'L';
  const color = outcome === 'W' ? 'bg-emerald-500/20 text-emerald-400' : outcome === 'D' ? 'bg-slate-500/20 text-slate-400' : 'bg-red-500/20 text-red-400';
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>{outcome} {hs}–{aw}</span>;
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
  if (!data) return <div className="text-center py-20 text-red-400">Team not found.</div>;

  const { team, players, standings, recentMatches } = data;

  return (
    <div className="space-y-6">
      <Link href="/teams" className="text-sm text-slate-500 hover:text-[#00d4aa] inline-block">← Teams</Link>

      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-5">
          {team.logo ? (
            <img src={team.logo} alt="" className="w-20 h-20 object-contain" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-slate-300 font-bold">{team.code ?? '?'}</div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white">{team.name}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {team.code && <span className="font-mono mr-2">{team.code}</span>}
              {team.country && <span>{team.country}</span>}
              {team.founded && <span className="text-slate-600"> · Founded {team.founded}</span>}
            </p>
            {team.venueName && (
              <p className="text-slate-500 text-xs mt-0.5">
                🏟 {team.venueName}{team.venueCity ? `, ${team.venueCity}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {standings.length > 0 && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-bold mb-3">League Standings</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-slate-400 text-xs uppercase">
                <th className="text-left py-2">League</th>
                <th className="text-left py-2">Season</th>
                <th className="text-center py-2">Rank</th>
                <th className="text-center py-2">P</th>
                <th className="text-center py-2">W-D-L</th>
                <th className="text-center py-2">GF-GA</th>
                <th className="text-right py-2 text-[#00d4aa]">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map(s => (
                <tr key={s.id} className="border-b border-gray-800/40 last:border-0">
                  <td className="py-2 text-slate-200">{s.league.name}</td>
                  <td className="py-2 text-slate-500">{s.season?.year ?? '—'}</td>
                  <td className="py-2 text-center text-slate-300 font-bold">{s.rank}</td>
                  <td className="py-2 text-center text-slate-400">{s.played ?? '—'}</td>
                  <td className="py-2 text-center text-slate-400">{s.win ?? '-'}-{s.draw ?? '-'}-{s.lose ?? '-'}</td>
                  <td className="py-2 text-center text-slate-400">{s.goalsFor ?? '-'}-{s.goalsAgainst ?? '-'}</td>
                  <td className="py-2 text-right text-[#00d4aa] font-bold">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold">Squad</h2>
            <span className="text-slate-500 text-xs">{players.length} players</span>
          </div>
          {players.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No players in DB. Sync players in <Link href="/admin/sync" className="text-[#00d4aa] hover:underline">Admin → Sync</Link> (Type: players, League ID, Season).
            </p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto -mx-2">
              {players.map(p => (
                <Link key={p.id} href={`/players/${p.id}`} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-white/5 transition">
                  {p.photo ? (
                    <img src={p.photo} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">
                      {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{p.name}</p>
                    <p className="text-slate-500 text-xs truncate">
                      {p.nationality ?? '—'}
                      {p.age != null && <span> · {p.age}y</span>}
                    </p>
                  </div>
                  {p.injured && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 shrink-0">Inj</span>}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold">Recent Matches</h2>
            <span className="text-slate-500 text-xs">{recentMatches.length} matches</span>
          </div>
          {recentMatches.length === 0 ? (
            <p className="text-slate-500 text-sm">No finished matches synced for this team.</p>
          ) : (
            <div className="space-y-1.5">
              {recentMatches.map(m => (
                <div key={m.id} onClick={() => router.push(`/matches/${m.id}`)}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5 transition cursor-pointer">
                  <span className="text-slate-500 text-xs w-12 shrink-0">{format(new Date(m.utcDate), 'dd MMM')}</span>
                  <span className="text-slate-600 text-[10px] shrink-0">{m.side === 'home' ? 'H' : 'A'}</span>
                  <span className="text-slate-300 text-sm truncate flex-1">{m.opponent.name}</span>
                  <Result side={m.side} hs={m.homeScore} as={m.awayScore} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
