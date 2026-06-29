---
marp: true
theme: uncover
paginate: true
auto-scaling: true
size: 16:9
---

<!-- _class: lead -->

# 🏢 Visitor Registration System

## QR-Based Digital Visitor Management

**Replace paper visitor logs with secure, instant QR code check-in/check-out.**

Built for condos, apartments, offices, and warehouses.

---

## 🔍 The Problem

- 📋 **Paper visitor logs** — slow, illegible, easily lost
- 🔓 **No audit trail** — who visited, when, and why?
- 😴 **Manual verification** — security guards check IDs by hand
- 📭 **No host notifications** — residents don't know when guests arrive
- 🚫 **No blocklist** — banned visitors can re-enter easily

> Traditional visitor management is **manual, insecure, and unscalable.**

---

## 💡 The Solution

A **web-based visitor registration system** that digitizes the entire visitor lifecycle:

```
Host creates invitation
      ↓
Admin approves / rejects
      ↓
QR code generated + emailed
      ↓
Visitor arrives → security scans QR
      ↓
Inline verification → check-in
      ↓
Host notified in real-time
      ↓
Visitor checks out → audit log
```

---

## ✨ Key Features

| Feature                    | Description                                                   |
| -------------------------- | ------------------------------------------------------------- |
| 🔳 **QR Check-In/Out**     | SHA-256 hashed, time-limited tokens                           |
| 📨 **Invitation Workflow** | Pre-register → Approve → QR email delivery                    |
| 🔔 **Notification Bell**   | 7 event types, real-time in-app alerts                        |
| 🛡️ **5-Role RBAC**         | Super Admin, Property Admin, Security, Resident, Office Staff |
| 🚗 **Vehicle Management**  | Register vehicles, blacklist plates, auto-reject              |
| 📷 **Camera Scanner**      | Browser-based QR scanning with gate workflow                  |
| 🚫 **Visitor Blocklist**   | Block by phone/ID, auto-reject at check-in                    |
| 📊 **Audit Logging**       | 25+ event types with IP, user agent, metadata                 |

---

## 🏗️ Architecture

```
Browser / Mobile / Tablet
        ↓
   Next.js 16 (App Router)
        ↓
   Route Handlers (REST API)
        ↓
   Prisma ORM 7
        ↓
   PostgreSQL 16
```

**Tech Stack:** Next.js · React 19 · TypeScript · Tailwind CSS · shadcn/ui · Prisma · PostgreSQL · Docker

---

## 👥 User Roles

| Role               | Capabilities                                             |
| ------------------ | -------------------------------------------------------- |
| **Super Admin**    | Full system access, multi-property management            |
| **Property Admin** | Manage property users, approve invitations, view reports |
| **Security Guard** | QR scanning, check-in/out, visitor verification          |
| **Resident**       | Create invitations, view own visitor history             |
| **Office Staff**   | Create invitations, manage office visitors               |

---

## 📱 Security Gate Workflow

The **QR Camera Scanner** enables security guards to:

1. **Scan** — Use device camera or manual token entry
2. **Resolve** — Unified lookup (QR token or email access token)
3. **Verify** — Inline verification (photo, vehicle, NDA, safety form)
4. **Check In/Out** — Status transition with full audit trail

All from a **single page** — no navigation required.

---

## 🚗 Vehicle Management

- **Register vehicles** linked to residents or visitors
- **Search** by plate number, owner type, or status
- **Vehicle blacklist** — blocked plates auto-rejected at check-in
- **Vehicle-linked visits** — track which vehicle entered with which visit

---

## 📊 Testing & Quality

| Metric            | Value                                            |
| ----------------- | ------------------------------------------------ |
| Unit Tests        | **264** (Vitest)                                 |
| E2E Tests         | **50** (Playwright)                              |
| TypeScript Errors | **0**                                            |
| Build Status      | **✅ Passing**                                   |
| CI/CD             | GitHub Actions (lint → typecheck → test → build) |

---

## 🐳 Deployment

```bash
# One-command deployment
docker compose up --build -d
```

- **PostgreSQL 16** — Alpine image with healthcheck
- **Next.js** — Multi-stage build, standalone output, non-root user
- **Port** — localhost:3000

---

<!-- _class: lead -->

# 🎯 Visitor Registration System

**Secure · Fast · Auditable**

Replace paper logs with QR codes.

[github.com/aungyephyo2215/vct-visitor-registration-system](https://github.com/aungyephyo2215/vct-visitor-registration-system)
