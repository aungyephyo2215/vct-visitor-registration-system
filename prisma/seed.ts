import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const hashedAdmin = await bcrypt.hash("Admin123!", 12);
  const hashedGuard = await bcrypt.hash("Guard123!", 12);

  // Create property
  const property = await prisma.property.upsert({
    where: { id: "seed-property-01" },
    update: {},
    create: {
      id: "seed-property-01",
      name: "Skyline Condo",
      type: "CONDO",
      address: "123 Main Street, Yangon",
      timezone: "Asia/Yangon",
      status: "ACTIVE",
    },
  });
  console.log(`Property: ${property.name}`);

  // Create unit
  const unit = await prisma.unit.upsert({
    where: { id: "seed-unit-01" },
    update: {},
    create: {
      id: "seed-unit-01",
      property_id: property.id,
      unit_no: "12A",
      floor: 12,
      status: "OCCUPIED",
    },
  });
  console.log(`Unit: ${unit.unit_no}`);

  // Create users
  const users = [
    {
      id: "seed-user-admin",
      name: "Super Admin",
      email: "admin@vrs.com",
      password_hash: hashedAdmin,
      role: "SUPER_ADMIN" as const,
      status: "ACTIVE" as const,
    },
    {
      id: "seed-user-property",
      name: "Property Manager",
      email: "property@vrs.com",
      password_hash: hashedAdmin,
      role: "PROPERTY_ADMIN" as const,
      status: "ACTIVE" as const,
      property_id: property.id,
    },
    {
      id: "seed-user-guard",
      name: "Security Guard",
      email: "guard@vrs.com",
      password_hash: hashedGuard,
      role: "SECURITY_GUARD" as const,
      status: "ACTIVE" as const,
      property_id: property.id,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
    console.log(`User: ${user.email} (${user.role})`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
