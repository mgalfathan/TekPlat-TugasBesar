interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  // Kept for API compatibility with existing callers; cards use one lime accent.
  accent?: 'green' | 'blue' | 'amber';
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="relative overflow-hidden bg-panel border border-border rounded-inset p-5">
      <div className="font-display text-[46px] leading-none tracking-[0.5px] text-ink">{value}</div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted mt-2">{label}</div>
      {sub && <div className="font-mono text-[10px] text-muted-2 mt-1">{sub}</div>}
      <div className="absolute left-0 bottom-0 h-[3px] w-full bg-gradient-to-r from-lime to-transparent opacity-70" />
    </div>
  );
}
