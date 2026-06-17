# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: invitation.spec.ts >> Invitation Workflow >> reject with reason
- Location: tests/e2e/invitation.spec.ts:78:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img [ref=e6]
      - generic [ref=e12]: Sign In
      - generic [ref=e13]: Enter your credentials to access the system
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Email
          - textbox "Email" [ref=e18]:
            - /placeholder: admin@vrs.com
        - generic [ref=e19]:
          - generic [ref=e20]: Password
          - generic [ref=e21]:
            - textbox "Password" [ref=e22]:
              - /placeholder: ••••••••
            - button [ref=e23]:
              - img
        - generic [ref=e24]: Email and password are required
        - button "Sign In" [active] [ref=e25]
      - link "Back to home" [ref=e27] [cursor=pointer]:
        - /url: /
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e33] [cursor=pointer]:
    - img [ref=e34]
  - alert [ref=e37]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { loginForm, USERS } from "../helpers/auth";
  3   | 
  4   | const PHONE = `+959${Date.now().toString().slice(-8)}`;
  5   | 
  6   | test.describe("Invitation Workflow", () => {
  7   |   let invId: string;
  8   | 
  9   |   test("PROPERTY_ADMIN creates invitation with required fields", async ({ page }) => {
  10  |     await loginForm(page, "property");
  11  |     await page.goto("/invitations/new", { waitUntil: "domcontentloaded" });
  12  |     await page.waitForSelector("#visitor_name", { timeout: 10000 });
  13  | 
  14  |     await page.fill("#visitor_name", "Smoke Test Visitor");
  15  |     await page.fill("#visitor_phone", PHONE);
  16  |     await page.fill("#expected_date", "2026-07-01");
  17  | 
  18  |     // Open unit dropdown and select first option
  19  |     const unitSelect = page.locator("#unit");
  20  |     if (await unitSelect.isVisible()) {
  21  |       await unitSelect.click();
  22  |       await page.waitForTimeout(500);
  23  |       const option = page.locator('[role="option"]').first();
  24  |       if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
  25  |         await option.click();
  26  |       }
  27  |     }
  28  | 
  29  |     await page.click('button[type="submit"]');
  30  |     await page.waitForURL(/\/invitations(\/|$)/, { timeout: 15000 });
  31  |     await expect(page.locator("h1")).toContainText("Invitations");
  32  |   });
  33  | 
  34  |   test("required fields show validation error", async ({ page }) => {
  35  |     await loginForm(page, "property");
  36  |     await page.goto("/invitations/new", { waitUntil: "domcontentloaded" });
  37  |     await page.waitForSelector("#visitor_name");
  38  |     // Remove required attributes to bypass HTML5 validation, then click submit
  39  |     await page.evaluate(() => {
  40  |       document.querySelectorAll("[required]").forEach(el => el.removeAttribute("required"));
  41  |     });
  42  |     await page.click('button[type="submit"]');
  43  |     await page.waitForTimeout(1000);
  44  |     // React validation should show: "Visitor name, phone, unit, and expected date are required"
  45  |     await expect(page.getByText("are required")).toBeVisible({ timeout: 5000 });
  46  |   });
  47  | 
  48  |   test("approve via API changes status", async ({ page }) => {
  49  |     await loginForm(page, "property");
  50  | 
  51  |     // Create via API
  52  |     const res = await page.request.post("/api/v1/invitations", {
  53  |       data: {
  54  |         visitor_name: "Approve Test",
  55  |         visitor_phone: `${PHONE}app`,
  56  |         visitor_type: "GUEST",
  57  |         unit_id: "seed-unit-01",
  58  |         expected_date: new Date("2026-07-01").toISOString(),
  59  |       },
  60  |     });
  61  |     const data = await res.json();
  62  |     invId = data.data?.id;
  63  |     expect(invId).toBeTruthy();
  64  | 
  65  |     // Approve
  66  |     const appRes = await page.request.post(`/api/v1/invitations/${invId}/approve`, { data: {} });
  67  |     expect(appRes.ok()).toBeTruthy();
  68  |     const appData = await appRes.json();
  69  |     expect(appData.data.status).toBe("APPROVED");
  70  | 
  71  |     // Check approval history
  72  |     const histRes = await page.request.get(`/api/v1/invitations/${invId}/approvals`);
  73  |     expect(histRes.ok()).toBeTruthy();
  74  |     const histData = await histRes.json();
  75  |     expect(histData.data.length).toBeGreaterThanOrEqual(1);
  76  |   });
  77  | 
  78  |   test("reject with reason", async ({ page }) => {
  79  |     await loginForm(page, "property");
  80  | 
  81  |     const res = await page.request.post("/api/v1/invitations", {
  82  |       data: {
  83  |         visitor_name: "Reject Test",
  84  |         visitor_phone: `${PHONE}rej`,
  85  |         visitor_type: "VENDOR",
  86  |         unit_id: "seed-unit-01",
  87  |         expected_date: new Date("2026-07-02").toISOString(),
  88  |       },
  89  |     });
  90  |     const data = await res.json();
  91  |     const id = data.data?.id;
  92  | 
  93  |     const rejRes = await page.request.post(`/api/v1/invitations/${id}/reject`, {
  94  |       data: { reason: "Not expected today" },
  95  |     });
> 96  |     expect(rejRes.ok()).toBeTruthy();
      |                         ^ Error: expect(received).toBeTruthy()
  97  |     const rejData = await rejRes.json();
  98  |     expect(rejData.data.status).toBe("REJECTED");
  99  |     expect(rejData.data.reason).toBe("Not expected today");
  100 |   });
  101 | 
  102 |   test("SECURITY_GUARD cannot approve", async ({ page }) => {
  103 |     await loginForm(page, "guard");
  104 |     const res = await page.request.post("/api/v1/invitations/some-id/approve", { data: {} });
  105 |     expect(res.status()).not.toBe(200);
  106 |   });
  107 | 
  108 |   test("QR + Badge + Print", async ({ page }) => {
  109 |     await loginForm(page, "property");
  110 | 
  111 |     // Create + approve
  112 |     const invRes = await page.request.post("/api/v1/invitations", {
  113 |       data: {
  114 |         visitor_name: "QR Badge Test",
  115 |         visitor_phone: `${PHONE}qr`,
  116 |         visitor_type: "VIP",
  117 |         unit_id: "seed-unit-01",
  118 |         expected_date: new Date("2026-07-01").toISOString(),
  119 |       },
  120 |     });
  121 |     const invData = await invRes.json();
  122 |     const id = invData.data.id;
  123 |     await page.request.post(`/api/v1/invitations/${id}/approve`, { data: {} });
  124 | 
  125 |     // Generate QR
  126 |     const qrRes = await page.request.post(`/api/v1/invitations/${id}/generate-qr`, { data: {} });
  127 |     expect(qrRes.ok()).toBeTruthy();
  128 |     const qrData = await qrRes.json();
  129 |     expect(qrData.data.token).toBeTruthy();
  130 |     expect(qrData.data.visit_id).toBeTruthy();
  131 | 
  132 |     // Generate badge
  133 |     const badgeRes = await page.request.post("/api/v1/badges", {
  134 |       data: { invitation_id: id },
  135 |     });
  136 |     expect(badgeRes.ok()).toBeTruthy();
  137 |     const badgeData = await badgeRes.json();
  138 |     expect(badgeData.data.id).toBeTruthy();
  139 | 
  140 |     // Print page returns HTML
  141 |     const printRes = await page.request.get(`/api/v1/badges/${badgeData.data.id}/print`);
  142 |     expect(printRes.ok()).toBeTruthy();
  143 |     const ct = printRes.headers()["content-type"] || "";
  144 |     expect(ct).toContain("text/html");
  145 |   });
  146 | });
  147 | 
```