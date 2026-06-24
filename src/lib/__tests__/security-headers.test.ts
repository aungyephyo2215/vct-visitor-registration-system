import { describe, it, expect } from "vitest";

// Import the config to verify headers structure
import nextConfig from "../../../next.config";

const EXPECTED_CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

async function getHeaders() {
  const config = nextConfig as {
    headers?: () => Promise<
      Array<{ source: string; headers: Array<{ key: string; value: string }> }>
    >;
  };
  const result = await config.headers!();
  return result[0].headers;
}

describe("Security Headers Configuration", () => {
  it("includes X-Frame-Options: DENY", async () => {
    const headers = await getHeaders();
    const h = headers.find((h) => h.key === "X-Frame-Options");
    expect(h).toBeDefined();
    expect(h!.value).toBe("DENY");
  });

  it("includes X-Content-Type-Options: nosniff", async () => {
    const headers = await getHeaders();
    const h = headers.find((h) => h.key === "X-Content-Type-Options");
    expect(h).toBeDefined();
    expect(h!.value).toBe("nosniff");
  });

  it("includes Referrer-Policy", async () => {
    const headers = await getHeaders();
    const h = headers.find((h) => h.key === "Referrer-Policy");
    expect(h).toBeDefined();
    expect(h!.value).toBe("strict-origin-when-cross-origin");
  });

  it("includes Permissions-Policy disabling camera, microphone, geolocation", async () => {
    const headers = await getHeaders();
    const h = headers.find((h) => h.key === "Permissions-Policy");
    expect(h).toBeDefined();
    expect(h!.value).toContain("camera=()");
    expect(h!.value).toContain("microphone=()");
    expect(h!.value).toContain("geolocation=()");
  });

  it("includes Content-Security-Policy with all required directives", async () => {
    const headers = await getHeaders();
    const h = headers.find((h) => h.key === "Content-Security-Policy");
    expect(h).toBeDefined();

    for (const directive of EXPECTED_CSP_DIRECTIVES) {
      expect(h!.value).toContain(directive);
    }
  });

  it("CSP script-src does NOT include 'unsafe-inline'", async () => {
    const headers = await getHeaders();
    const h = headers.find((h) => h.key === "Content-Security-Policy");
    expect(h).toBeDefined();

    // Extract script-src directive
    const directives = h!.value.split(";").map((d) => d.trim());
    const scriptSrc = directives.find((d) => d.startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("CSP style-src includes 'unsafe-inline' for shadcn/ui compatibility", async () => {
    const headers = await getHeaders();
    const h = headers.find((h) => h.key === "Content-Security-Policy");
    expect(h).toBeDefined();

    const directives = h!.value.split(";").map((d) => d.trim());
    const styleSrc = directives.find((d) => d.startsWith("style-src"));
    expect(styleSrc).toBeDefined();
    expect(styleSrc).toContain("'unsafe-inline'");
  });

  it("CSP frame-ancestors is 'none' (equivalent to X-Frame-Options DENY)", async () => {
    const headers = await getHeaders();
    const h = headers.find((h) => h.key === "Content-Security-Policy");
    expect(h).toBeDefined();
    expect(h!.value).toContain("frame-ancestors 'none'");
  });

  it("does NOT include Strict-Transport-Security in non-production", async () => {
    const env = process.env as Record<string, string | undefined>;
    const origNodeEnv = env.NODE_ENV;
    env.NODE_ENV = "development";

    const headers = await getHeaders();
    const hsts = headers.find((h) => h.key === "Strict-Transport-Security");
    expect(hsts).toBeUndefined();

    env.NODE_ENV = origNodeEnv;
  });

  it("includes Strict-Transport-Security in production", async () => {
    const env = process.env as Record<string, string | undefined>;
    const origNodeEnv = env.NODE_ENV;
    env.NODE_ENV = "production";

    const headers = await getHeaders();
    const hsts = headers.find((h) => h.key === "Strict-Transport-Security");
    expect(hsts).toBeDefined();
    expect(hsts!.value).toContain("max-age=63072000");
    expect(hsts!.value).toContain("includeSubDomains");
    expect(hsts!.value).toContain("preload");

    env.NODE_ENV = origNodeEnv;
  });
});

describe("Badge Print Route — No Inline Scripts", () => {
  it("badge print HTML template does not contain <script> tags", async () => {
    // Read the route file and verify no inline script exists
    const fs = await import("fs");
    const path = await import("path");
    const routePath = path.resolve(__dirname, "../../app/api/v1/badges/[id]/print/route.ts");
    const content = fs.readFileSync(routePath, "utf-8");

    expect(content).not.toContain("<script>");
    expect(content).not.toContain("window.print()");
    expect(content).not.toContain("</script>");
  });
});
