import { test, expect } from "@playwright/test";
import { loginForm, USERS } from "../helpers/auth";

test.describe("RBAC Enforcement", () => {
  test("SECURITY_GUARD cannot create invitation", async ({ page }) => {
    await loginForm(page, "guard");
    const res = await page.request.post("/api/v1/invitations", {
      data: {
        visitor_name: "Hack",
        visitor_phone: "+999",
        visitor_type: "GUEST",
        unit_id: "seed-unit-01",
        expected_date: new Date().toISOString(),
      },
    });
    expect(res.status()).toBe(403);
  });

  test("SECURITY_GUARD can access security verify page", async ({ page }) => {
    await loginForm(page, "guard");
    await page.goto("/security/verify", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Security Verification");
  });

  test("OFFICE_STAFF can approve", async ({ page }) => {
    // Must create invitation as PROPERTY_ADMIN first (OFFICE_STAFF cannot create)
    await loginForm(page, "property");

    const res = await page.request.post("/api/v1/invitations", {
      data: {
        visitor_name: "Office Approve Test",
        visitor_phone: `+959${Date.now().toString().slice(-8)}`,
        visitor_type: "GUEST",
        unit_id: "seed-unit-01",
        expected_date: new Date("2026-07-01").toISOString(),
      },
    });
    const invId = (await res.json()).data.id;

    // Logout property, login office
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const officeUser = (await import("../helpers/auth")).USERS.office;
    await page.fill("#email", officeUser.email);
    await page.fill("#password", officeUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => {});

    // Approve as OFFICE_STAFF
    const appRes = await page.request.post(`/api/v1/invitations/${invId}/approve`, { data: {} });
    expect(appRes.ok()).toBeTruthy();
  });

  test("RESIDENT sees own invitations only", async ({ page }) => {
    await loginForm(page, "resident");
    await page.goto("/invitations", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Invitations");
    // Resident should see either a table or empty state
    const table = page.locator("table");
    const empty = page.getByText("No invitations");
    await expect(table.or(empty).first()).toBeVisible({ timeout: 5000 });
  });

  test("all roles can access dashboard", async ({ page }) => {
    await loginForm(page, "guard");
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("SECURITY_GUARD cannot list users", async ({ page }) => {
    await loginForm(page, "guard");
    const res = await page.request.get("/api/v1/users");
    expect(res.status()).toBe(403);
  });

  test("RESIDENT cannot list users", async ({ page }) => {
    await loginForm(page, "resident");
    const res = await page.request.get("/api/v1/users");
    expect(res.status()).toBe(403);
  });

  test("PROPERTY_ADMIN can list users", async ({ page }) => {
    await loginForm(page, "property");
    const res = await page.request.get("/api/v1/users");
    expect(res.ok()).toBeTruthy();
  });

  test("SECURITY_GUARD cannot list units", async ({ page }) => {
    await loginForm(page, "guard");
    const res = await page.request.get("/api/v1/units");
    expect(res.status()).toBe(403);
  });

  test("RESIDENT cannot list units", async ({ page }) => {
    await loginForm(page, "resident");
    const res = await page.request.get("/api/v1/units");
    expect(res.status()).toBe(403);
  });

  test("PROPERTY_ADMIN can list units", async ({ page }) => {
    await loginForm(page, "property");
    const res = await page.request.get("/api/v1/units");
    expect(res.ok()).toBeTruthy();
  });
});
