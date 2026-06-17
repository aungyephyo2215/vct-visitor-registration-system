import { test, expect } from "@playwright/test";
import { loginForm, USERS } from "../helpers/auth";

test.describe("Smoke Tests", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Visitor Registration");
    await expect(page.locator('a[href="/login"]').first()).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("protected route redirects to login", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login/);
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", "wrong@email.com");
    await page.fill("#password", "wrongpass");
    // Remove required attribute to allow submission with form data
    await page.evaluate(() => {
      document.querySelectorAll("[required]").forEach(el => el.removeAttribute("required"));
    });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });
});

test.describe("Role Login", () => {
  for (const [role, user] of Object.entries(USERS)) {
    test(`${role} can login and see dashboard`, async ({ page }) => {
      await loginForm(page, role);
      // On dashboard
      const h1 = page.locator("h1");
      const onDashboard = (await h1.textContent().catch(() => ""))?.includes("Dashboard");
      if (!onDashboard) {
        await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      }
      await expect(page.locator("h1")).toContainText("Dashboard");
    });
  }
});
