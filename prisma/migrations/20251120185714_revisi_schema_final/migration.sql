-- AlterTable
ALTER TABLE "reported_accounts" ADD COLUMN     "resolution_note" TEXT,
ADD COLUMN     "resolved_at" TIMESTAMP(3);
