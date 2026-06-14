/*
  Warnings:

  - You are about to drop the column `subject` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `LearningRoadmap` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `Question` table. All the data in the column will be lost.
  - Added the required column `subjectId` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `LearningRoadmap` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Course_subject_idx";

-- DropIndex
DROP INDEX "Post_subject_idx";

-- DropIndex
DROP INDEX "Question_subject_idx";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "subject",
ADD COLUMN     "subjectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "LearningRoadmap" DROP COLUMN "subject",
ADD COLUMN     "subjectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "subject",
ADD COLUMN     "subjectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "subject",
ADD COLUMN     "subjectId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Subject";

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE INDEX "Course_subjectId_idx" ON "Course"("subjectId");

-- CreateIndex
CREATE INDEX "Post_subjectId_idx" ON "Post"("subjectId");

-- CreateIndex
CREATE INDEX "Question_subjectId_idx" ON "Question"("subjectId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRoadmap" ADD CONSTRAINT "LearningRoadmap_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
