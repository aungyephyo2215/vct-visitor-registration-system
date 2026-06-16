-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisitorType" AS ENUM ('GUEST', 'FAMILY', 'VIP', 'VENDOR', 'CONTRACTOR', 'DELIVERY', 'AUDITOR', 'GOVERNMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CREATE_INVITATION';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_INVITATION';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_INVITATION';
ALTER TYPE "AuditAction" ADD VALUE 'APPROVE_INVITATION';
ALTER TYPE "AuditAction" ADD VALUE 'REJECT_INVITATION';

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "visitor_name" TEXT NOT NULL,
    "visitor_phone" TEXT NOT NULL,
    "visitor_email" TEXT,
    "visitor_id_type" "IdType",
    "visitor_id_number" TEXT,
    "visitor_type" "VisitorType" NOT NULL,
    "unit_id" TEXT NOT NULL,
    "expected_date" TIMESTAMP(3) NOT NULL,
    "expected_time" TEXT,
    "notes" TEXT,
    "status" "InvitationStatus" NOT NULL,
    "reason" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invitations_property_id_idx" ON "invitations"("property_id");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "invitations"("status");

-- CreateIndex
CREATE INDEX "invitations_invited_by_idx" ON "invitations"("invited_by");

-- CreateIndex
CREATE INDEX "invitations_property_id_status_idx" ON "invitations"("property_id", "status");

-- CreateIndex
CREATE INDEX "invitations_property_id_expected_date_idx" ON "invitations"("property_id", "expected_date");

-- CreateIndex
CREATE INDEX "invitations_property_id_invited_by_idx" ON "invitations"("property_id", "invited_by");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
