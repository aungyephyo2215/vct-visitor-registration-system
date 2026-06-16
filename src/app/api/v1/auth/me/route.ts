import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    return successResponse({ user });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Me error:", error);
    return Response.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
