import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Simple DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "connected", timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "error", database: "disconnected", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
