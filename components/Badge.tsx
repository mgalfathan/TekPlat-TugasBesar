interface BadgeProps {
  label: string;
  variant?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}

const variants = {
  green: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  red: 'bg-red-500/20 text-red-400 border border-red-500/30',
  gray: 'bg-gray-700 text-gray-300',
};

export function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  );
}
