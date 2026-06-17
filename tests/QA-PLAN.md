# QA Test Plan — Visitor Registration System

## 1. Smoke Tests (critical path, run first)
- Landing page loads
- Login page loads
- Login as PROPERTY_ADMIN works
- Protected route redirects to login
- Invitation creation works
- Dashboard loads after login

## 2. Role/RBAC Tests
- All 5 roles can login
- Each role sees correct nav items
- SECURITY_GUARD cannot see Approve button
- RESIDENT sees own invitations only
- Protected route redirects unauthenticated users

## 3. Invitation Workflow
- Create with required fields only
- Create with full fields (email, ID type, notes)
- Required field validation shows error
- Approve changes status
- Reject requires reason
- Approval history visible after action

## 4. QR + Badge Workflow
- QR visible only for APPROVED invitations
- Generate QR creates visit
- Generate badge works
- Badge print returns HTML

## 5. Security Verification E2E
- QR lookup shows visit info
- Verification form accepts input
- Duplicate verification rejected
- Check-in after verification
- QR-based checkout
- Checkout rejects non-checked-in visits

## 6. API-Only Tests (stable, no UI flakiness)
- All CRUD endpoints respond
- RBAC enforced at API level
- Audit logs created
- Error responses correct

## Selectors Strategy
- Use stable: `#id`, `[name=]`, `button:has-text()`, `h1`
- Add data-testid only where stable selectors impossible
- Prefer API calls for setup/teardown (not UI)

## Test Data
- Seed accounts for all 5 roles
- Dynamic phone numbers (`+959${timestamp}`) to avoid conflicts
- Fresh seed before test run
