/*
  Warnings:

  - The primary key for the `Task` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `name` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Task` table. All the data in the column will be lost.
  - The `id` column on the `Task` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clerkId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `User` table. All the data in the column will be lost.
  - Added the required column `description` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `examples` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mainTaskId` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mainTaskTitle` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mainTaskTitleEn` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taskId` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titleEn` to the `Task` table without a default value. This is not possible if the table is not empty.
  - The required column `clerk_user_id` was added to the `User` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_userId_fkey";

-- DropIndex
DROP INDEX "User_clerkId_key";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Task" DROP CONSTRAINT "Task_pkey",
DROP COLUMN "name",
DROP COLUMN "userId",
ADD COLUMN     "description" JSONB NOT NULL,
ADD COLUMN     "examples" JSONB NOT NULL,
ADD COLUMN     "mainTaskId" INTEGER NOT NULL,
ADD COLUMN     "mainTaskTitle" TEXT NOT NULL,
ADD COLUMN     "mainTaskTitleEn" TEXT NOT NULL,
ADD COLUMN     "taskId" INTEGER NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "titleEn" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Task_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "clerkId",
DROP COLUMN "email",
DROP COLUMN "id",
ADD COLUMN     "clerk_user_id" TEXT NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("clerk_user_id");

-- CreateTable
CREATE TABLE "Progress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRecord" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "TaskRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeLog" (
    "id" SERIAL NOT NULL,
    "progressId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProgressToTask" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProgressToTask_AB_unique" ON "_ProgressToTask"("A", "B");

-- CreateIndex
CREATE INDEX "_ProgressToTask_B_index" ON "_ProgressToTask"("B");

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerk_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRecord" ADD CONSTRAINT "TaskRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerk_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRecord" ADD CONSTRAINT "TaskRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeLog" ADD CONSTRAINT "CodeLog_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "Progress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProgressToTask" ADD CONSTRAINT "_ProgressToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProgressToTask" ADD CONSTRAINT "_ProgressToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
