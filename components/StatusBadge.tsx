interface Props { status: string; elapsed?: number | null }

const LIVE = ['1H', '2H', 'ET', 'P', 'BT', 'INT', 'LIVE'];
const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];
const UPCOMING = ['NS', 'TBD', 'SCHEDULED', 'TIMED'];

export default function StatusBadge({ status, elapsed }: Props) {
  const s = status?.toUpperCase() ?? 'NS';
  if (LIVE.includes(s)) return (
    <span className="inline-flex items-center gap-1.5 rounded bg-loss/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-loss">
      <span className="h-1.5 w-1.5 rounded-full bg-loss animate-pulse" />
      {elapsed ? `${elapsed}'` : 'LIVE'}
    </span>
  );
  if (FINISHED.includes(s)) return <span className="rounded border border-border bg-white/[0.04] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-muted">FT</span>;
  if (UPCOMING.includes(s)) return <span className="rounded bg-chart-blue/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-chart-blue">Upcoming</span>;
  return <span className="rounded bg-amber-500/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-amber-400">{s}</span>;
}
