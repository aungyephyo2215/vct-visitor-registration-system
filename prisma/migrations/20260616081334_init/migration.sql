-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('CONDO', 'APARTMENT', 'OFFICE', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('OCCUPIED', 'VACANT', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'PROPERTY_ADMIN', 'SECURITY_GUARD', 'RESIDENT', 'OFFICE_STAFF');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "IdType" AS ENUM ('NRC', 'PASSPORT', 'DRIVING_LICENSE', 'COMPANY_ID', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitPurpose" AS ENUM ('FAMILY_VISIT', 'BUSINESS_MEETING', 'DELIVERY', 'MAINTENANCE', 'INTERVIEW', 'CONTRACTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QRStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE_VISITOR', 'UPDATE_VISITOR', 'DELETE_VISITOR', 'GENERATE_QR', 'CHECK_IN', 'CHECK_OUT', 'FAILED_QR_SCAN', 'MANUAL_CHECKOUT', 'BLOCKLIST_MATCH');

-- CreateEnum
CREATE TYPE "BlocklistStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL,
    "address" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "unit_no" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "status" "UnitStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "property_id" TEXT,
    "unit_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "id_type" "IdType" NOT NULL,
    "id_number" TEXT NOT NULL,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "host_user_id" TEXT,
    "purpose" "VisitPurpose" NOT NULL,
    "notes" TEXT,
    "vehicle_number" TEXT,
    "expected_checkin_time" TIMESTAMP(3),
    "checkin_time" TIMESTAMP(3),
    "checkout_time" TIMESTAMP(3),
    "status" "VisitStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "QRStatus" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocklists" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "visitor_name" TEXT NOT NULL,
    "phone" TEXT,
    "id_number" TEXT,
    "reason" TEXT NOT NULL,
    "status" "BlocklistStatus" NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "blocklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE INDEX "units_property_id_idx" ON "units"("property_id");

-- CreateIndex
CREATE INDEX "units_property_id_status_idx" ON "units"("property_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "units_property_id_unit_no_key" ON "units"("property_id", "unit_no");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_property_id_idx" ON "users"("property_id");

-- CreateIndex
CREATE INDEX "users_unit_id_idx" ON "users"("unit_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_property_id_role_idx" ON "users"("property_id", "role");

-- CreateIndex
CREATE INDEX "users_property_id_status_idx" ON "users"("property_id", "status");

-- CreateIndex
CREATE INDEX "visitors_property_id_idx" ON "visitors"("property_id");

-- CreateIndex
CREATE INDEX "visitors_phone_idx" ON "visitors"("phone");

-- CreateIndex
CREATE INDEX "visitors_id_number_idx" ON "visitors"("id_number");

-- CreateIndex
CREATE INDEX "visitors_property_id_phone_idx" ON "visitors"("property_id", "phone");

-- CreateIndex
CREATE INDEX "visitors_property_id_id_number_idx" ON "visitors"("property_id", "id_number");

-- CreateIndex
CREATE INDEX "visits_property_id_idx" ON "visits"("property_id");

-- CreateIndex
CREATE INDEX "visits_visitor_id_idx" ON "visits"("visitor_id");

-- CreateIndex
CREATE INDEX "visits_unit_id_idx" ON "visits"("unit_id");

-- CreateIndex
CREATE INDEX "visits_host_user_id_idx" ON "visits"("host_user_id");

-- CreateIndex
CREATE INDEX "visits_status_idx" ON "visits"("status");

-- CreateIndex
CREATE INDEX "visits_expected_checkin_time_idx" ON "visits"("expected_checkin_time");

-- CreateIndex
CREATE INDEX "visits_checkin_time_idx" ON "visits"("checkin_time");

-- CreateIndex
CREATE INDEX "visits_property_id_status_expected_checkin_time_idx" ON "visits"("property_id", "status", "expected_checkin_time");

-- CreateIndex
CREATE INDEX "visits_property_id_checkin_time_idx" ON "visits"("property_id", "checkin_time");

-- CreateIndex
CREATE INDEX "visits_property_id_visitor_id_idx" ON "visits"("property_id", "visitor_id");

-- CreateIndex
CREATE INDEX "visits_property_id_unit_id_idx" ON "visits"("property_id", "unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_token_hash_key" ON "qr_codes"("token_hash");

-- CreateIndex
CREATE INDEX "qr_codes_property_id_idx" ON "qr_codes"("property_id");

-- CreateIndex
CREATE INDEX "qr_codes_visit_id_idx" ON "qr_codes"("visit_id");

-- CreateIndex
CREATE INDEX "qr_codes_status_idx" ON "qr_codes"("status");

-- CreateIndex
CREATE INDEX "qr_codes_expires_at_idx" ON "qr_codes"("expires_at");

-- CreateIndex
CREATE INDEX "qr_codes_property_id_status_expires_at_idx" ON "qr_codes"("property_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_property_id_idx" ON "audit_logs"("property_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_property_id_created_at_idx" ON "audit_logs"("property_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_property_id_action_idx" ON "audit_logs"("property_id", "action");

-- CreateIndex
CREATE INDEX "audit_logs_property_id_user_id_idx" ON "audit_logs"("property_id", "user_id");

-- CreateIndex
CREATE INDEX "blocklists_property_id_idx" ON "blocklists"("property_id");

-- CreateIndex
CREATE INDEX "blocklists_phone_idx" ON "blocklists"("phone");

-- CreateIndex
CREATE INDEX "blocklists_id_number_idx" ON "blocklists"("id_number");

-- CreateIndex
CREATE INDEX "blocklists_status_idx" ON "blocklists"("status");

-- CreateIndex
CREATE INDEX "blocklists_property_id_phone_idx" ON "blocklists"("property_id", "phone");

-- CreateIndex
CREATE INDEX "blocklists_property_id_id_number_idx" ON "blocklists"("property_id", "id_number");

-- CreateIndex
CREATE INDEX "blocklists_property_id_status_idx" ON "blocklists"("property_id", "status");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "visitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_host_user_id_fkey" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocklists" ADD CONSTRAINT "blocklists_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocklists" ADD CONSTRAINT "blocklists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
