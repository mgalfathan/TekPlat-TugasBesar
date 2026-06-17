import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="relative max-w-3xl w-full">
        {/* ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-72 rounded-full bg-[#00d4aa]/10 blur-3xl -z-10" />
        <div className="absolute top-10 -left-20 w-72 h-72 rounded-full bg-[#5d9bff]/10 blur-3xl -z-10" />

        <div className="inline-flex items-center gap-2 bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-full px-4 py-1.5 text-[#00d4aa] text-sm mb-8">
          ⚽ Football Data &amp; Analytics Platform
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-6 leading-[0.9]">
          THE <span className="bg-gradient-to-r from-[#00d4aa] to-[#5d9bff] bg-clip-text text-transparent">GAFFER</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          Football analytics, made simple. Explore live results and standings, break down
          team and player stats, build your own metrics, and simulate full seasons — every
          angle of the game, in one place.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-[#00d4aa] text-[#0a0f1e] font-bold px-8 py-3 rounded-lg hover:bg-[#00d4aa]/90 transition-colors"
          >
            Explore the Data
          </Link>
          <Link
            href="/simulator"
            className="border border-[#00d4aa]/40 text-[#00d4aa] font-bold px-8 py-3 rounded-lg hover:bg-[#00d4aa]/10 transition-colors"
          >
            Open Simulator
          </Link>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
        {[
          { icon: '📈', label: 'Analytics & Insights' },
          { icon: '🏆', label: 'Results & Standings' },
          { icon: '🧮', label: 'Custom Metrics' },
          { icon: '🎮', label: 'Season Simulator' },
        ].map((f) => (
          <div key={f.label} className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">{f.icon}</div>
            <div className="text-slate-300 font-medium text-sm">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
