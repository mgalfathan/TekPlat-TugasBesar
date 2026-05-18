'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProbabilityBar from '@/components/ProbabilityBar';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface Team { name: string; logo?: string | null }
interface Prediction { id: number; homeTeam: Team; awayTeam: Team; homeWinProbability: number; drawProbability: number; awayWinProbability: number; predictedHomeGoals: number; predictedAwayGoals: number; confidence: number; explanation?: string | null; createdAt: string }

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/predictions').then(r => r.json()).then(d => setPredictions(d.predictions ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Predictions</h1>
          <p className="text-gray-500 text-sm">Probabilistic prediction based on available historical data.</p>
        </div>
        <Link href="/predictions/new" className="px-4 py-2 bg-[#00d4aa] hover:bg-[#00b899] text-black font-semibold rounded-lg text-sm transition">
          + New Prediction
        </Link>
      </div>

      {loading && <LoadingSkeleton rows={4} />}
      {!loading && predictions.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🔮</div>
          <p className="mb-4">No predictions yet.</p>
          <Link href="/predictions/new" className="px-4 py-2 bg-[#00d4aa]/20 text-[#00d4aa] rounded-lg text-sm hover:bg-[#00d4aa]/30 transition">Generate your first prediction</Link>
        </div>
      )}

      <div className="space-y-4">
        {predictions.map(p => (
          <div key={p.id} className="bg-[#111827] border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {p.homeTeam.logo && <img src={p.homeTeam.logo} alt="" className="w-7 h-7 object-contain" />}
                  <span className="text-white font-semibold">{p.homeTeam.name}</span>
                </div>
                <span className="text-gray-600 font-bold">vs</span>
                <div className="flex items-center gap-2">
                  {p.awayTeam.logo && <img src={p.awayTeam.logo} alt="" className="w-7 h-7 object-contain" />}
                  <span className="text-white font-semibold">{p.awayTeam.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#00d4aa] font-bold text-lg">{p.predictedHomeGoals} – {p.predictedAwayGoals}</div>
                <div className="text-gray-500 text-xs">Predicted score</div>
              </div>
            </div>
            <ProbabilityBar homeProb={p.homeWinProbability} drawProb={p.drawProbability} awayProb={p.awayWinProbability} homeLabel={p.homeTeam.name} awayLabel={p.awayTeam.name} />
            <div className="flex items-center justify-between mt-3">
              <p className="text-gray-500 text-xs flex-1 mr-4">{p.explanation}</p>
              <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#00d4aa]/10 text-[#00d4aa]">
                {Math.round(p.confidence * 100)}% confidence
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
