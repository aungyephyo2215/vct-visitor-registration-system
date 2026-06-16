import { NextRequest } from "next/server";

export interface SafeUser {
  id: string;
  property_id: string | null;
  unit_id: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthenticatedRequest extends NextRequest {
  user: SafeUser;
}
