# Architecture Migration — Time Estimates

Based on the current codebase:

- **13 API route groups** (auth, badges, checkin, checkout, invitations, notifications, qr, units, users, vehicles, verify, visitors, visits)
- **Next.js monolith** with Prisma, JWT, bcrypt, nodemailer, zod
- **Existing k8s setup** on ArgoCD with staging/production overlays

---

## Option 2 — Split-Tier (Frontend + API Service)

**Branch:** `arch/k8s-split-tier-deployment`

| Task                                    | Hours       |
| --------------------------------------- | ----------- |
| Extract API to standalone Hono server   | 8–12 h      |
| Strip API routes from Next.js frontend  | 2–3 h       |
| Update all frontend fetch calls         | 3–4 h       |
| Build & test docker/Dockerfile.api      | 2–3 h       |
| Build & test docker/Dockerfile.frontend | 1–2 h       |
| Update GitHub Actions CI (2 build jobs) | 2–3 h       |
| Create k8s Secrets for both namespaces  | 1 h         |
| End-to-end testing on staging cluster   | 3–4 h       |
| **Total**                               | **22–32 h** |

**Realistic timeline:** 3–5 working days (solo dev), 2–3 days (2 engineers)

---

## Option 3 — Full Microservices

**Branch:** `arch/k8s-microservices`

| Task                                                              | Hours       |
| ----------------------------------------------------------------- | ----------- |
| Create monorepo structure (services/ folder)                      | 2–3 h       |
| Extract auth-svc (auth + users routes)                            | 6–8 h       |
| Extract visitor-svc (visitors, visits, checkin, checkout, badges) | 10–14 h     |
| Extract qr-svc (qr, verify, invitations)                          | 8–10 h      |
| Extract notification-svc (notifications + email)                  | 4–5 h       |
| Extract property-svc (units + vehicles)                           | 4–5 h       |
| Implement inter-service token validation pattern                  | 4–6 h       |
| Split Prisma schemas per service                                  | 4–6 h       |
| Build & test 5 Dockerfiles                                        | 4–6 h       |
| Update GitHub Actions (matrix build, 6 images)                    | 3–4 h       |
| Create k8s Secrets for 5 namespaces                               | 1–2 h       |
| ArgoCD ApplicationSet deployment                                  | 1–2 h       |
| Integration + end-to-end testing                                  | 8–12 h      |
| **Total**                                                         | **59–83 h** |

**Realistic timeline:** 8–12 working days (solo dev), 4–6 days (3 engineers)

---

## Comparison Summary

| Dimension           | Option 1 (current) | Option 2        | Option 3     |
| ------------------- | ------------------ | --------------- | ------------ |
| Dev effort          | Done               | ~30 h           | ~70 h        |
| Operational cost    | Low                | Medium          | High         |
| Independent scaling | No                 | Frontend vs API | Per domain   |
| Deployment risk     | Low                | Medium          | High         |
| Team size needed    | 1                  | 1–2             | 3+           |
| k8s complexity      | 2 namespaces       | 3 namespaces    | 8 namespaces |
| Images to build     | 1                  | 2               | 6            |
| ArgoCD Apps         | 1                  | 2               | 6            |

---

## Recommendation

- **Start with Option 2** if you want separation. The k8s manifests on `arch/k8s-split-tier-deployment` are ready to use once you split the codebase.
- **Move to Option 3** only when you have a team large enough that different people own different domains, or when one service needs significantly different scaling from the others.
- **Do not attempt Option 3 alone** without first completing Option 2 — Option 2 establishes the patterns (separate images, CORS, inter-service DNS) that Option 3 builds on.
