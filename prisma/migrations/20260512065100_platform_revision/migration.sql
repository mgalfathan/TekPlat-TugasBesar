/*
  Warnings:

  - You are about to drop the `Competition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `competitionId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `group` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdated` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `matchday` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `stage` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `competitionId` on the `Standing` table. All the data in the column will be lost.
  - You are about to drop the column `goalDifference` on the `Standing` table. All the data in the column will be lost.
  - You are about to drop the column `lost` on the `Standing` table. All the data in the column will be lost.
  - You are about to drop the column `playedGames` on the `Standing` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `Standing` table. All the data in the column will be lost.
  - You are about to drop the column `won` on the `Standing` table. All the data in the column will be lost.
  - You are about to drop the column `crest` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `shortName` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `tla` on the `Team` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `CustomMetric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leagueId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `awayTeamId` to the `Prediction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `homeTeamId` to the `Prediction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leagueId` to the `Standing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `Standing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rank` to the `Standing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Competition_externalId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Competition";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Country" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "flag" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "League" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "logo" TEXT,
    "countryId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "League_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Season" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "leagueId" INTEGER NOT NULL,
    "year" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Season_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "teamId" INTEGER,
    "name" TEXT NOT NULL,
    "firstname" TEXT,
    "lastname" TEXT,
    "age" INTEGER,
    "birthDate" DATETIME,
    "nationality" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "injured" BOOLEAN NOT NULL DEFAULT false,
    "photo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamMatchStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "homeTeamId" INTEGER,
    "awayTeamId" INTEGER,
    "shotsOnGoal" INTEGER,
    "shotsOffGoal" INTEGER,
    "totalShots" INTEGER,
    "blockedShots" INTEGER,
    "shotsInsideBox" INTEGER,
    "shotsOutsideBox" INTEGER,
    "fouls" INTEGER,
    "cornerKicks" INTEGER,
    "offsides" INTEGER,
    "ballPossession" TEXT,
    "yellowCards" INTEGER,
    "redCards" INTEGER,
    "goalkeeperSaves" INTEGER,
    "totalPasses" INTEGER,
    "passesAccurate" INTEGER,
    "passesPercentage" TEXT,
    "expectedGoals" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamMatchStats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeamMatchStats_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TeamMatchStats_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerMatchStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "playerId" INTEGER NOT NULL,
    "minutes" INTEGER,
    "number" INTEGER,
    "position" TEXT,
    "rating" TEXT,
    "captain" BOOLEAN NOT NULL DEFAULT false,
    "substitute" BOOLEAN NOT NULL DEFAULT false,
    "offsides" INTEGER,
    "shotsTotal" INTEGER,
    "shotsOn" INTEGER,
    "goalsTotal" INTEGER,
    "goalsConceded" INTEGER,
    "assists" INTEGER,
    "saves" INTEGER,
    "passesTotal" INTEGER,
    "passesKey" INTEGER,
    "passesAccuracy" TEXT,
    "tacklesTotal" INTEGER,
    "tacklesBlocks" INTEGER,
    "tacklesInterceptions" INTEGER,
    "duelsTotal" INTEGER,
    "duelsWon" INTEGER,
    "dribblesAttempts" INTEGER,
    "dribblesSuccess" INTEGER,
    "foulsDrawn" INTEGER,
    "foulsCommitted" INTEGER,
    "cardsYellow" INTEGER,
    "cardsRed" INTEGER,
    "penaltyWon" INTEGER,
    "penaltyCommitted" INTEGER,
    "penaltyScored" INTEGER,
    "penaltyMissed" INTEGER,
    "penaltySaved" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerMatchStats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerMatchStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "matchId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "playerId" INTEGER,
    "assistPlayerId" INTEGER,
    "elapsed" INTEGER,
    "extra" INTEGER,
    "type" TEXT,
    "detail" TEXT,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MatchEvent_assistPlayerId_fkey" FOREIGN KEY ("assistPlayerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetricResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customMetricId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "playerId" INTEGER,
    "result" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetricResult_customMetricId_fkey" FOREIGN KEY ("customMetricId") REFERENCES "CustomMetric" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MetricResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "country" TEXT,
    "leagueId" TEXT,
    "season" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomMetric" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'team',
    "formula" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CustomMetric" ("createdAt", "description", "formula", "id", "name") SELECT "createdAt", "description", "formula", "id", "name" FROM "CustomMetric";
DROP TABLE "CustomMetric";
ALTER TABLE "new_CustomMetric" RENAME TO "CustomMetric";
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "seasonId" INTEGER,
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "referee" TEXT,
    "timezone" TEXT,
    "utcDate" DATETIME NOT NULL,
    "statusLong" TEXT,
    "statusShort" TEXT NOT NULL DEFAULT 'NS',
    "elapsed" INTEGER,
    "venueName" TEXT,
    "venueCity" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "halftimeHomeScore" INTEGER,
    "halftimeAwayScore" INTEGER,
    "fulltimeHomeScore" INTEGER,
    "fulltimeAwayScore" INTEGER,
    "extraHomeScore" INTEGER,
    "extraAwayScore" INTEGER,
    "penaltyHomeScore" INTEGER,
    "penaltyAwayScore" INTEGER,
    "winner" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("awayScore", "awayTeamId", "createdAt", "externalId", "homeScore", "homeTeamId", "id", "updatedAt", "utcDate", "winner") SELECT "awayScore", "awayTeamId", "createdAt", "externalId", "homeScore", "homeTeamId", "id", "updatedAt", "utcDate", "winner" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE UNIQUE INDEX "Match_provider_externalId_key" ON "Match"("provider", "externalId");
CREATE TABLE "new_Prediction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER,
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "leagueId" INTEGER,
    "season" TEXT,
    "homeWinProbability" REAL NOT NULL,
    "drawProbability" REAL NOT NULL,
    "awayWinProbability" REAL NOT NULL,
    "predictedHomeGoals" REAL NOT NULL,
    "predictedAwayGoals" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "explanation" TEXT,
    "factors" TEXT,
    "modelVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Prediction_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prediction_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prediction" ("awayWinProbability", "confidence", "createdAt", "drawProbability", "explanation", "homeWinProbability", "id", "matchId", "predictedAwayGoals", "predictedHomeGoals", "updatedAt") SELECT "awayWinProbability", "confidence", "createdAt", "drawProbability", "explanation", "homeWinProbability", "id", "matchId", "predictedAwayGoals", "predictedHomeGoals", "updatedAt" FROM "Prediction";
DROP TABLE "Prediction";
ALTER TABLE "new_Prediction" RENAME TO "Prediction";
CREATE TABLE "new_Standing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "seasonId" INTEGER,
    "teamId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "goalsDiff" INTEGER,
    "group" TEXT,
    "form" TEXT,
    "status" TEXT,
    "description" TEXT,
    "played" INTEGER,
    "win" INTEGER,
    "draw" INTEGER,
    "lose" INTEGER,
    "goalsFor" INTEGER,
    "goalsAgainst" INTEGER,
    "homePlayed" INTEGER,
    "homeWin" INTEGER,
    "homeDraw" INTEGER,
    "homeLose" INTEGER,
    "homeGoalsFor" INTEGER,
    "homeGoalsAgainst" INTEGER,
    "awayPlayed" INTEGER,
    "awayWin" INTEGER,
    "awayDraw" INTEGER,
    "awayLose" INTEGER,
    "awayGoalsFor" INTEGER,
    "awayGoalsAgainst" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Standing_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Standing_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Standing_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Standing" ("createdAt", "draw", "form", "goalsAgainst", "goalsFor", "id", "points", "teamId", "updatedAt") SELECT "createdAt", "draw", "form", "goalsAgainst", "goalsFor", "id", "points", "teamId", "updatedAt" FROM "Standing";
DROP TABLE "Standing";
ALTER TABLE "new_Standing" RENAME TO "Standing";
CREATE UNIQUE INDEX "Standing_provider_leagueId_teamId_key" ON "Standing"("provider", "leagueId", "teamId");
CREATE TABLE "new_Team" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "country" TEXT,
    "founded" INTEGER,
    "national" BOOLEAN NOT NULL DEFAULT false,
    "logo" TEXT,
    "venueName" TEXT,
    "venueCity" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Team" ("createdAt", "externalId", "id", "name", "updatedAt") SELECT "createdAt", "externalId", "id", "name", "updatedAt" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
CREATE UNIQUE INDEX "Team_provider_externalId_key" ON "Team"("provider", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Country_provider_name_key" ON "Country"("provider", "name");

-- CreateIndex
CREATE UNIQUE INDEX "League_provider_externalId_key" ON "League"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_provider_leagueId_year_key" ON "Season"("provider", "leagueId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Player_provider_externalId_key" ON "Player"("provider", "externalId");
