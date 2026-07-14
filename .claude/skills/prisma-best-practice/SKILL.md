# Prisma Best Practice Skill

## Purpose

Design and implement Prisma schemas for scalable and secure applications.

---

## General Rules

- Use PostgreSQL.
- Use UUID primary keys.
- Use Prisma ORM.
- Use snake_case database fields.
- Use camelCase Prisma fields.
- Use enums instead of strings for statuses.
- Use soft delete.

---

## Required Fields

Every table should have:

```prisma
id         String   @id @default(uuid())
createdAt  DateTime @default(now())
updatedAt  DateTime @updatedAt
deletedAt  DateTime?
```

---

## Multi Tenancy

Every tenant-owned model must contain:

```prisma
propertyId String
```

Always filter:

```text
WHERE property_id = ?
```

except:

```text
super_admin
```

---

## Relationships

Always define:

- Foreign keys
- Prisma relations
- onDelete behavior

Example:

```prisma
model Visit {

  id String @id @default(uuid())

  visitorId String

  visitor Visitor
    @relation(
      fields:[visitorId],
      references:[id]
    )

}
```

---

## Indexes

Always index:

- propertyId
- email
- phone
- createdAt

Composite indexes:

```prisma
@@index([propertyId,status])

@@index([propertyId,createdAt])

@@index([propertyId,checkinTime])
```

---

## Migration Rules

Before migration:

- prisma validate
- prisma format
- review schema

Never:

- delete production tables
- rename columns without migration
- use db push in production

Use:

```bash
npx prisma migrate dev

npx prisma migrate deploy
```
