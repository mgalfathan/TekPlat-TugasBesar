-- CreateTable
CREATE TABLE "SbCompetition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitionId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "competitionName" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "competitionGender" TEXT NOT NULL DEFAULT 'male',
    "seasonName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SbTeam" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "statsbombId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "country" TEXT
);

-- CreateTable
CREATE TABLE "SbPlayer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "statsbombId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "country" TEXT
);

-- CreateTable
CREATE TABLE "SbMatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "statsbombId" INTEGER NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "matchDate" DATETIME NOT NULL,
    "kickOff" TEXT,
    "matchWeek" INTEGER,
    "stage" TEXT,
    "stadium" TEXT,
    "referee" TEXT,
    CONSTRAINT "SbMatch_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "SbCompetition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SbMatch_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "SbTeam" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SbMatch_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "SbTeam" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SbLineupEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "jerseyNumber" INTEGER,
    "positions" TEXT,
    "cards" TEXT,
    CONSTRAINT "SbLineupEntry_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "SbMatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SbLineupEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SbTeam" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SbLineupEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SbPlayer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SbEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" INTEGER NOT NULL,
    "eventIndex" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "second" INTEGER NOT NULL,
    "typeName" TEXT NOT NULL,
    "playerId" INTEGER,
    "playerName" TEXT,
    "teamId" INTEGER,
    "teamName" TEXT,
    "location" TEXT,
    "extras" TEXT,
    CONSTRAINT "SbEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "SbMatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SbEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SbPlayer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SbEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SbTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SbCompetition_competitionId_seasonId_key" ON "SbCompetition"("competitionId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "SbTeam_statsbombId_key" ON "SbTeam"("statsbombId");

-- CreateIndex
CREATE UNIQUE INDEX "SbPlayer_statsbombId_key" ON "SbPlayer"("statsbombId");

-- CreateIndex
CREATE UNIQUE INDEX "SbMatch_statsbombId_key" ON "SbMatch"("statsbombId");

-- CreateIndex
CREATE UNIQUE INDEX "SbLineupEntry_matchId_teamId_playerId_key" ON "SbLineupEntry"("matchId", "teamId", "playerId");
