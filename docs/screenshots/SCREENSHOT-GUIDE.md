# Screenshot Capture Guide

**Resolution:** 1280×800 (desktop)
**Tool:** Chrome DevTools MCP or Playwright
**Format:** PNG

## Capture Order (10 Screenshots)

| #   | File Name                  | Page                | What to Show                                                                         | Login As         |
| --- | -------------------------- | ------------------- | ------------------------------------------------------------------------------------ | ---------------- |
| 1   | `01-login.png`             | `/login`            | Login page with email/password fields, branding                                      | —                |
| 2   | `02-dashboard.png`         | `/dashboard`        | Dashboard stats widgets (today's visitors, checked in/out, pending, recent activity) | admin@vrs.com    |
| 3   | `03-visitors.png`          | `/visitors`         | Visitor list table with search bar, pagination, action buttons                       | admin@vrs.com    |
| 4   | `04-invitation-create.png` | `/invitations/new`  | Invitation creation form (visitor name, phone, type, unit, expected date)            | resident@vrs.com |
| 5   | `05-invitation-detail.png` | `/invitations/[id]` | Approved invitation with QR email delivery status, approval history                  | admin@vrs.com    |
| 6   | `06-security-scan.png`     | `/security/scan`    | QR camera scanner with camera feed and manual token entry                            | guard@vrs.com    |
| 7   | `07-security-verify.png`   | `/security/verify`  | Gate visitor summary with verification form (NDA, safety form, vehicle)              | guard@vrs.com    |
| 8   | `08-vehicles.png`          | `/vehicles`         | Vehicle list with plate numbers, types, owners, and search filters                   | admin@vrs.com    |
| 9   | `09-notifications.png`     | (any page)          | Notification bell dropdown open, showing 5+ notification types with unread badge     | admin@vrs.com    |
| 10  | `10-visit-detail.png`      | `/visits/[id]`      | Visit detail with visitor info, QR status, verification status, timeline             | admin@vrs.com    |

## Capture Instructions

### Using Playwright MCP

```
1. Set viewport: browser_resize(width=1280, height=800)
2. Navigate: browser_navigate(url="http://localhost:3000/login")
3. Login with appropriate account
4. Navigate to target page
5. Wait for data to load
6. Capture: browser_take_screenshot(type="png", filename="docs/screenshots/XX-name.png")
```

### Pre-Capture Checklist

- [ ] Seed data is loaded (run `npx prisma db seed`)
- [ ] At least 5 visitors exist
- [ ] At least 3 invitations exist (1 pending, 1 approved, 1 rejected)
- [ ] At least 1 visit has a QR code generated
- [ ] At least 1 visit is checked in
- [ ] At least 3 vehicles registered
- [ ] Notifications exist for the logged-in user
- [ ] Browser zoom is at 100%
- [ ] No browser extensions visible in toolbar

### Post-Capture

- Verify all 10 files exist in `docs/screenshots/`
- Verify file names match the report.md references
- Verify images are not blurry or cropped
- Verify no sensitive data (real emails, passwords) visible
