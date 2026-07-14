Security Review Skill

Purpose

Review authentication, authorization and application security.

Authentication

- JWT Access Token
- Refresh Token
- Refresh Rotation
- Logout endpoint
- Token revocation

Authorization

Use RBAC.

Roles

- super_admin
- property_admin
- security_guard
- resident
- office_staff

Multi Tenant

Always validate:

property_id

Never allow:

Property A access Property B data.

Passwords

- bcrypt
- minimum 8 characters
- never store plaintext

API Security

- Rate limiting
- Request validation
- Input sanitization
- CORS restrictions

File Upload

Allow:

- image/jpeg
- image/png
- image/webp

Reject:

- executable
- svg
- oversized file

Max Size

5MB

Audit Log

Record:

- login
- logout
- create
- update
- delete
- check-in
- check-out
- failed login
- failed QR scan

Session

- Access token 15 min
- Refresh token 7 days
- Idle timeout 15 min
