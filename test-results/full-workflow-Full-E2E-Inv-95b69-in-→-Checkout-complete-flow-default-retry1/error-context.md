# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-workflow.spec.ts >> Full E2E: Invite → Approve → QR → Verify → Check-in → Checkout >> complete flow
- Location: tests/e2e/full-workflow.spec.ts:10:7

# Error details

```
TypeError: Cannot read properties of undefined (reading 'id')
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
        - button "Sign In" [ref=e24]
      - link "Back to home" [ref=e26] [cursor=pointer]:
        - /url: /
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e32] [cursor=pointer]:
    - img [ref=e33]
  - alert [ref=e36]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { loginForm } from "../helpers/auth";
  3  | 
  4  | const PHONE = `+959${Date.now().toString().slice(-8)}`;
  5  | 
  6  | test.describe("Full E2E: Invite → Approve → QR → Verify → Check-in → Checkout", () => {
  7  |   let token: string;
  8  |   let visitId: string;
  9  | 
  10 |   test("complete flow", async ({ page }) => {
  11 |     await loginForm(page, "property");
  12 | 
  13 |     // Setup
  14 |     const invRes = await page.request.post("/api/v1/invitations", {
  15 |       data: {
  16 |         visitor_name: "Full E2E Test",
  17 |         visitor_phone: PHONE,
  18 |         visitor_type: "FAMILY",
  19 |         unit_id: "seed-unit-01",
  20 |         expected_date: new Date("2026-07-15").toISOString(),
  21 |       },
  22 |     });
  23 |     const invData = await invRes.json();
> 24 |     const invId = invData.data.id;
     |                                ^ TypeError: Cannot read properties of undefined (reading 'id')
  25 |     expect(invId).toBeTruthy();
  26 | 
  27 |     // Approve
  28 |     const appRes = await page.request.post(`/api/v1/invitations/${invId}/approve`, { data: {} });
  29 |     expect(appRes.ok()).toBeTruthy();
  30 | 
  31 |     // Generate QR
  32 |     const qrRes = await page.request.post(`/api/v1/invitations/${invId}/generate-qr`, { data: {} });
  33 |     expect(qrRes.ok()).toBeTruthy();
  34 |     const qrData = await qrRes.json();
  35 |     token = qrData.data.token;
  36 |     visitId = qrData.data.visit_id;
  37 |     expect(token).toBeTruthy();
  38 |     expect(visitId).toBeTruthy();
  39 | 
  40 |     // Verify
  41 |     const verRes = await page.request.post(`/api/v1/visits/${visitId}/verification`, {
  42 |       data: {
  43 |         visitor_name: "E2E Visitor",
  44 |         visitor_phone: PHONE,
  45 |         nda_signed: true,
  46 |         safety_form_signed: false,
  47 |       },
  48 |     });
  49 |     expect(verRes.ok()).toBeTruthy();
  50 |     const verData = await verRes.json();
  51 |     expect(verData.data.nda_signed).toBe(true);
  52 |     expect(verData.data.visitor_id).toBeTruthy();
  53 | 
  54 |     // Check-in
  55 |     const cinRes = await page.request.post("/api/v1/checkin", {
  56 |       data: { token },
  57 |     });
  58 |     expect(cinRes.ok()).toBeTruthy();
  59 |     const cinData = await cinRes.json();
  60 |     expect(cinData.data.status).toBe("CHECKED_IN");
  61 | 
  62 |     // QR Check-out
  63 |     const coutRes = await page.request.post("/api/v1/checkout/qr", {
  64 |       data: { token },
  65 |     });
  66 |     expect(coutRes.ok()).toBeTruthy();
  67 |     const coutData = await coutRes.json();
  68 |     expect(coutData.data.status).toBe("CHECKED_OUT");
  69 | 
  70 |     // Duplicate checkout fails
  71 |     const dupRes = await page.request.post("/api/v1/checkout/qr", {
  72 |       data: { token },
  73 |     });
  74 |     expect(dupRes.status()).toBe(400);
  75 |   });
  76 | });
  77 | 
```