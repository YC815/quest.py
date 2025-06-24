-- AlterTable
ALTER TABLE "_ProgressToTask" ADD CONSTRAINT "_ProgressToTask_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ProgressToTask_AB_unique";
