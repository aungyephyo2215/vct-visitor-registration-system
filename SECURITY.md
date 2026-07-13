# Security Policy

---

## Reporting a Vulnerability

If you discover a security vulnerability within the Visitor Registration System, please send an email to the project maintainer. All security vulnerabilities will be promptly addressed.

**Please do NOT report security vulnerabilities through public GitHub issues.**

### What to include

- Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

| Action                 | Timeline         |
| :--------------------- | :--------------- |
| Acknowledgment         | Within 48 hours  |
| Initial assessment     | Within 1 week    |
| Fix development        | Within 2 weeks   |
| Security patch release | As soon as ready |

---

## Security Measures

### Authentication & Authorization

- **JWT (JSON Web Tokens)** with `jose` library for secure token handling
- **Refresh Token Rotation** — each refresh invalidates the previous token
- **bcryptjs** for password hashing with salt rounds
- **Role-Based Access Control (RBAC)** — 5 roles with property-level isolation
- **Middleware protection** on all `/protected` routes

### Data Protection

- **Environment variables** for all secrets (never hardcoded)
- **`.env.example`** provided without actual secrets
- **`.gitignore`** excludes `.env`, `.env.local`, and sensitive files
- **HTTPS enforcement** in production
- **CORS configuration** for API routes

### Database Security

- **Parameterized queries** via Prisma ORM (prevents SQL injection)
- **Input validation** with Zod schemas on all API endpoints
- **Soft deletes** for data retention and audit trails
- **Database connection pooling** with SSL in production

### QR Code Security

- **SHA-256 token hashing** for QR codes
- **Time-limited tokens** with expiration
- **Single-use validation** where applicable
- **Cryptographically secure** random generation

### API Security

- **Input validation** on all endpoints
- **Rate limiting** considerations
- **Error handling** that doesn't leak sensitive information
- **Audit logging** for all security-relevant events

---

## Supported Versions

| Version | Supported         |
| :------ | :---------------- |
| 1.5.x   | ✅ Active support |
| < 1.5   | ❌ No support     |

---

## Security Updates

Security updates will be released as:

- **Patch releases** (e.g., 1.5.1) for critical vulnerabilities
- **Minor releases** (e.g., 1.6.0) for security improvements
- **GitHub Security Advisories** for public disclosure

---

## Best Practices for Contributors

1. **Never commit secrets** — API keys, passwords, tokens
2. **Validate all inputs** — Use Zod schemas
3. **Use parameterized queries** — Never concatenate SQL
4. **Handle errors safely** — Don't expose internal details
5. **Follow least privilege** — Minimal required permissions
6. **Review dependencies** — Keep packages updated

---

## Security Checklist for Deployments

- [ ] Environment variables configured (not hardcoded)
- [ ] Database connection uses SSL
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] JWT secrets are strong and unique
- [ ] Refresh token rotation enabled
- [ ] Audit logging active
- [ ] Error logging configured
- [ ] Dependencies up to date

---

**Contact:** Report security issues via GitHub or email the maintainer.

**Maintainer:** [aungyephyo2215](https://github.com/aungyephyo2215)
