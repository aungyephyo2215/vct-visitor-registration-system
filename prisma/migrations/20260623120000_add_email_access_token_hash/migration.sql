-- AlterTable
ALTER TABLE "qr_email_deliveries" ADD COLUMN "email_access_token_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "qr_email_deliveries_email_access_token_hash_key" ON "qr_email_deliveries"("email_access_token_hash");
