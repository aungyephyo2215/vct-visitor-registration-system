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
  const hashedResident = await bcrypt.hash("Resident123!", 12);
  const hashedOffice = await bcrypt.hash("Office123!", 12);

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
    {
      id: "seed-user-resident",
      name: "Resident Owner",
      email: "resident@vrs.com",
      password_hash: hashedResident,
      role: "RESIDENT" as const,
      status: "ACTIVE" as const,
      property_id: property.id,
      unit_id: unit.id,
    },
    {
      id: "seed-user-office",
      name: "Office Staff",
      email: "office@vrs.com",
      password_hash: hashedOffice,
      role: "OFFICE_STAFF" as const,
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

  // Create sample invitations
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  const invitations = [
    {
      id: "seed-invitation-01",
      property_id: property.id,
      invited_by: "seed-user-property",
      visitor_name: "Alice Johnson",
      visitor_phone: "+95911111111",
      visitor_email: "alice@example.com",
      visitor_id_type: "PASSPORT" as const,
      visitor_id_number: "PP987654",
      visitor_type: "FAMILY" as const,
      unit_id: unit.id,
      expected_date: tomorrow,
      expected_time: "10:00-12:00",
      notes: "Family visit for weekend",
      status: "PENDING" as const,
    },
    {
      id: "seed-invitation-02",
      property_id: property.id,
      invited_by: "seed-user-property",
      visitor_name: "Bob Smith",
      visitor_phone: "+95922222222",
      visitor_type: "VENDOR" as const,
      unit_id: unit.id,
      expected_date: nextWeek,
      expected_time: "14:00",
      notes: "Supply delivery",
      status: "PENDING" as const,
    },
  ];

  for (const inv of invitations) {
    await prisma.invitation.upsert({
      where: { id: inv.id },
      update: {},
      create: inv,
    });
    console.log(`Invitation: ${inv.visitor_name} (${inv.status})`);
  }

  // Sample notifications
  const notifData = [
    {
      user_id: "seed-user-property",
      property_id: property.id,
      type: "INVITATION_CREATED" as const,
      title: "New Invitation",
      message: "Resident Owner invited Alice Johnson (FAMILY)",
      resource_type: "invitation" as const,
      resource_id: "seed-invitation-01",
      action_url: "/invitations/seed-invitation-01",
      is_read: false,
    },
    {
      user_id: "seed-user-property",
      property_id: property.id,
      type: "INVITATION_CREATED" as const,
      title: "New Invitation",
      message: "Resident Owner invited Bob Smith (VENDOR)",
      resource_type: "invitation" as const,
      resource_id: "seed-invitation-02",
      action_url: "/invitations/seed-invitation-02",
      is_read: false,
    },
    {
      user_id: "seed-user-resident",
      property_id: property.id,
      type: "INVITATION_APPROVED" as const,
      title: "Invitation Approved",
      message: "Your invitation for Alice Johnson has been approved",
      resource_type: "invitation" as const,
      resource_id: "seed-invitation-01",
      action_url: "/invitations/seed-invitation-01",
      is_read: true,
      read_at: new Date(),
    },
  ];

  for (const n of notifData) {
    await prisma.notification.upsert({
      where: { id: `seed-notif-${notifData.indexOf(n) + 1}` },
      update: {},
      create: { id: `seed-notif-${notifData.indexOf(n) + 1}`, ...n },
    });
    console.log(
      `Notification: ${n.title} → ${n.user_id === "seed-user-property" ? "Property Admin" : "Resident"}`,
    );
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
