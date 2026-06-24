-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE', 'TRUCK', 'VAN', 'BUS', 'BICYCLE', 'ELECTRIC_SCOOTER', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleOwnerType" AS ENUM ('RESIDENT', 'VISITOR');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'CREATE_VEHICLE';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_VEHICLE';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_VEHICLE';
ALTER TYPE "AuditAction" ADD VALUE 'BLOCK_VEHICLE';

-- AlterTable: Add vehicle_id to visits
ALTER TABLE "visits" ADD COLUMN "vehicle_id" TEXT;

-- CreateTable: vehicles
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "brand" TEXT,
    "color" TEXT,
    "owner_type" "VehicleOwnerType" NOT NULL,
    "owner_user_id" TEXT,
    "owner_visitor_id" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: vehicle_blacklists
CREATE TABLE "vehicle_blacklists" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "reason" TEXT,
    "status" "BlocklistStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_blacklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraints
CREATE UNIQUE INDEX "vehicles_property_id_plate_number_key" ON "vehicles"("property_id", "plate_number");
CREATE UNIQUE INDEX "vehicle_blacklists_property_id_plate_number_key" ON "vehicle_blacklists"("property_id", "plate_number");

-- CreateIndex: Vehicle indexes
CREATE INDEX "vehicles_property_id_idx" ON "vehicles"("property_id");
CREATE INDEX "vehicles_plate_number_idx" ON "vehicles"("plate_number");
CREATE INDEX "vehicles_owner_user_id_idx" ON "vehicles"("owner_user_id");
CREATE INDEX "vehicles_owner_visitor_id_idx" ON "vehicles"("owner_visitor_id");
CREATE INDEX "vehicles_property_id_status_idx" ON "vehicles"("property_id", "status");

-- CreateIndex: VehicleBlacklist indexes
CREATE INDEX "vehicle_blacklists_property_id_idx" ON "vehicle_blacklists"("property_id");
CREATE INDEX "vehicle_blacklists_plate_number_idx" ON "vehicle_blacklists"("plate_number");

-- CreateIndex: Visit vehicle_id index
CREATE INDEX "visits_vehicle_id_idx" ON "visits"("vehicle_id");

-- AddForeignKey: vehicles -> properties
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: vehicles -> users (owner)
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: vehicles -> visitors (owner)
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_visitor_id_fkey" FOREIGN KEY ("owner_visitor_id") REFERENCES "visitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: visits -> vehicles
ALTER TABLE "visits" ADD CONSTRAINT "visits_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: vehicle_blacklists -> properties
ALTER TABLE "vehicle_blacklists" ADD CONSTRAINT "vehicle_blacklists_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: vehicle_blacklists -> users (creator)
ALTER TABLE "vehicle_blacklists" ADD CONSTRAINT "vehicle_blacklists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
