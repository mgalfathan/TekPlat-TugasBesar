interface Props { status: string; elapsed?: number | null }

const LIVE = ['1H', '2H', 'ET', 'P', 'BT', 'INT', 'LIVE'];
const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];
const UPCOMING = ['NS', 'TBD', 'SCHEDULED', 'TIMED'];

export default function StatusBadge({ status, elapsed }: Props) {
  const s = status?.toUpperCase() ?? 'NS';
  if (LIVE.includes(s)) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      {elapsed ? `${elapsed}'` : 'LIVE'}
    </span>
  );
  if (FINISHED.includes(s)) return <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs font-semibold">FT</span>;
  if (UPCOMING.includes(s)) return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold">Upcoming</span>;
  return <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold">{s}</span>;
}
