'use client';
interface League { id: number; name: string; country?: { name: string } | null }
interface Props {
  leagues: League[];
  selectedLeagueId: string;
  selectedSeason: string;
  onLeagueChange: (v: string) => void;
  onSeasonChange: (v: string) => void;
  seasons?: string[];
}

const DEFAULT_SEASONS = ['2025', '2024', '2023', '2022'];

export default function LeagueSeasonSelector({ leagues, selectedLeagueId, selectedSeason, onLeagueChange, onSeasonChange, seasons = DEFAULT_SEASONS }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={selectedLeagueId}
        onChange={e => onLeagueChange(e.target.value)}
        className="bg-[#1a2535] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa]"
      >
        <option value="">All Leagues</option>
        {leagues.map(l => (
          <option key={l.id} value={String(l.id)}>{l.country?.name ? `${l.country.name} — ` : ''}{l.name}</option>
        ))}
      </select>
      <select
        value={selectedSeason}
        onChange={e => onSeasonChange(e.target.value)}
        className="bg-[#1a2535] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa]"
      >
        <option value="">All Seasons</option>
        {seasons.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}
