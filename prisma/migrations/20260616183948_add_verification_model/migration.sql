-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'VERIFY_VISITOR';
ALTER TYPE "AuditAction" ADD VALUE 'ATTACH_VISITOR';

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "visitor_id" TEXT,
    "photo_url" TEXT,
    "vehicle_number" TEXT,
    "nda_signed" BOOLEAN NOT NULL DEFAULT false,
    "safety_form_signed" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verifications_property_id_idx" ON "verifications"("property_id");

-- CreateIndex
CREATE INDEX "verifications_verified_by_idx" ON "verifications"("verified_by");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_visit_id_key" ON "verifications"("visit_id");

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "visitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
