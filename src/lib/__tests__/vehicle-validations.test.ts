import { describe, it, expect } from "vitest";
import {
  vehicleCreateSchema,
  vehicleUpdateSchema,
  vehicleBlacklistCreateSchema,
} from "../validations";

describe("vehicleCreateSchema", () => {
  const valid = {
    plate_number: "ABC-1234",
    vehicle_type: "CAR",
    owner_type: "RESIDENT",
  };

  it("accepts valid vehicle", () => {
    expect(vehicleCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts all vehicle types", () => {
    const types = [
      "CAR",
      "MOTORCYCLE",
      "TRUCK",
      "VAN",
      "BUS",
      "BICYCLE",
      "ELECTRIC_SCOOTER",
      "OTHER",
    ];
    for (const type of types) {
      expect(vehicleCreateSchema.safeParse({ ...valid, vehicle_type: type }).success).toBe(true);
    }
  });

  it("accepts both owner types", () => {
    expect(vehicleCreateSchema.safeParse({ ...valid, owner_type: "RESIDENT" }).success).toBe(true);
    expect(vehicleCreateSchema.safeParse({ ...valid, owner_type: "VISITOR" }).success).toBe(true);
  });

  it("accepts optional fields", () => {
    expect(
      vehicleCreateSchema.safeParse({
        ...valid,
        brand: "Toyota",
        color: "White",
        owner_user_id: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(true);
  });

  it("rejects empty plate_number", () => {
    expect(vehicleCreateSchema.safeParse({ ...valid, plate_number: "" }).success).toBe(false);
  });

  it("rejects missing vehicle_type", () => {
    const { vehicle_type: _, ...rest } = valid;
    expect(vehicleCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid vehicle_type", () => {
    expect(vehicleCreateSchema.safeParse({ ...valid, vehicle_type: "HELICOPTER" }).success).toBe(
      false,
    );
  });

  it("rejects invalid owner_type", () => {
    expect(vehicleCreateSchema.safeParse({ ...valid, owner_type: "GUEST" }).success).toBe(false);
  });

  it("rejects plate_number over 20 chars", () => {
    expect(vehicleCreateSchema.safeParse({ ...valid, plate_number: "A".repeat(21) }).success).toBe(
      false,
    );
  });

  it("rejects brand over 50 chars", () => {
    expect(vehicleCreateSchema.safeParse({ ...valid, brand: "A".repeat(51) }).success).toBe(false);
  });

  it("rejects color over 30 chars", () => {
    expect(vehicleCreateSchema.safeParse({ ...valid, color: "A".repeat(31) }).success).toBe(false);
  });

  it("rejects invalid owner_user_id format", () => {
    expect(vehicleCreateSchema.safeParse({ ...valid, owner_user_id: "not-a-uuid" }).success).toBe(
      false,
    );
  });
});

describe("vehicleUpdateSchema", () => {
  it("accepts partial update with plate_number only", () => {
    expect(vehicleUpdateSchema.safeParse({ plate_number: "XYZ-9999" }).success).toBe(true);
  });

  it("accepts partial update with status only", () => {
    expect(vehicleUpdateSchema.safeParse({ status: "BLOCKED" }).success).toBe(true);
  });

  it("accepts empty update", () => {
    expect(vehicleUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts null optional fields", () => {
    expect(vehicleUpdateSchema.safeParse({ brand: null, color: null }).success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(vehicleUpdateSchema.safeParse({ status: "DELETED" }).success).toBe(false);
  });

  it("rejects empty plate_number", () => {
    expect(vehicleUpdateSchema.safeParse({ plate_number: "" }).success).toBe(false);
  });
});

describe("vehicleBlacklistCreateSchema", () => {
  it("accepts valid entry", () => {
    expect(vehicleBlacklistCreateSchema.safeParse({ plate_number: "ABC-1234" }).success).toBe(true);
  });

  it("accepts with reason", () => {
    expect(
      vehicleBlacklistCreateSchema.safeParse({
        plate_number: "ABC-1234",
        reason: "Stolen vehicle",
      }).success,
    ).toBe(true);
  });

  it("rejects empty plate_number", () => {
    expect(vehicleBlacklistCreateSchema.safeParse({ plate_number: "" }).success).toBe(false);
  });

  it("rejects reason over 500 chars", () => {
    expect(
      vehicleBlacklistCreateSchema.safeParse({
        plate_number: "ABC-1234",
        reason: "A".repeat(501),
      }).success,
    ).toBe(false);
  });
});
