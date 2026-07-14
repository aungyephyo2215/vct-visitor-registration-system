# Testing Skill

## Purpose

Create reliable and maintainable tests.

---

## Test Pyramid

Unit Test

↓

Integration Test

↓

E2E Test

---

## Unit Tests

Test:

- utility functions
- validation
- services
- helpers

Use:

- Vitest

---

## Integration Tests

Test:

- API endpoints
- Database queries
- Authentication
- Prisma

Use:

- Test Database

---

## E2E Tests

Test:

- Login

- Visitor Registration

- QR Generation

- Check-In

- Check-Out

- Dashboard

Use:

- Playwright

---

## Test Data

Always:

- seed database

- use fake data

- isolate tests

Never:

- use production database

---

## Coverage

Target:

- Unit: 80%

- Integration: 70%

- E2E:

critical workflows only

---

## Visitor System Critical Tests

Must test:

✓ Login success

✓ Login failure

✓ Register visitor

✓ Generate QR

✓ QR expiration

✓ QR replay attack

✓ Check-in success

✓ Check-in failure

✓ Check-out success

✓ Blocklisted visitor

✓ Multi-tenant isolation

✓ Audit log creation

---

## CI

Before merge:

```bash
npm run lint

npm run test

npm run build
```

All tests must pass.
