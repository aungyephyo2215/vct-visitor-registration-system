import { test, expect } from "@playwright/test";
import { loginForm, USERS } from "../helpers/auth";

const PHONE = `+959${Date.now().toString().slice(-8)}`;

test.describe("Invitation Workflow", () => {
  let invId: string;

  test("PROPERTY_ADMIN creates invitation with required fields", async ({ page }) => {
    await loginForm(page, "property");
    await page.goto("/invitations/new", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#visitor_name", { timeout: 10000 });

    await page.fill("#visitor_name", "Smoke Test Visitor");
    await page.fill("#visitor_phone", PHONE);
    await page.fill("#expected_date", "2026-07-01");

    // Open unit dropdown and select first option
    const unitSelect = page.locator("#unit");
    if (await unitSelect.isVisible()) {
      await unitSelect.click();
      await page.waitForTimeout(500);
      const option = page.locator('[role="option"]').first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
      }
    }

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/invitations(\/|$)/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("Invitations");
  });

  test("required fields show validation error", async ({ page }) => {
    await loginForm(page, "property");
    await page.goto("/invitations/new", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#visitor_name");
    // Remove required attributes to bypass HTML5 validation, then click submit
    await page.evaluate(() => {
      document.querySelectorAll("[required]").forEach(el => el.removeAttribute("required"));
    });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    // React validation should show: "Visitor name, phone, unit, and expected date are required"
    await expect(page.getByText("are required")).toBeVisible({ timeout: 5000 });
  });

  test("approve via API changes status", async ({ page }) => {
    await loginForm(page, "property");

    // Create via API
    const res = await page.request.post("/api/v1/invitations", {
      data: {
        visitor_name: "Approve Test",
        visitor_phone: `${PHONE}app`,
        visitor_type: "GUEST",
        unit_id: "seed-unit-01",
        expected_date: new Date("2026-07-01").toISOString(),
      },
    });
    const data = await res.json();
    invId = data.data?.id;
    expect(invId).toBeTruthy();

    // Approve
    const appRes = await page.request.post(`/api/v1/invitations/${invId}/approve`, { data: {} });
    expect(appRes.ok()).toBeTruthy();
    const appData = await appRes.json();
    expect(appData.data.status).toBe("APPROVED");

    // Check approval history
    const histRes = await page.request.get(`/api/v1/invitations/${invId}/approvals`);
    expect(histRes.ok()).toBeTruthy();
    const histData = await histRes.json();
    expect(histData.data.length).toBeGreaterThanOrEqual(1);
  });

  test("reject with reason", async ({ page }) => {
    await loginForm(page, "property");

    const res = await page.request.post("/api/v1/invitations", {
      data: {
        visitor_name: "Reject Test",
        visitor_phone: `${PHONE}rej`,
        visitor_type: "VENDOR",
        unit_id: "seed-unit-01",
        expected_date: new Date("2026-07-02").toISOString(),
      },
    });
    const data = await res.json();
    const id = data.data?.id;

    const rejRes = await page.request.post(`/api/v1/invitations/${id}/reject`, {
      data: { reason: "Not expected today" },
    });
    expect(rejRes.ok()).toBeTruthy();
    const rejData = await rejRes.json();
    expect(rejData.data.status).toBe("REJECTED");
    expect(rejData.data.reason).toBe("Not expected today");
  });

  test("SECURITY_GUARD cannot approve", async ({ page }) => {
    await loginForm(page, "guard");
    const res = await page.request.post("/api/v1/invitations/some-id/approve", { data: {} });
    expect(res.status()).not.toBe(200);
  });

  test("QR + Badge + Print", async ({ page }) => {
    await loginForm(page, "property");

    // Create + approve
    const invRes = await page.request.post("/api/v1/invitations", {
      data: {
        visitor_name: "QR Badge Test",
        visitor_phone: `${PHONE}qr`,
        visitor_type: "VIP",
        unit_id: "seed-unit-01",
        expected_date: new Date("2026-07-01").toISOString(),
      },
    });
    const invData = await invRes.json();
    const id = invData.data.id;
    await page.request.post(`/api/v1/invitations/${id}/approve`, { data: {} });

    // Generate QR
    const qrRes = await page.request.post(`/api/v1/invitations/${id}/generate-qr`, { data: {} });
    expect(qrRes.ok()).toBeTruthy();
    const qrData = await qrRes.json();
    expect(qrData.data.token).toBeTruthy();
    expect(qrData.data.visit_id).toBeTruthy();

    // Generate badge
    const badgeRes = await page.request.post("/api/v1/badges", {
      data: { invitation_id: id },
    });
    expect(badgeRes.ok()).toBeTruthy();
    const badgeData = await badgeRes.json();
    expect(badgeData.data.id).toBeTruthy();

    // Print page returns HTML
    const printRes = await page.request.get(`/api/v1/badges/${badgeData.data.id}/print`);
    expect(printRes.ok()).toBeTruthy();
    const ct = printRes.headers()["content-type"] || "";
    expect(ct).toContain("text/html");
  });
});
