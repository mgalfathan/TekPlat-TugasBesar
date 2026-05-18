import { apiFootballProvider } from './apiFootballProvider';
import { footballDataProvider } from './footballDataProvider';
import type { FootballProvider } from './types';

export function getProvider(name?: string): FootballProvider {
  const prov = name ?? process.env.FOOTBALL_API_PROVIDER ?? 'api-football';
  if (prov === 'football-data') return footballDataProvider;
  return apiFootballProvider;
}
