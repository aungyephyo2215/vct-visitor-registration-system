import { test, expect } from "@playwright/test";
import { loginForm } from "../helpers/auth";

const PHONE = `+959${Date.now().toString().slice(-8)}`;

test.describe("Full E2E: Invite → Approve → QR → Verify → Check-in → Checkout", () => {
  let token: string;
  let visitId: string;

  test("complete flow", async ({ page }) => {
    await loginForm(page, "property");

    // Setup
    const invRes = await page.request.post("/api/v1/invitations", {
      data: {
        visitor_name: "Full E2E Test",
        visitor_phone: PHONE,
        visitor_type: "FAMILY",
        unit_id: "seed-unit-01",
        expected_date: new Date("2026-07-15").toISOString(),
      },
    });
    const invData = await invRes.json();
    const invId = invData.data.id;
    expect(invId).toBeTruthy();

    // Approve
    const appRes = await page.request.post(`/api/v1/invitations/${invId}/approve`, { data: {} });
    expect(appRes.ok()).toBeTruthy();

    // Generate QR
    const qrRes = await page.request.post(`/api/v1/invitations/${invId}/generate-qr`, { data: {} });
    expect(qrRes.ok()).toBeTruthy();
    const qrData = await qrRes.json();
    token = qrData.data.token;
    visitId = qrData.data.visit_id;
    expect(token).toBeTruthy();
    expect(visitId).toBeTruthy();

    // Verify
    const verRes = await page.request.post(`/api/v1/visits/${visitId}/verification`, {
      data: {
        visitor_name: "E2E Visitor",
        visitor_phone: PHONE,
        nda_signed: true,
        safety_form_signed: false,
      },
    });
    expect(verRes.ok()).toBeTruthy();
    const verData = await verRes.json();
    expect(verData.data.nda_signed).toBe(true);
    expect(verData.data.visitor_id).toBeTruthy();

    // Check-in
    const cinRes = await page.request.post("/api/v1/checkin", {
      data: { token },
    });
    expect(cinRes.ok()).toBeTruthy();
    const cinData = await cinRes.json();
    expect(cinData.data.status).toBe("CHECKED_IN");

    // QR Check-out
    const coutRes = await page.request.post("/api/v1/checkout/qr", {
      data: { token },
    });
    expect(coutRes.ok()).toBeTruthy();
    const coutData = await coutRes.json();
    expect(coutData.data.status).toBe("CHECKED_OUT");

    // Duplicate checkout fails
    const dupRes = await page.request.post("/api/v1/checkout/qr", {
      data: { token },
    });
    expect(dupRes.status()).toBe(400);
  });
});
