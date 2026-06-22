import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const visitorCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().min(1, "Phone is required").max(20),
  id_type: z.enum(["NRC", "PASSPORT", "DRIVING_LICENSE", "COMPANY_ID", "OTHER"]),
  id_number: z.string().min(1, "ID number is required").max(50),
  photo_url: z.string().url("Invalid photo URL").optional().nullable(),
  property_id: z.string().min(1, "Property ID is required").optional(),
});

export const visitorUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(20).optional(),
  id_type: z.enum(["NRC", "PASSPORT", "DRIVING_LICENSE", "COMPANY_ID", "OTHER"]).optional(),
  id_number: z.string().min(1).max(50).optional(),
  photo_url: z.string().url("Invalid photo URL").optional().nullable(),
});

export const visitCreateSchema = z.object({
  visitor_id: z.string().min(1, "Visitor ID is required"),
  unit_id: z.string().min(1, "Unit ID is required"),
  host_user_id: z.string().min(1).optional().nullable(),
  purpose: z.enum([
    "FAMILY_VISIT",
    "BUSINESS_MEETING",
    "DELIVERY",
    "MAINTENANCE",
    "INTERVIEW",
    "CONTRACTOR",
    "OTHER",
  ]),
  notes: z.string().max(500).optional().nullable(),
  vehicle_number: z.string().max(20).optional().nullable(),
  expected_checkin_time: z.string().datetime("Invalid datetime").optional().nullable(),
});

export const visitUpdateSchema = z.object({
  visitor_id: z.string().min(1).optional(),
  unit_id: z.string().min(1).optional(),
  host_user_id: z.string().min(1).optional().nullable(),
  purpose: z
    .enum([
      "FAMILY_VISIT",
      "BUSINESS_MEETING",
      "DELIVERY",
      "MAINTENANCE",
      "INTERVIEW",
      "CONTRACTOR",
      "OTHER",
    ])
    .optional(),
  notes: z.string().max(500).optional().nullable(),
  vehicle_number: z.string().max(20).optional().nullable(),
  expected_checkin_time: z.string().datetime().optional().nullable(),
  status: z.enum(["EXPECTED", "CHECKED_IN", "CHECKED_OUT", "NO_SHOW", "CANCELLED"]).optional(),
});

export const qrGenerateSchema = z.object({
  visit_id: z.string().min(1, "Visit ID is required"),
});

export const checkinSchema = z.object({
  token: z.string().min(1, "QR token is required"),
});

export const checkoutSchema = z.object({
  visit_id: z.string().min(1, "Visit ID is required"),
});

export const invitationCreateSchema = z.object({
  visitor_name: z.string().min(1, "Visitor name is required").max(100),
  visitor_phone: z.string().min(1, "Phone is required").max(20),
  visitor_email: z.string().email("Invalid email").optional().nullable(),
  visitor_id_type: z
    .enum(["NRC", "PASSPORT", "DRIVING_LICENSE", "COMPANY_ID", "OTHER"])
    .optional()
    .nullable(),
  visitor_id_number: z.string().max(50).optional().nullable(),
  visitor_type: z.enum([
    "GUEST",
    "FAMILY",
    "VIP",
    "VENDOR",
    "CONTRACTOR",
    "DELIVERY",
    "AUDITOR",
    "GOVERNMENT",
  ]),
  unit_id: z.string().min(1, "Unit is required"),
  expected_date: z.string().min(1, "Expected date is required"),
  expected_time: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const invitationUpdateSchema = z.object({
  visitor_name: z.string().min(1).max(100).optional(),
  visitor_phone: z.string().min(1).max(20).optional(),
  visitor_email: z.string().email("Invalid email").optional().nullable(),
  visitor_id_type: z
    .enum(["NRC", "PASSPORT", "DRIVING_LICENSE", "COMPANY_ID", "OTHER"])
    .optional()
    .nullable(),
  visitor_id_number: z.string().max(50).optional().nullable(),
  visitor_type: z
    .enum(["GUEST", "FAMILY", "VIP", "VENDOR", "CONTRACTOR", "DELIVERY", "AUDITOR", "GOVERNMENT"])
    .optional(),
  unit_id: z.string().min(1).optional(),
  expected_date: z.string().optional(),
  expected_time: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const invitationApproveSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

export const invitationRejectSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  visitor_id: z.string().min(1).optional(),
  unit_id: z.string().min(1).optional(),
});

export function formatZodErrors(error: z.ZodError) {
  return error.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}
