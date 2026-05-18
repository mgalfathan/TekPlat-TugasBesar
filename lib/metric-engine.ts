import { Parser } from 'expr-eval';

const parser = new Parser({
  allowMemberAccess: false,
});

const ALLOWED_VARS = new Set([
  'goals_for',
  'goals_against',
  'goal_difference',
  'wins',
  'draws',
  'losses',
  'win_rate',
  'matches_played',
]);

export interface TeamMetricInput {
  teamId: number;
  teamName: string;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: number;
  matches_played: number;
}

export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    const expr = parser.parse(formula);
    const usedVars = expr.variables();
    const unknown = usedVars.filter((v: string) => !ALLOWED_VARS.has(v));
    if (unknown.length > 0) {
      return { valid: false, error: `Unknown variables: ${unknown.join(', ')}` };
    }
    return { valid: true };
  } catch (err: unknown) {
    return { valid: false, error: err instanceof Error ? err.message : 'Parse error' };
  }
}

export function evaluateFormula(formula: string, input: TeamMetricInput): number {
  const expr = parser.parse(formula);
  const result = expr.evaluate({
    goals_for: input.goals_for,
    goals_against: input.goals_against,
    goal_difference: input.goal_difference,
    wins: input.wins,
    draws: input.draws,
    losses: input.losses,
    win_rate: input.win_rate,
    matches_played: input.matches_played,
  });
  if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) {
    throw new Error('Formula produced an invalid result (NaN or Infinity)');
  }
  return Math.round(result * 100) / 100;
}
