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
  winner: string | null;
  homeTeam: Team; awayTeam: Team; league: League; season: Season | null;
  predictions: Prediction[];
}

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];

function Row({ label, value }: { label: string; value: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200">{value}</span>
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
  if (!match) return <div className="text-center py-20 text-red-400">Match not found.</div>;

  const isFinished = FINISHED.includes(match.statusShort);
  const prediction = match.predictions[0];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/results" className="text-sm text-slate-500 hover:text-[#00d4aa] mb-2 inline-block">
          ← Back
        </Link>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <p className="text-slate-400 text-sm text-center mb-4">
            {match.league.country?.name ? `${match.league.country.name} · ` : ''}{match.league.name}
            {match.season?.year ? ` · ${match.season.year}` : ''}
          </p>
          <div className="grid grid-cols-3 items-center gap-4">
            <div className="text-center">
              {match.homeTeam.logo && <img src={match.homeTeam.logo} alt="" className="w-16 h-16 object-contain mx-auto mb-2" />}
              <p className="text-xl font-black text-white">{match.homeTeam.name}</p>
              <p className="text-slate-500 text-xs">Home</p>
            </div>
            <div className="text-center px-4">
              {isFinished ? (
                <p className="text-5xl font-black text-[#00d4aa]">{match.homeScore ?? '–'} – {match.awayScore ?? '–'}</p>
              ) : (
                <p className="text-3xl font-bold text-slate-300">vs</p>
              )}
              <p className="text-slate-500 text-xs mt-2">{format(new Date(match.utcDate), 'dd MMM yyyy, HH:mm')}</p>
              <p className="text-slate-600 text-xs">{match.statusLong ?? match.statusShort}</p>
            </div>
            <div className="text-center">
              {match.awayTeam.logo && <img src={match.awayTeam.logo} alt="" className="w-16 h-16 object-contain mx-auto mb-2" />}
              <p className="text-xl font-black text-white">{match.awayTeam.name}</p>
              <p className="text-slate-500 text-xs">Away</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-bold mb-3">Match Info</h2>
          <Row label="Status" value={match.statusLong ?? match.statusShort} />
          <Row label="Date" value={format(new Date(match.utcDate), 'EEEE, dd MMMM yyyy')} />
          <Row label="Kick-off" value={format(new Date(match.utcDate), 'HH:mm')} />
          <Row label="Venue" value={match.venueName} />
          <Row label="City" value={match.venueCity} />
          <Row label="Referee" value={match.referee} />
          <Row label="League" value={match.league.name} />
          <Row label="Season" value={match.season?.year ?? null} />
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-bold mb-3">Score Breakdown</h2>
          {isFinished ? (
            <>
              <Row label="Halftime" value={match.halftimeHomeScore != null ? `${match.halftimeHomeScore} – ${match.halftimeAwayScore}` : null} />
              <Row label="Full time" value={match.fulltimeHomeScore != null ? `${match.fulltimeHomeScore} – ${match.fulltimeAwayScore}` : `${match.homeScore} – ${match.awayScore}`} />
              <Row label="Winner" value={
                match.winner === 'HOME_TEAM' ? match.homeTeam.name :
                match.winner === 'AWAY_TEAM' ? match.awayTeam.name : 'Draw'
              } />
            </>
          ) : (
            <p className="text-slate-500 text-sm">Match not finished yet.</p>
          )}
        </div>
      </div>

      {prediction && (
        <div className="bg-[#111827] border border-[#00d4aa]/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold">Prediction</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#00d4aa]/10 text-[#00d4aa]">
              {Math.round(prediction.confidence * 100)}% confidence
            </span>
          </div>
          <div className="text-center mb-3">
            <span className="text-3xl font-black text-white">{prediction.predictedHomeGoals} — {prediction.predictedAwayGoals}</span>
          </div>
          <ProbabilityBar
            homeProb={prediction.homeWinProbability}
            drawProb={prediction.drawProbability}
            awayProb={prediction.awayWinProbability}
            homeLabel={match.homeTeam.name}
            awayLabel={match.awayTeam.name}
          />
          {prediction.explanation && <p className="text-slate-400 text-xs mt-3">{prediction.explanation}</p>}
        </div>
      )}
    </div>
  );
}
