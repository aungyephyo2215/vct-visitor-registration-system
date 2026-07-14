import type { NextRequest } from "next/server";
import type { SafeUser } from "./types";
import { verifyAccessToken } from "./jwt";
import { prisma } from "./prisma";
import { unauthorizedResponse } from "./api-response";

export function toSafeUser(user: {
  id: string;
  property_id: string | null;
  unit_id: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  password_hash?: string;
  deleted_at?: Date | null;
}): SafeUser {
  return {
    id: user.id,
    property_id: user.property_id,
    unit_id: user.unit_id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function getCurrentUser(request: NextRequest): Promise<SafeUser | null> {
  try {
    const token =
      request.cookies.get("access_token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) return null;

    const payload = await verifyAccessToken(token);
    if (!payload?.sub) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
    });

    if (!user || user.deleted_at || user.status !== "ACTIVE") return null;

    return toSafeUser(user);
  } catch {
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<SafeUser> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw unauthorizedResponse("Authentication required");
  }
  return user;
}
