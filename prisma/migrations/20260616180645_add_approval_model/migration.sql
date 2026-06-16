-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "approved_by" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approvals_invitation_id_idx" ON "approvals"("invitation_id");

-- CreateIndex
CREATE INDEX "approvals_invitation_id_status_idx" ON "approvals"("invitation_id", "status");

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
