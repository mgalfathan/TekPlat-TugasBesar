export interface MetricVariable { key: string; label: string; scope: 'team' | 'player' }

export const TEAM_VARIABLES: MetricVariable[] = [
  { key: 'matches_played', label: 'Matches Played', scope: 'team' },
  { key: 'wins', label: 'Wins', scope: 'team' },
  { key: 'draws', label: 'Draws', scope: 'team' },
  { key: 'losses', label: 'Losses', scope: 'team' },
  { key: 'points', label: 'Points', scope: 'team' },
  { key: 'goals_for', label: 'Goals For', scope: 'team' },
  { key: 'goals_against', label: 'Goals Against', scope: 'team' },
  { key: 'goal_difference', label: 'Goal Difference', scope: 'team' },
  { key: 'win_rate', label: 'Win Rate (0-1)', scope: 'team' },
  { key: 'draw_rate', label: 'Draw Rate (0-1)', scope: 'team' },
  { key: 'loss_rate', label: 'Loss Rate (0-1)', scope: 'team' },
  { key: 'goals_for_per_match', label: 'Goals For / Match', scope: 'team' },
  { key: 'goals_against_per_match', label: 'Goals Against / Match', scope: 'team' },
  { key: 'clean_sheets', label: 'Clean Sheets', scope: 'team' },
  { key: 'failed_to_score', label: 'Failed to Score', scope: 'team' },
  { key: 'home_wins', label: 'Home Wins', scope: 'team' },
  { key: 'away_wins', label: 'Away Wins', scope: 'team' },
  { key: 'home_played', label: 'Home Matches', scope: 'team' },
  { key: 'away_played', label: 'Away Matches', scope: 'team' },
  { key: 'home_goals_for', label: 'Home Goals For', scope: 'team' },
  { key: 'home_goals_against', label: 'Home Goals Against', scope: 'team' },
  { key: 'away_goals_for', label: 'Away Goals For', scope: 'team' },
  { key: 'away_goals_against', label: 'Away Goals Against', scope: 'team' },
  { key: 'big_wins', label: 'Big Wins (3+ goal margin)', scope: 'team' },
  { key: 'heavy_losses', label: 'Heavy Losses (3+ goal margin)', scope: 'team' },
];

export const PLAYER_VARIABLES: MetricVariable[] = [
  { key: 'age', label: 'Age', scope: 'player' },
  { key: 'height_cm', label: 'Height (cm)', scope: 'player' },
  { key: 'weight_kg', label: 'Weight (kg)', scope: 'player' },
  { key: 'is_injured', label: 'Injured (0/1)', scope: 'player' },
  { key: 'team_points', label: "Team's Points", scope: 'player' },
  { key: 'team_win_rate', label: "Team's Win Rate", scope: 'player' },
  { key: 'team_goals_per_match', label: "Team's Goals/Match", scope: 'player' },
];

export const METRIC_TEMPLATES = {
  team: [
    { name: 'Attacking Strength', formula: '(goals_for_per_match * 3) + (home_wins * 0.5) + (big_wins * 1.5)' },
    { name: 'Defensive Stability', formula: '(clean_sheets * 3) - goals_against_per_match - (heavy_losses * 1.5)' },
    { name: 'Overall Power', formula: '(points * 2) + goal_difference + (win_rate * 100)' },
    { name: 'Home Fortress', formula: '(home_wins * 4) + (home_goals_for - home_goals_against)' },
    { name: 'Away Form', formula: '(away_wins * 4) + (away_goals_for - away_goals_against)' },
    { name: 'Consistency', formula: '(wins - heavy_losses) * 2 + (clean_sheets - failed_to_score)' },
  ],
  player: [
    { name: 'Squad Value (rough)', formula: '(team_points * 0.5) + (30 - age) * 2 + team_win_rate * 50' },
    { name: 'Veteran Bonus', formula: 'age * (team_win_rate + 1)' },
  ],
};
