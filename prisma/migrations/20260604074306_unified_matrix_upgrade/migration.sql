/*
  Warnings:

  - You are about to drop the column `subjectId` on the `Course` table. All the data in the column will be lost.
  - Added the required column `description` to the `LearningRoadmap` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `LearningRoadmap` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "LearningRoadmap" DROP CONSTRAINT "LearningRoadmap_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_subjectId_fkey";

-- DropIndex
DROP INDEX "Course_subjectId_idx";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "subjectId";

-- AlterTable
ALTER TABLE "LearningRoadmap" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "topicId" TEXT,
ALTER COLUMN "subjectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "topicId" TEXT,
ALTER COLUMN "subjectId" DROP NOT NULL,
ALTER COLUMN "views" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "topicId" TEXT,
ALTER COLUMN "subjectId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SubjectToTopic" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SubjectToTopic_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CourseToTopic" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CourseToTopic_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_key" ON "Topic"("name");

-- CreateIndex
CREATE INDEX "_SubjectToTopic_B_index" ON "_SubjectToTopic"("B");

-- CreateIndex
CREATE INDEX "_CourseToTopic_B_index" ON "_CourseToTopic"("B");

-- CreateIndex
CREATE INDEX "LearningRoadmap_subjectId_idx" ON "LearningRoadmap"("subjectId");

-- CreateIndex
CREATE INDEX "LearningRoadmap_topicId_idx" ON "LearningRoadmap"("topicId");

-- CreateIndex
CREATE INDEX "LearningRoadmap_courseId_idx" ON "LearningRoadmap"("courseId");

-- CreateIndex
CREATE INDEX "Post_topicId_idx" ON "Post"("topicId");

-- CreateIndex
CREATE INDEX "Post_courseId_idx" ON "Post"("courseId");

-- CreateIndex
CREATE INDEX "Question_courseId_idx" ON "Question"("courseId");

-- CreateIndex
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- CreateIndex
CREATE INDEX "Resource_courseId_idx" ON "Resource"("courseId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRoadmap" ADD CONSTRAINT "LearningRoadmap_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRoadmap" ADD CONSTRAINT "LearningRoadmap_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRoadmap" ADD CONSTRAINT "LearningRoadmap_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubjectToTopic" ADD CONSTRAINT "_SubjectToTopic_A_fkey" FOREIGN KEY ("A") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubjectToTopic" ADD CONSTRAINT "_SubjectToTopic_B_fkey" FOREIGN KEY ("B") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToTopic" ADD CONSTRAINT "_CourseToTopic_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToTopic" ADD CONSTRAINT "_CourseToTopic_B_fkey" FOREIGN KEY ("B") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
