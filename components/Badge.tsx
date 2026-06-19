interface BadgeProps {
  label: string;
  variant?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}

const variants = {
  green: 'bg-win/10 text-win border border-win/20',
  blue: 'bg-chart-blue/10 text-chart-blue border border-chart-blue/20',
  amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  red: 'bg-loss/10 text-loss border border-loss/20',
  gray: 'bg-white/[0.04] text-muted border border-border',
};

export function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.06em] ${variants[variant]}`}>
      {label}
    </span>
  );
}
