# GitHub Actions Skill

## Purpose

Create CI/CD pipelines using GitHub Actions.

---

## Pipeline

Git Push

↓

Lint

↓

Test

↓

Build

↓

Docker Build

↓

Deploy

---

## Workflow Rules

Always:

- Run npm ci
- Run lint
- Run tests
- Build application
- Fail fast

---

## Secrets

Never hardcode:

- DATABASE_URL
- JWT_SECRET
- API_KEY
- SSH_KEY

Store in:

GitHub Secrets

---

## Docker Build

Build image:

```bash
docker build -t app .
```

Tag:

```bash
latest

v1

v2
```

---

## Deployment

Development

```text
GitHub

↓

GitHub Actions

↓

Docker Compose

↓

Development Server
```

Production

```text
GitHub

↓

GitHub Actions

↓

Docker Image

↓

Production Server

↓

Docker Compose
```

---

## Branch Strategy

main

- production

develop

- development

feature/*

- new features

hotfix/*

- urgent fixes

---

## Best Practices

Always:

- use caching
- use matrix testing
- pin action versions
- separate build and deploy

Never:

- deploy directly from feature branch
- expose secrets
