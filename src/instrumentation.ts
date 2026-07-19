export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerGracefulShutdown } = await import("./lib/graceful-shutdown");
    registerGracefulShutdown();
  }
}
