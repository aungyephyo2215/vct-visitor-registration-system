import { test, expect } from "@playwright/test";
import { loginForm } from "../helpers/auth";

test.describe("API Integration", () => {
  test("GET /api/v1/visitors returns data", async ({ page }) => {
    await loginForm(page, "property");
    const res = await page.request.get("/api/v1/visitors?limit=5");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data.data).toBeDefined();
    expect(Array.isArray(data.data.data)).toBe(true);
  });

  test("GET /api/v1/visits returns data", async ({ page }) => {
    await loginForm(page, "property");
    const res = await page.request.get("/api/v1/visits?limit=5");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data.data).toBeDefined();
  });

  test("GET /api/v1/units returns data", async ({ page }) => {
    await loginForm(page, "property");
    const res = await page.request.get("/api/v1/units?limit=10");
    expect(res.ok()).toBeTruthy();
  });

  test("GET /api/v1/users returns data", async ({ page }) => {
    await loginForm(page, "admin");
    const res = await page.request.get("/api/v1/users?limit=10");
    expect(res.ok()).toBeTruthy();
  });

  test("unauthorized request returns 401", async ({ page }) => {
    const res = await page.request.get("/api/v1/visitors");
    expect(res.status()).toBe(401);
  });

  test("bad QR token returns 404", async ({ page }) => {
    const res = await page.request.post("/api/v1/checkin", {
      data: { token: "invalid_token" },
    });
    expect(res.status()).toBe(404);
  });
});
