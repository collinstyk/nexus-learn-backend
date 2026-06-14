/*
  Warnings:

  - The values [COOP_2V2] on the enum `BattleMode` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BattleMode_new" AS ENUM ('FLASH_CLASH', 'BATTLE_ROYALE', 'SPRINT', 'BUZZER', 'PASS_THE_QUESTION', 'COOP');
ALTER TABLE "BattleSession" ALTER COLUMN "mode" TYPE "BattleMode_new" USING ("mode"::text::"BattleMode_new");
ALTER TYPE "BattleMode" RENAME TO "BattleMode_old";
ALTER TYPE "BattleMode_new" RENAME TO "BattleMode";
DROP TYPE "public"."BattleMode_old";
COMMIT;
