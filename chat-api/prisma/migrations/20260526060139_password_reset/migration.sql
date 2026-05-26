-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN     "used" BOOLEAN NOT NULL DEFAULT false;
