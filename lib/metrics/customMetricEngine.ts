import { Parser } from 'expr-eval';
import { TEAM_VARIABLES, PLAYER_VARIABLES } from './metricVariables';

const parser = new Parser({ allowMemberAccess: false });

export function evaluateFormula(formula: string, variables: Record<string, number>): number {
  try {
    const expr = parser.parse(formula);
    return expr.evaluate(variables);
  } catch {
    throw new Error(`Invalid formula: ${formula}`);
  }
}

export function validateFormula(formula: string, scope: 'team' | 'player'): { valid: boolean; error?: string } {
  const vars = scope === 'team' ? TEAM_VARIABLES : PLAYER_VARIABLES;
  const mockVals = Object.fromEntries(vars.map(v => [v.key, 1]));
  try {
    const expr = parser.parse(formula);
    expr.evaluate(mockVals);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: String(e) };
  }
}

export function getAllowedVariables(scope: 'team' | 'player') {
  return scope === 'team' ? TEAM_VARIABLES : PLAYER_VARIABLES;
}
