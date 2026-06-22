/*
  Warnings:

  - A unique constraint covering the columns `[idempotency_key]` on the table `qr_email_deliveries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email_access_token]` on the table `qr_email_deliveries` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "qr_email_deliveries" ADD COLUMN     "email_access_token" TEXT,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE INDEX "qr_email_deliveries_qr_code_id_trigger_type_created_at_idx" ON "qr_email_deliveries"("qr_code_id", "trigger_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "qr_email_deliveries_idempotency_key_key" ON "qr_email_deliveries"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "qr_email_deliveries_email_access_token_key" ON "qr_email_deliveries"("email_access_token");
