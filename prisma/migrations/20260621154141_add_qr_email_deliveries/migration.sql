-- CreateEnum
CREATE TYPE "QrEmailDeliveryStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "QrEmailDeliveryTriggerType" AS ENUM ('AUTO', 'MANUAL_RESEND');

-- CreateTable
CREATE TABLE "qr_email_deliveries" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "qr_code_id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "trigger_type" "QrEmailDeliveryTriggerType" NOT NULL,
    "status" "QrEmailDeliveryStatus" NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "subject" TEXT NOT NULL,
    "failure_code" TEXT,
    "failure_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_email_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qr_email_deliveries_property_id_idx" ON "qr_email_deliveries"("property_id");

-- CreateIndex
CREATE INDEX "qr_email_deliveries_invitation_id_idx" ON "qr_email_deliveries"("invitation_id");

-- CreateIndex
CREATE INDEX "qr_email_deliveries_visit_id_idx" ON "qr_email_deliveries"("visit_id");

-- CreateIndex
CREATE INDEX "qr_email_deliveries_qr_code_id_idx" ON "qr_email_deliveries"("qr_code_id");

-- CreateIndex
CREATE INDEX "qr_email_deliveries_status_idx" ON "qr_email_deliveries"("status");

-- CreateIndex
CREATE INDEX "qr_email_deliveries_created_at_idx" ON "qr_email_deliveries"("created_at");

-- AddForeignKey
ALTER TABLE "qr_email_deliveries" ADD CONSTRAINT "qr_email_deliveries_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_email_deliveries" ADD CONSTRAINT "qr_email_deliveries_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_email_deliveries" ADD CONSTRAINT "qr_email_deliveries_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_email_deliveries" ADD CONSTRAINT "qr_email_deliveries_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_email_deliveries" ADD CONSTRAINT "qr_email_deliveries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
