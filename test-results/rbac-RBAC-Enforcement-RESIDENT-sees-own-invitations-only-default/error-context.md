# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac.spec.ts >> RBAC Enforcement >> RESIDENT sees own invitations only
- Location: tests/e2e/rbac.spec.ts:53:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Invitations"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')

```

```yaml
- text: Sign In Enter your credentials to access the system Email
- textbox "Email":
  - /placeholder: admin@vrs.com
- text: Password
- textbox "Password":
  - /placeholder: ••••••••
- button
- button "Sign In"
- link "Back to home":
  - /url: /
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { loginForm, USERS } from "../helpers/auth";
  3  | 
  4  | test.describe("RBAC Enforcement", () => {
  5  |   test("SECURITY_GUARD cannot create invitation", async ({ page }) => {
  6  |     await loginForm(page, "guard");
  7  |     const res = await page.request.post("/api/v1/invitations", {
  8  |       data: {
  9  |         visitor_name: "Hack",
  10 |         visitor_phone: "+999",
  11 |         visitor_type: "GUEST",
  12 |         unit_id: "seed-unit-01",
  13 |         expected_date: new Date().toISOString(),
  14 |       },
  15 |     });
  16 |     expect(res.status()).toBe(403);
  17 |   });
  18 | 
  19 |   test("SECURITY_GUARD can access security verify page", async ({ page }) => {
  20 |     await loginForm(page, "guard");
  21 |     await page.goto("/security/verify", { waitUntil: "domcontentloaded" });
  22 |     await expect(page.locator("h1")).toContainText("Security Verification");
  23 |   });
  24 | 
  25 |   test("OFFICE_STAFF can approve", async ({ page }) => {
  26 |     // Must create invitation as PROPERTY_ADMIN first (OFFICE_STAFF cannot create)
  27 |     await loginForm(page, "property");
  28 | 
  29 |     const res = await page.request.post("/api/v1/invitations", {
  30 |       data: {
  31 |         visitor_name: "Office Approve Test",
  32 |         visitor_phone: `+959${Date.now().toString().slice(-8)}`,
  33 |         visitor_type: "GUEST",
  34 |         unit_id: "seed-unit-01",
  35 |         expected_date: new Date("2026-07-01").toISOString(),
  36 |       },
  37 |     });
  38 |     const invId = (await res.json()).data.id;
  39 | 
  40 |     // Logout property, login office
  41 |     await page.goto("/login", { waitUntil: "domcontentloaded" });
  42 |     const officeUser = (await import("../helpers/auth")).USERS.office;
  43 |     await page.fill("#email", officeUser.email);
  44 |     await page.fill("#password", officeUser.password);
  45 |     await page.click('button[type="submit"]');
  46 |     await page.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => {});
  47 | 
  48 |     // Approve as OFFICE_STAFF
  49 |     const appRes = await page.request.post(`/api/v1/invitations/${invId}/approve`, { data: {} });
  50 |     expect(appRes.ok()).toBeTruthy();
  51 |   });
  52 | 
  53 |   test("RESIDENT sees own invitations only", async ({ page }) => {
  54 |     await loginForm(page, "resident");
  55 |     await page.goto("/invitations", { waitUntil: "domcontentloaded" });
> 56 |     await expect(page.locator("h1")).toContainText("Invitations");
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  57 |     // Resident should see either a table or empty state
  58 |     const table = page.locator("table");
  59 |     const empty = page.getByText("No invitations");
  60 |     await expect(table.or(empty).first()).toBeVisible({ timeout: 5000 });
  61 |   });
  62 | 
  63 |   test("all roles can access dashboard", async ({ page }) => {
  64 |     await loginForm(page, "guard");
  65 |     await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  66 |     await expect(page.locator("h1")).toContainText("Dashboard");
  67 |   });
  68 | });
  69 | 
```