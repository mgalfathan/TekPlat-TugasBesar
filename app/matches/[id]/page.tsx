'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface SbMatchDetail {
  id: number; statsbombId: number;
  homeScore: number | null; awayScore: number | null;
  matchDate: string; kickOff: string | null;
  matchWeek: number | null; stage: string | null;
  stadium: string | null; referee: string | null;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  competition: { competitionName: string; seasonName: string };
}

interface LineupTeam {
  team: { id: number; name: string };
  players: Array<{
    id: number; name: string; nickname: string | null;
    jerseyNumber: number | null; country: string | null;
    positions: Array<{ position: string; start_reason: string; end_reason: string | null }>;
    cards: Array<{ card_type: string; reason: string }>;
  }>;
}

interface MatchEvent {
  id: string; period: number; minute: number; second: number;
  type: string; player: string | null; team: string | null;
  extras: {
    shot?: { xg?: number; outcome?: string; bodyPart?: string };
    substitution?: { replacement?: string; outcome?: string };
    card?: string;
    foul?: { card?: string; type?: string };
    pass?: { goalAssist?: boolean; recipient?: string };
  } | null;
}

function eventIcon(type: string): string {
  if (type === 'Shot') return '⚽';
  if (type === 'Substitution') return '🔄';
  if (type === 'Foul Committed') return '⚠️';
  if (type === 'Bad Behaviour') return '🟨';
  if (type === 'Own Goal For' || type === 'Own Goal Against') return '😬';
  if (type === 'Pass') return '🎯';
  return '•';
}

function eventDesc(ev: MatchEvent): string {
  if (ev.type === 'Shot') {
    const outcome = ev.extras?.shot?.outcome ?? '';
    const xg = ev.extras?.shot?.xg != null ? ` (xG ${ev.extras.shot.xg.toFixed(2)})` : '';
    return `${outcome}${xg}`;
  }
  if (ev.type === 'Substitution') return `→ ${ev.extras?.substitution?.replacement ?? ''}`;
  if (ev.type === 'Bad Behaviour') return ev.extras?.card ?? '';
  if (ev.type === 'Foul Committed') return ev.extras?.foul?.card ? `+ ${ev.extras.foul.card}` : '';
  if (ev.type === 'Pass') return 'Goal assist';
  return '';
}

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<SbMatchDetail | null>(null);
  const [lineups, setLineups] = useState<LineupTeam[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'events' | 'lineups'>('events');

  useEffect(() => {
    const id = params.id;
    Promise.all([
      fetch(`/api/sb/matches/${id}`).then(r => r.json()),
      fetch(`/api/matches/${id}/lineups`).then(r => r.json()),
      fetch(`/api/matches/${id}/events`).then(r => r.json()),
    ]).then(([m, l, e]: [SbMatchDetail & { error?: string }, LineupTeam[], MatchEvent[]]) => {
      if (!m.error) setMatch(m);
      setLineups(Array.isArray(l) ? l : []);
      setEvents(Array.isArray(e) ? e : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner message="Loading match..." />;
  if (!match) return <div className="text-center py-20 text-red-400">Match not found.</div>;

  const goals = events.filter(e => e.type === 'Shot' && e.extras?.shot?.outcome === 'Goal');

  return (
    <div className="space-y-8">
      <div>
        <Link href="/matches" className="text-sm text-slate-500 hover:text-[#00d4aa] mb-2 inline-block">
          ← Matches
        </Link>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <p className="text-slate-400 text-sm text-center mb-4">
            {match.competition.competitionName} · {match.competition.seasonName}
            {match.stage ? ` · ${match.stage}` : ''}
            {match.matchWeek ? ` · MD ${match.matchWeek}` : ''}
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-right">
              <p className="text-2xl font-black text-white">{match.homeTeam.name}</p>
            </div>
            <div className="text-center px-6 shrink-0">
              <p className="text-5xl font-black text-[#00d4aa]">
                {match.homeScore ?? '–'} – {match.awayScore ?? '–'}
              </p>
              <p className="text-slate-500 text-xs mt-2">{format(new Date(match.matchDate), 'dd MMM yyyy')}</p>
              {match.stadium && <p className="text-slate-500 text-xs">{match.stadium}</p>}
              {match.referee && <p className="text-slate-600 text-xs">Ref: {match.referee}</p>}
            </div>
            <div className="flex-1 text-left">
              <p className="text-2xl font-black text-white">{match.awayTeam.name}</p>
            </div>
          </div>
          {goals.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-800 flex flex-wrap gap-x-6 gap-y-1 justify-center text-sm text-slate-400">
              {goals.map(g => (
                <span key={g.id}>⚽ {g.player} {g.minute}&apos;</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {(['events', 'lineups'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-[#00d4aa] text-[#0a0f1e]'
                : 'bg-[#111827] border border-gray-700 text-slate-300 hover:border-gray-500'
            }`}
          >
            {t} {t === 'events' ? `(${events.length})` : `(${lineups.reduce((s, l) => s + l.players.length, 0)})`}
          </button>
        ))}
      </div>

      {tab === 'events' && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          {events.length === 0 ? (
            <p className="text-slate-500 text-sm">No key events recorded for this match.</p>
          ) : (
            <div className="space-y-0">
              {events.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-gray-800/40 last:border-0">
                  <span className="text-slate-500 text-xs w-10 text-right shrink-0 font-mono">{ev.minute}&apos;</span>
                  <span className="text-base shrink-0">{eventIcon(ev.type)}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-200 text-sm font-medium">{ev.player ?? ev.team}</span>
                    {eventDesc(ev) && (
                      <span className="text-slate-400 text-xs ml-2">{eventDesc(ev)}</span>
                    )}
                  </div>
                  <span className="text-slate-600 text-xs shrink-0">{ev.team}</span>
                  <span className="text-slate-700 text-xs shrink-0 w-5 text-center">{ev.period}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'lineups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lineups.length === 0 ? (
            <p className="text-slate-500 text-sm col-span-2">No lineup data for this match.</p>
          ) : lineups.map(lineup => (
            <div key={lineup.team.id} className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <h3 className="text-white font-bold">{lineup.team.name}</h3>
                <p className="text-slate-500 text-xs">{lineup.players.length} players</p>
              </div>
              <div className="divide-y divide-gray-800/40">
                {lineup.players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-slate-600 text-xs w-5 text-center font-mono shrink-0">
                      {p.jerseyNumber ?? ''}
                    </span>
                    <Link href={`/players/${p.id}`} className="text-slate-200 text-sm flex-1 hover:text-[#00d4aa] transition-colors">
                      {p.name}
                    </Link>
                    <span className="text-slate-500 text-xs">{p.positions[0]?.position ?? ''}</span>
                    {p.positions[0]?.start_reason === 'Substitution' && (
                      <span className="text-blue-400 text-xs">sub</span>
                    )}
                    {p.cards.map((c, i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-3.5 rounded-sm ${c.card_type.toLowerCase().includes('yellow') ? 'bg-yellow-400' : 'bg-red-500'}`}
                        title={`${c.card_type}: ${c.reason}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
