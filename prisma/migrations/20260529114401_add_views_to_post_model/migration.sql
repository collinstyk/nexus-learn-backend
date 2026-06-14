/*
  Warnings:

  - Added the required column `views` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "views" INTEGER NOT NULL;
