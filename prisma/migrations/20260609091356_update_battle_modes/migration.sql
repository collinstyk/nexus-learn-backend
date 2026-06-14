-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TUTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "BattleMode" AS ENUM ('FLASH_CLASH', 'BATTLE_ROYALE', 'SPRINT', 'BUZZER', 'PASS_THE_QUESTION', 'COOP_2V2');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STUDENT';

-- CreateTable
CREATE TABLE "BattleSession" (
    "id" TEXT NOT NULL,
    "mode" "BattleMode" NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattlePlayer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "buzzedAt" TIMESTAMP(3),
    "lockoutStatus" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT,

    CONSTRAINT "BattlePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "timer" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "BattleQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleAnswer" (
    "id" TEXT NOT NULL,
    "battleQuestionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,

    CONSTRAINT "BattleAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BattlePlayer_sessionId_userId_key" ON "BattlePlayer"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "BattlePlayer" ADD CONSTRAINT "BattlePlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BattleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePlayer" ADD CONSTRAINT "BattlePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleQuestion" ADD CONSTRAINT "BattleQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BattleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleAnswer" ADD CONSTRAINT "BattleAnswer_battleQuestionId_fkey" FOREIGN KEY ("battleQuestionId") REFERENCES "BattleQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
