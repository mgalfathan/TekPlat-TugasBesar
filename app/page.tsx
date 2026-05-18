import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-full px-4 py-1.5 text-[#00d4aa] text-sm mb-8">
          ⚽ Real Football Analytics
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
          Predict the
          <span className="text-[#00d4aa]"> Beautiful Game</span>
        </h1>
        <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto">
          Data-driven football analytics with real Premier League data, rule-based predictions,
          and custom performance metrics — all in one dashboard.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-[#00d4aa] text-[#0a0f1e] font-bold px-8 py-3 rounded-lg hover:bg-[#00d4aa]/90 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/predictions"
            className="border border-[#00d4aa]/40 text-[#00d4aa] font-bold px-8 py-3 rounded-lg hover:bg-[#00d4aa]/10 transition-colors"
          >
            View Predictions
          </Link>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
        {[
          { icon: '📊', label: 'Team Analytics' },
          { icon: '🤖', label: 'Predictions' },
          { icon: '🏆', label: 'Standings' },
          { icon: '🧮', label: 'Custom Metrics' },
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
