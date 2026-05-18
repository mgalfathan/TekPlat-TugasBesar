'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Position { position: string; start_reason: string; end_reason: string | null }
interface Card { card_type: string; reason: string }

interface Appearance {
  matchId: number; statsbombMatchId: number; matchDate: string;
  competition: string; season: string;
  homeTeam: string; awayTeam: string;
  homeScore: number | null; awayScore: number | null;
  team: string; jerseyNumber: number | null;
  positions: Position[];
  cards: Card[];
}

interface PlayerDetail {
  player: { id: number; statsbombId: number; name: string; nickname: string | null; country: string | null };
  stats: { goals: number; assists: number; shots: number; xg: number; appearances: number };
  appearances: Appearance[];
}

function StatBubble({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#0a0f1e] rounded-xl p-4 text-center">
      <p className="text-2xl font-black text-[#00d4aa]">{value}</p>
      <p className="text-slate-400 text-xs mt-1">{label}</p>
    </div>
  );
}

export default function PlayerPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${params.id}`)
      .then(r => r.json())
      .then((d: PlayerDetail & { error?: string }) => {
        if (!d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner message="Loading player profile..." />;
  if (!data) return <div className="text-center py-20 text-red-400">Player not found.</div>;

  const { player, stats, appearances } = data;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/players" className="text-sm text-slate-500 hover:text-[#00d4aa] mb-2 inline-block">
          ← Players
        </Link>
        <h1 className="text-3xl font-black text-white">{player.name}</h1>
        {player.nickname && <p className="text-slate-400 text-sm mt-0.5">&quot;{player.nickname}&quot;</p>}
        {player.country && <p className="text-slate-500 text-sm mt-0.5">{player.country}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatBubble label="Appearances" value={stats.appearances} />
        <StatBubble label="Goals" value={stats.goals} />
        <StatBubble label="Assists" value={stats.assists} />
        <StatBubble label="Shots" value={stats.shots} />
        <StatBubble label="xG" value={stats.xg} />
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-bold">Match History</h2>
        </div>
        {appearances.length === 0 ? (
          <p className="text-slate-500 text-sm p-5">No appearances recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase border-b border-gray-800">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Match</th>
                <th className="text-center px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Competition</th>
                <th className="text-center px-4 py-3">Position</th>
                <th className="text-center px-4 py-3">Cards</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {appearances.map((a) => (
                <tr key={a.matchId} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    {format(new Date(a.matchDate), 'dd MMM yy')}
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium whitespace-nowrap">
                    {a.homeTeam} <span className="text-slate-500">vs</span> {a.awayTeam}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-[#00d4aa] whitespace-nowrap">
                    {a.homeScore} – {a.awayScore}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {a.competition}
                    <span className="text-slate-600 ml-1">{a.season}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400 text-xs">
                    {a.positions[0]?.position ?? '—'}
                    {a.positions[0]?.start_reason === 'Substitution' && (
                      <span className="text-blue-400 ml-1">sub</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.cards.map((c, i) => (
                      <span
                        key={i}
                        className={`inline-block w-3 h-4 rounded-sm mr-0.5 ${c.card_type.toLowerCase().includes('yellow') ? 'bg-yellow-400' : 'bg-red-500'}`}
                        title={`${c.card_type}: ${c.reason}`}
                      />
                    ))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/matches/${a.matchId}`} className="text-xs text-[#00d4aa] hover:underline">
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
