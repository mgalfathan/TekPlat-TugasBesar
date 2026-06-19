'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import ProbabilityBar from '@/components/ProbabilityBar';

interface Team { id: number; name: string; code: string | null; logo: string | null }
interface League { id: number; name: string; country?: { name: string } | null }
interface Season { year: string }
interface Prediction {
  id: number; homeWinProbability: number; drawProbability: number; awayWinProbability: number;
  predictedHomeGoals: number; predictedAwayGoals: number; confidence: number; explanation: string | null;
}
interface MatchDetail {
  id: number; utcDate: string; statusShort: string; statusLong: string | null;
  homeScore: number | null; awayScore: number | null;
  halftimeHomeScore: number | null; halftimeAwayScore: number | null;
  fulltimeHomeScore: number | null; fulltimeAwayScore: number | null;
  venueName: string | null; venueCity: string | null; referee: string | null;
  winner: string | null; homeTeam: Team; awayTeam: Team; league: League;
  season: Season | null; predictions: Prediction[];
}

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];

function Row({ label, value }: { label: string; value: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

function TeamMark({ team }: { team: Team }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-card border border-border bg-bg">
        {team.logo ? <img src={team.logo} alt="" className="h-16 w-16 object-contain" /> : <span className="font-display text-lg text-muted">{team.code ?? '?'}</span>}
      </div>
      <p className="mt-3 max-w-44 text-base font-extrabold text-ink">{team.name}</p>
    </div>
  );
}

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/matches/${params.id}`)
      .then(r => r.json())
      .then((d: { match?: MatchDetail; error?: string }) => {
        if (!d.error && d.match) setMatch(d.match);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner message="Loading match..." />;
  if (!match) return <div className="py-20 text-center text-loss">Match not found.</div>;

  const isFinished = FINISHED.includes(match.statusShort);
  const prediction = match.predictions[0];

  return (
    <div className="gaffer-screen space-y-6">
      <Link href="/matches" className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-muted hover:text-lime">Back to matches</Link>

      <section className="border border-border bg-panel p-5 rounded-card sm:p-8">
        <div className="mb-7 text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-lime">
            {match.league.country?.name ? `${match.league.country.name} / ` : ''}{match.league.name}
          </p>
          <p className="mt-2 font-mono text-[10px] text-muted">
            {format(new Date(match.utcDate), 'dd MMM yyyy / HH:mm')} {match.season?.year ? `/ ${match.season.year}` : ''}
          </p>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
          <TeamMark team={match.homeTeam} />
          <div className="text-center">
            <p className={`font-display leading-none ${isFinished ? 'text-[clamp(42px,8vw,76px)] text-lime' : 'text-4xl text-muted'}`}>
              {isFinished ? `${match.homeScore ?? '-'}-${match.awayScore ?? '-'}` : 'VS'}
            </p>
            <p className="mt-2 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-muted">{match.statusLong ?? match.statusShort}</p>
          </div>
          <TeamMark team={match.awayTeam} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="border border-border bg-panel p-5 rounded-card">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Match information</p>
          <Row label="Status" value={match.statusLong ?? match.statusShort} />
          <Row label="Date" value={format(new Date(match.utcDate), 'EEEE, dd MMMM yyyy')} />
          <Row label="Kick-off" value={format(new Date(match.utcDate), 'HH:mm')} />
          <Row label="Venue" value={match.venueName} />
          <Row label="City" value={match.venueCity} />
          <Row label="Referee" value={match.referee} />
          <Row label="League" value={match.league.name} />
          <Row label="Season" value={match.season?.year ?? null} />
        </section>

        <section className="border border-border bg-panel p-5 rounded-card">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Score breakdown</p>
          {isFinished ? (
            <>
              <Row label="Halftime" value={match.halftimeHomeScore != null ? `${match.halftimeHomeScore}-${match.halftimeAwayScore}` : null} />
              <Row label="Full time" value={match.fulltimeHomeScore != null ? `${match.fulltimeHomeScore}-${match.fulltimeAwayScore}` : `${match.homeScore}-${match.awayScore}`} />
              <Row label="Winner" value={match.winner === 'HOME_TEAM' ? match.homeTeam.name : match.winner === 'AWAY_TEAM' ? match.awayTeam.name : 'Draw'} />
            </>
          ) : <p className="text-sm text-muted">This match has not finished.</p>}
        </section>
      </div>

      {prediction && (
        <section className="border border-lime/20 bg-lime/[0.04] p-5 rounded-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-lime">Model output</p>
              <h2 className="mt-1 text-base font-extrabold text-ink">Match prediction</h2>
            </div>
            <span className="rounded bg-lime/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-lime">
              {Math.round(prediction.confidence * 100)}% confidence
            </span>
          </div>
          <p className="mb-5 text-center font-display text-4xl text-ink">{prediction.predictedHomeGoals}-{prediction.predictedAwayGoals}</p>
          <ProbabilityBar homeProb={prediction.homeWinProbability} drawProb={prediction.drawProbability} awayProb={prediction.awayWinProbability} homeLabel={match.homeTeam.name} awayLabel={match.awayTeam.name} />
          {prediction.explanation && <p className="mt-4 border-t border-lime/10 pt-4 text-xs leading-relaxed text-muted">{prediction.explanation}</p>}
        </section>
      )}
    </div>
  );
}
