interface Props { homeProb: number; drawProb: number; awayProb: number; homeLabel: string; awayLabel: string }

export default function ProbabilityBar({ homeProb, drawProb, awayProb, homeLabel, awayLabel }: Props) {
  const hp = Math.round(homeProb * 100), dp = Math.round(drawProb * 100), ap = Math.round(awayProb * 100);
  return (
    <div className="space-y-3">
      <div className="flex h-2 overflow-hidden rounded bg-white/[0.04]">
        <div className="bg-lime transition-all" style={{ width: `${hp}%` }} title={`${homeLabel}: ${hp}%`} />
        <div className="bg-draw transition-all" style={{ width: `${dp}%` }} title={`Draw: ${dp}%`} />
        <div className="bg-chart-blue transition-all" style={{ width: `${ap}%` }} title={`${awayLabel}: ${ap}%`} />
      </div>
      <div className="grid grid-cols-3 gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.04em]">
        <span className="truncate text-lime">{homeLabel} {hp}%</span>
        <span className="text-center text-draw">Draw {dp}%</span>
        <span className="truncate text-right text-chart-blue">{ap}% {awayLabel}</span>
      </div>
    </div>
  );
}
