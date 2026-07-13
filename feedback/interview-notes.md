# User Interview — Visitor Registration System

- **Who:** Aung Kyaw Myint — Developer & Project Owner
- **When:** 2026-07-13
- **How:** Structured interview (Claude Code guided) — ~20 min

## What they do today (without your project)

As the developer and project owner, I interact with the system almost every day during development and testing. I regularly test the main workflows including visitor invitations, approvals, QR verification, check-in, check-out, and vehicle management.

## What they liked

- The complete visitor lifecycle workflow connecting invitation → approval → QR delivery → verification → check-in → check-out into one integrated platform.
- The scanner-first gate workflow — security scans once, views visitor info, verifies inline, checks in, and later scans again to check out. No unnecessary page navigation or repeated QR scanning.
- Vehicle management is very useful for condos, gated communities, offices, and warehouses where security needs to identify both the visitor and the vehicle.
- The invitation and approval flow follows a clear sequence: create invitation → admin approval → QR generation → email delivery.
- Notifications are valuable for key events like invitation approval, rejection, QR delivery, and visitor status changes.

## What confused them / what's missing

- The invitation flow feels slightly long — multiple steps and status changes before the visitor receives the QR code. Status and next required action need to be more visible, especially around approval and email delivery.
- Camera lifecycle reliability issues during QR scanning — the scanner entered a start/stop loop, and inconsistent states appeared where the live camera preview worked but the UI still showed "Camera unavailable." Camera state synchronization needs to be reliable for real gate operations.
- The most confusing part for a new user is understanding the complete visitor lifecycle and knowing which role is responsible for each step. The relationship between invitation approval (pre-arrival) and the security gate workflow (at arrival) is the hardest to explain.
- Notifications should be prioritized carefully so they do not become noise. Notification categories, priority levels, and user preferences are needed so each role receives only relevant alerts.

## What would make them actually use it

- Clearer status labels, next-action guidance, onboarding hints, and a visual workflow showing where each visitor currently is in the lifecycle.
- Production reliability and usability of the QR camera scanner across different devices and browsers — the gate workflow is operationally critical, so camera startup, scanning, error recovery, and status messages must be completely reliable and consistent.
- Future notifications for important security events: blocked visitor detected, blacklisted vehicle detected, failed QR verification, and visitor staying beyond expected visit time.

## What I'll change (next steps)

- [ ] Improve status visibility in the invitation flow — show current status and next required action clearly
- [ ] Fix QR camera scanner reliability across devices and browsers — consistent camera state, error recovery, and status messages
- [ ] Add onboarding guidance for new users — visual lifecycle diagram, role-based step explanations
- [ ] Plan notification improvements — categories, priority levels, role-based filtering (carry to Chapter 6)
