'use client';
import { useState, useEffect } from 'react';
import ProbabilityBar from '@/components/ProbabilityBar';
import LeagueSeasonSelector from '@/components/LeagueSeasonSelector';

interface Team { id: number; name: string; logo?: string | null }
interface League { id: number; name: string; country?: { name: string } | null }
interface Prediction { homeTeam: Team; awayTeam: Team; homeWinProbability: number; drawProbability: number; awayWinProbability: number; predictedHomeGoals: number; predictedAwayGoals: number; confidence: number; explanation: string }

export default function NewPredictionPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [season, setSeason] = useState('2025');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [result, setResult] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/standings').then(r => r.json()).then(d => setLeagues(d.leagues ?? []));
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (leagueId) qs.set('leagueId', leagueId);
    fetch(`/api/teams?${qs}`).then(r => r.json()).then(d => setTeams(Array.isArray(d) ? d : []));
  }, [leagueId]);

  async function generate() {
    if (!homeTeamId || !awayTeamId) { setError('Select both teams'); return; }
    if (homeTeamId === awayTeamId) { setError('Teams must be different'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/predictions/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeTeamId: parseInt(homeTeamId), awayTeamId: parseInt(awayTeamId), leagueId: leagueId || undefined, season }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">New Prediction</h1>
      <p className="text-gray-500 text-sm mb-6">Probabilistic prediction based on available historical data.</p>

      <div className="bg-[#111827] border border-white/5 rounded-xl p-6 space-y-5">
        <LeagueSeasonSelector leagues={leagues} selectedLeagueId={leagueId} selectedSeason={season} onLeagueChange={setLeagueId} onSeasonChange={setSeason} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Home Team</label>
            <select value={homeTeamId} onChange={e => setHomeTeamId(e.target.value)}
              className="w-full bg-[#1a2535] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa]">
              <option value="">Select team</option>
              {teams.filter(t => String(t.id) !== awayTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Away Team</label>
            <select value={awayTeamId} onChange={e => setAwayTeamId(e.target.value)}
              className="w-full bg-[#1a2535] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa]">
              <option value="">Select team</option>
              {teams.filter(t => String(t.id) !== homeTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button onClick={generate} disabled={loading || !homeTeamId || !awayTeamId}
          className="w-full py-2.5 bg-[#00d4aa] hover:bg-[#00b899] text-black font-semibold rounded-lg transition disabled:opacity-50">
          {loading ? 'Generating…' : 'Generate Prediction'}
        </button>
      </div>

      {result && (
        <div className="mt-6 bg-[#111827] border border-[#00d4aa]/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold">{result.homeTeam.name} vs {result.awayTeam.name}</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#00d4aa]/10 text-[#00d4aa]">
              {Math.round(result.confidence * 100)}% confidence
            </span>
          </div>
          <div className="text-center py-2">
            <div className="text-4xl font-bold text-white font-mono">{result.predictedHomeGoals} — {result.predictedAwayGoals}</div>
            <div className="text-gray-500 text-xs mt-1">Predicted score</div>
          </div>
          <ProbabilityBar homeProb={result.homeWinProbability} drawProb={result.drawProbability} awayProb={result.awayWinProbability} homeLabel={result.homeTeam.name} awayLabel={result.awayTeam.name} />
          <p className="text-gray-400 text-sm">{result.explanation}</p>
        </div>
      )}
    </div>
  );
}
