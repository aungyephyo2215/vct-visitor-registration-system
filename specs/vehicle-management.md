# Vehicle Management — Feature Specification

## Overview

The Vehicle Management module enables property staff to register, track, and manage vehicles associated with residents and visitors. It includes a vehicle blacklist system that automatically rejects check-ins for blocked plates.

**Phase:** 7
**Status:** Implemented
**Added:** 2026-06-25

---

## Scope

### In Scope

- Vehicle CRUD (create, read, update, soft-delete)
- Vehicle owner linking (resident or visitor)
- Vehicle blacklist (add, remove, auto-reject on check-in)
- Vehicle-linked visits
- Security guard vehicle lookup during check-in

### Out of Scope

- Automatic plate recognition (ANPR/ALPR)
- Parking space management
- Vehicle registration document upload
- Toll/parking fee integration

---

## Functional Requirements

### FR-1: Vehicle Registration

Security guards and admins can register vehicles with:

- **Plate number** (required, unique per property)
- **Vehicle type** (CAR, MOTORCYCLE, TRUCK, VAN, BUS, BICYCLE, ELECTRIC_SCOOTER, OTHER)
- **Brand** (optional)
- **Color** (optional)
- **Owner type** (RESIDENT or VISITOR)
- **Owner link** (owner_user_id for residents, owner_visitor_id for visitors)

### FR-2: Vehicle CRUD

| Operation | Endpoint                      | Roles                                       |
| --------- | ----------------------------- | ------------------------------------------- |
| List      | `GET /api/v1/vehicles`        | SUPER_ADMIN, PROPERTY_ADMIN, SECURITY_GUARD |
| Create    | `POST /api/v1/vehicles`       | SUPER_ADMIN, PROPERTY_ADMIN, SECURITY_GUARD |
| Get       | `GET /api/v1/vehicles/:id`    | SUPER_ADMIN, PROPERTY_ADMIN, SECURITY_GUARD |
| Update    | `PATCH /api/v1/vehicles/:id`  | SUPER_ADMIN, PROPERTY_ADMIN, SECURITY_GUARD |
| Delete    | `DELETE /api/v1/vehicles/:id` | SUPER_ADMIN, PROPERTY_ADMIN, SECURITY_GUARD |

### FR-3: Vehicle-Linked Visits

When creating a visit, an optional `vehicle_id` can be provided to link a registered vehicle. The visit also stores a `vehicle_number` string for quick entry without requiring prior vehicle registration.

### FR-4: Vehicle Blacklist

- Admins can add plates to the blacklist with a reason
- Blacklisted plates trigger automatic check-in rejection
- Blacklist entries can be removed (status changed to REMOVED)

| Operation | Endpoint                                | Roles                       |
| --------- | --------------------------------------- | --------------------------- |
| List      | `GET /api/v1/vehicles/blacklist`        | SUPER_ADMIN, PROPERTY_ADMIN |
| Add       | `POST /api/v1/vehicles/blacklist`       | SUPER_ADMIN, PROPERTY_ADMIN |
| Update    | `PATCH /api/v1/vehicles/blacklist/:id`  | SUPER_ADMIN, PROPERTY_ADMIN |
| Remove    | `DELETE /api/v1/vehicles/blacklist/:id` | SUPER_ADMIN, PROPERTY_ADMIN |

### FR-5: Vehicle Search

List endpoint supports search by plate number and filters by owner_type and status.

---

## Database Schema

### Vehicle

```
Vehicle
├── id: uuid (PK)
├── property_id: uuid (FK → Property)
├── plate_number: varchar
├── vehicle_type: VehicleType enum
├── brand: varchar (nullable)
├── color: varchar (nullable)
├── owner_type: VehicleOwnerType enum
├── owner_user_id: uuid (nullable, FK → User)
├── owner_visitor_id: uuid (nullable, FK → Visitor)
├── status: VehicleStatus enum (default: ACTIVE)
├── created_at: timestamp
├── updated_at: timestamp
└── deleted_at: timestamp (nullable)

Unique: (property_id, plate_number)
```

### VehicleBlacklist

```
VehicleBlacklist
├── id: uuid (PK)
├── property_id: uuid (FK → Property)
├── plate_number: varchar
├── reason: text (nullable)
├── status: BlocklistStatus enum (default: ACTIVE)
├── created_by: uuid (nullable, FK → User)
├── created_at: timestamp
└── updated_at: timestamp

Unique: (property_id, plate_number)
```

### Enums

- **VehicleType:** CAR, MOTORCYCLE, TRUCK, VAN, BUS, BICYCLE, ELECTRIC_SCOOTER, OTHER
- **VehicleOwnerType:** RESIDENT, VISITOR
- **VehicleStatus:** ACTIVE, BLOCKED

---

## Security Considerations

1. **Multi-tenancy:** All vehicle queries filter by property_id
2. **Soft delete:** Vehicles use deleted_at; blacklist uses status field
3. **Audit logging:** CREATE_VEHICLE, UPDATE_VEHICLE, DELETE_VEHICLE, BLOCK_VEHICLE actions
4. **Blacklist enforcement:** Check-in validates vehicle_number against blacklist

---

## UI Pages

- `/vehicles` — Vehicle list with search and filters
- `/vehicles/new` — Vehicle registration form
- `/vehicles/[id]` — Vehicle detail with visit history

---

## Testing

- Unit tests: vehicle validations, blacklist matching
- E2E tests: vehicle CRUD flow, blacklist add/remove, vehicle-linked visit creation
