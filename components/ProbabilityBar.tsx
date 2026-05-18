interface Props { homeProb: number; drawProb: number; awayProb: number; homeLabel: string; awayLabel: string }

export default function ProbabilityBar({ homeProb, drawProb, awayProb, homeLabel, awayLabel }: Props) {
  const hp = Math.round(homeProb * 100), dp = Math.round(drawProb * 100), ap = Math.round(awayProb * 100);
  return (
    <div className="space-y-2">
      <div className="flex rounded-full overflow-hidden h-3">
        <div className="bg-[#00d4aa] transition-all" style={{ width: `${hp}%` }} title={`${homeLabel}: ${hp}%`} />
        <div className="bg-gray-500 transition-all" style={{ width: `${dp}%` }} title={`Draw: ${dp}%`} />
        <div className="bg-blue-500 transition-all" style={{ width: `${ap}%` }} title={`${awayLabel}: ${ap}%`} />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span className="text-[#00d4aa] font-semibold">{homeLabel} {hp}%</span>
        <span>Draw {dp}%</span>
        <span className="text-blue-400 font-semibold">{ap}% {awayLabel}</span>
      </div>
    </div>
  );
}
