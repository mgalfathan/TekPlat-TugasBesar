interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'blue' | 'amber';
}

const accents = {
  green: 'border-[#00d4aa] text-[#00d4aa]',
  blue: 'border-[#0ea5e9] text-[#0ea5e9]',
  amber: 'border-amber-400 text-amber-400',
};

export function StatCard({ label, value, sub, accent = 'green' }: StatCardProps) {
  return (
    <div className={`bg-[#111827] border-l-4 ${accents[accent]} rounded-lg p-5`}>
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
