import { Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  role: string;
  displayName: string;
}

export const USERS: Record<string, TestUser> = {
  admin: { email: "admin@vrs.com", password: "Admin123!", role: "SUPER_ADMIN", displayName: "Super Admin" },
  property: { email: "property@vrs.com", password: "Admin123!", role: "PROPERTY_ADMIN", displayName: "Property Manager" },
  guard: { email: "guard@vrs.com", password: "Guard123!", role: "SECURITY_GUARD", displayName: "Security Guard" },
  resident: { email: "resident@vrs.com", password: "Resident123!", role: "RESIDENT", displayName: "Resident Owner" },
  office: { email: "office@vrs.com", password: "Office123!", role: "OFFICE_STAFF", displayName: "Office Staff" },
};

export async function loginForm(page: Page, role: string) {
  const user = USERS[role];
  if (!user) throw new Error(`Unknown role: ${role}`);

  // Use UI form - it's the only reliable way to get cookies into the browser context
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  // Wait for React hydration: LoginForm uses useSearchParams() behind Suspense,
  // so the form only appears after client-side hydration. Wait for the submit
  // button to be visible and enabled as a reliable hydration signal.
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 15000 });
  await page.waitForSelector("#email", { timeout: 10000 });
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 }).catch(() => {
    // If still on /login, navigate directly
    if (page.url().includes("/login")) {
      page.goto("/dashboard", { waitUntil: "domcontentloaded" }).catch(() => {});
    }
  });
}
