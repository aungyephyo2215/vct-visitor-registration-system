-- DropForeignKey
ALTER TABLE "visits" DROP CONSTRAINT "visits_visitor_id_fkey";

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "visit_id" TEXT;

-- AlterTable
ALTER TABLE "visits" ALTER COLUMN "visitor_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "invitation_id" TEXT,
    "visit_id" TEXT,
    "visitor_id" TEXT,
    "badge_type" TEXT NOT NULL,
    "badge_data" JSONB,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "badges_property_id_idx" ON "badges"("property_id");

-- CreateIndex
CREATE INDEX "badges_invitation_id_idx" ON "badges"("invitation_id");

-- CreateIndex
CREATE INDEX "badges_visit_id_idx" ON "badges"("visit_id");

-- CreateIndex
CREATE INDEX "invitations_visit_id_idx" ON "invitations"("visit_id");

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "visitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
