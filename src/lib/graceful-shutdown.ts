import { prisma } from "@/lib/prisma";

let isShuttingDown = false;

export function getIsShuttingDown(): boolean {
  return isShuttingDown;
}

export function registerGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    // The preStop hook (sleep 5) gives Kubernetes time to remove
    // the pod from the Service before we stop accepting new connections.

    // Close database connections cleanly
    try {
      await prisma.$disconnect();
      console.log("Database connections closed.");
    } catch (error) {
      console.error("Error disconnecting from database:", error);
    }

    // Allow the Node.js event loop to drain
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
