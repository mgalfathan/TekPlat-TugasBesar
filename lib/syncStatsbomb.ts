import { prisma } from './prisma';
import {
  fetchSbCompetitions, fetchSbMatches, fetchSbLineups, fetchSbEvents,
  SbRawEvent,
} from './statsbombClient';

export interface SbSyncResult {
  competitions: number;
  teams: number;
  players: number;
  matches: number;
  lineupEntries: number;
  events: number;
  errors: string[];
}

const KEY_EVENT_TYPES = new Set([
  'Shot', 'Substitution', 'Foul Committed', 'Bad Behaviour',
  'Own Goal For', 'Own Goal Against',
]);

function isKeyEvent(event: SbRawEvent): boolean {
  if (KEY_EVENT_TYPES.has(event.type.name)) return true;
  if (event.type.name === 'Pass' && (event.pass?.goal_assist || event.pass?.shot_assist)) return true;
  return false;
}

function buildExtras(event: SbRawEvent): string | null {
  const data: Record<string, unknown> = {};
  if (event.shot) {
    data.shot = {
      xg: event.shot.statsbomb_xg,
      outcome: event.shot.outcome?.name,
      technique: event.shot.technique?.name,
      bodyPart: event.shot.body_part?.name,
      endLocation: event.shot.end_location,
    };
  }
  if (event.pass) {
    data.pass = {
      goalAssist: event.pass.goal_assist,
      shotAssist: event.pass.shot_assist,
      outcome: event.pass.outcome?.name,
      recipient: event.pass.recipient?.name,
    };
  }
  if (event.substitution) {
    data.substitution = {
      replacement: event.substitution.replacement?.name,
      outcome: event.substitution.outcome?.name,
    };
  }
  if (event.bad_behaviour) data.card = event.bad_behaviour.card?.name;
  if (event.foul_committed) {
    data.foul = {
      card: event.foul_committed.card?.name,
      type: event.foul_committed.type?.name,
    };
  }
  return Object.keys(data).length ? JSON.stringify(data) : null;
}

export async function syncSbCompetitions(): Promise<number> {
  const list = await fetchSbCompetitions();
  for (const c of list) {
    await prisma.sbCompetition.upsert({
      where: { competitionId_seasonId: { competitionId: c.competition_id, seasonId: c.season_id } },
      update: { competitionName: c.competition_name, countryName: c.country_name, seasonName: c.season_name, competitionGender: c.competition_gender },
      create: {
        competitionId: c.competition_id,
        seasonId: c.season_id,
        competitionName: c.competition_name,
        countryName: c.country_name,
        competitionGender: c.competition_gender,
        seasonName: c.season_name,
      },
    });
  }
  return list.length;
}

export async function syncSbAll(competitionId: number, seasonId: number): Promise<SbSyncResult> {
  const errors: string[] = [];
  let teams = 0, players = 0, lineupEntries = 0, events = 0;

  const competition = await prisma.sbCompetition.findUnique({
    where: { competitionId_seasonId: { competitionId, seasonId } },
  });
  if (!competition) {
    throw new Error(`Competition ${competitionId}/${seasonId} not found — run syncSbCompetitions first`);
  }

  const rawMatches = await fetchSbMatches(competitionId, seasonId);
  let matchCount = 0;

  for (const rm of rawMatches) {
    try {
      const homeTeam = await prisma.sbTeam.upsert({
        where: { statsbombId: rm.home_team.home_team_id },
        update: { name: rm.home_team.home_team_name },
        create: {
          statsbombId: rm.home_team.home_team_id,
          name: rm.home_team.home_team_name,
          gender: rm.home_team.home_team_gender,
          country: rm.home_team.country?.name,
        },
      });

      const awayTeam = await prisma.sbTeam.upsert({
        where: { statsbombId: rm.away_team.away_team_id },
        update: { name: rm.away_team.away_team_name },
        create: {
          statsbombId: rm.away_team.away_team_id,
          name: rm.away_team.away_team_name,
          gender: rm.away_team.away_team_gender,
          country: rm.away_team.country?.name,
        },
      });
      teams += 2;

      const sbMatch = await prisma.sbMatch.upsert({
        where: { statsbombId: rm.match_id },
        update: { homeScore: rm.home_score, awayScore: rm.away_score },
        create: {
          statsbombId: rm.match_id,
          competitionId: competition.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeScore: rm.home_score,
          awayScore: rm.away_score,
          matchDate: new Date(`${rm.match_date}T${(rm.kick_off ?? '00:00:00').slice(0, 8)}Z`),
          kickOff: rm.kick_off,
          matchWeek: rm.match_week,
          stage: rm.competition_stage?.name,
          stadium: rm.stadium?.name,
          referee: rm.referee?.name,
        },
      });
      matchCount++;

      const lineups = await fetchSbLineups(rm.match_id);
      for (const lt of lineups) {
        const team = lt.team_id === rm.home_team.home_team_id ? homeTeam : awayTeam;
        for (const lp of lt.lineup) {
          const player = await prisma.sbPlayer.upsert({
            where: { statsbombId: lp.player_id },
            update: { name: lp.player_name, nickname: lp.player_nickname, country: lp.country?.name },
            create: {
              statsbombId: lp.player_id,
              name: lp.player_name,
              nickname: lp.player_nickname,
              country: lp.country?.name,
            },
          });
          players++;
          await prisma.sbLineupEntry.upsert({
            where: { matchId_teamId_playerId: { matchId: sbMatch.id, teamId: team.id, playerId: player.id } },
            update: {},
            create: {
              matchId: sbMatch.id,
              teamId: team.id,
              playerId: player.id,
              jerseyNumber: lp.jersey_number,
              positions: JSON.stringify(lp.positions),
              cards: JSON.stringify(lp.cards),
            },
          });
          lineupEntries++;
        }
      }

      await prisma.sbEvent.deleteMany({ where: { matchId: sbMatch.id } });
      const rawEvents = await fetchSbEvents(rm.match_id);
      const keyEvents = rawEvents.filter(isKeyEvent);

      for (const ev of keyEvents) {
        const player = ev.player
          ? await prisma.sbPlayer.findUnique({ where: { statsbombId: ev.player.id } })
          : null;
        const evTeam = await prisma.sbTeam.findUnique({ where: { statsbombId: ev.team.id } });

        await prisma.sbEvent.create({
          data: {
            id: ev.id,
            matchId: sbMatch.id,
            eventIndex: ev.index,
            period: ev.period,
            minute: ev.minute,
            second: ev.second,
            typeName: ev.type.name,
            playerId: player?.id ?? null,
            playerName: ev.player?.name ?? null,
            teamId: evTeam?.id ?? null,
            teamName: ev.team.name,
            location: ev.location ? JSON.stringify(ev.location) : null,
            extras: buildExtras(ev),
          },
        });
        events++;
      }
    } catch (err) {
      errors.push(`Match ${rm.match_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { competitions: 1, teams, players, matches: matchCount, lineupEntries, events, errors };
}
