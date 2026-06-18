'use client';
interface League { id: number; externalId?: string; name: string; country?: { name: string } | null }
interface Props {
  leagues: League[];
  selectedLeagueId: string;
  selectedSeason: string;
  onLeagueChange: (v: string) => void;
  onSeasonChange: (v: string) => void;
  seasons?: string[];
  topOnly?: boolean;
}

const DEFAULT_SEASONS = ['2024', '2023', '2022'];
const TOP_5_EXTERNAL_IDS = new Set(['39', '140', '135', '78', '61']);

export default function LeagueSeasonSelector({
  leagues, selectedLeagueId, selectedSeason, onLeagueChange, onSeasonChange,
  seasons = DEFAULT_SEASONS, topOnly = true,
}: Props) {
  const filtered = topOnly
    ? leagues.filter(l => l.externalId && TOP_5_EXTERNAL_IDS.has(l.externalId))
    : leagues;

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={selectedLeagueId}
        onChange={e => onLeagueChange(e.target.value)}
        className="bg-panel-2 border border-border-2 text-ink rounded-chip px-3 py-2 text-sm font-semibold focus:outline-none focus:border-lime"
      >
        <option value="">All Leagues</option>
        {filtered.map(l => (
          <option key={l.id} value={String(l.id)}>{l.country?.name ? `${l.country.name} — ` : ''}{l.name}</option>
        ))}
      </select>
      <select
        value={selectedSeason}
        onChange={e => onSeasonChange(e.target.value)}
        className="bg-panel-2 border border-border-2 text-ink rounded-chip px-3 py-2 text-sm font-semibold focus:outline-none focus:border-lime"
      >
        <option value="">All Seasons</option>
        {seasons.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}
