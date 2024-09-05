-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "nickName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "draws" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Pokemon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "statsId" INTEGER NOT NULL,
    "types" TEXT NOT NULL,
    "abilities" TEXT NOT NULL,
    "moves" TEXT NOT NULL,
    "teamId" INTEGER,
    CONSTRAINT "Pokemon_statsId_fkey" FOREIGN KEY ("statsId") REFERENCES "Stats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pokemon_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "PokemonTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "specialAttack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "specialDefense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "PokemonTeam" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    CONSTRAINT "PokemonTeam_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pokemon_statsId_key" ON "Pokemon"("statsId");
