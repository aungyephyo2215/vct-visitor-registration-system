# Contributing to Visitor Registration System

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

---

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20+)
- PostgreSQL 16+
- Docker & Docker Compose (optional)
- Git

### Setup

1. **Fork the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/vct-visitor-registration-system.git
   cd visitor-registration-system
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and secrets
   ```

4. **Start database**

   ```bash
   docker compose up -d postgres
   ```

5. **Run migrations and seed**

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

6. **Start development server**

   ```bash
   npm run dev
   ```

---

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

| Prefix      | Purpose           | Example                    |
| ----------- | ----------------- | -------------------------- |
| `feat/`     | New features      | `feat/visitor-check-in`    |
| `fix/`      | Bug fixes         | `fix/qr-scanner-state`     |
| `docs/`     | Documentation     | `docs/api-reference`       |
| `refactor/` | Code refactoring  | `refactor/auth-middleware` |
| `test/`     | Adding tests      | `test/invitation-api`      |
| `chore/`    | Maintenance tasks | `chore/dependency-update`  |

### Commit Messages

Follow Conventional Commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(visitor): add bulk import functionality
fix(qr-scanner): resolve camera state synchronization issue
docs(api): update invitation endpoint documentation
```

---

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**

   ```bash
   npm test              # Unit tests
   npx playwright test   # E2E tests
   npm run check         # TypeScript + ESLint
   ```

2. **Update documentation** if you changed APIs or workflows

3. **Add tests** for new functionality

4. **Keep PRs focused** — one feature or fix per PR

### PR Template

When creating a PR, include:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-reviewed code
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. All PRs require at least one review
2. CI checks must pass (lint, type-check, tests)
3. Address review feedback promptly
4. Squash and merge after approval

---

## Coding Standards

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer `interface` over `type` for object shapes
- Use `readonly` for immutable properties
- Avoid `any` — use `unknown` if type is truly unknown

### React / Next.js

- Use functional components with hooks
- Server Components by default, Client Components only when needed
- Keep components small and focused (Single Responsibility)
- Co-locate related files (component, tests, types)

### Styling

- Use Tailwind CSS utility classes
- Follow shadcn/ui patterns for components
- Maintain consistent spacing and typography

### API Routes

- Validate all inputs with Zod
- Return proper HTTP status codes
- Use consistent error response format
- Log errors for debugging

---

## Testing Requirements

### Unit Tests

- Write tests for all business logic
- Mock external dependencies (database, email, etc.)
- Aim for meaningful coverage, not just high numbers

### E2E Tests

- Test critical user flows
- Use Page Object Model pattern
- Handle async operations properly

### Running Tests

```bash
npm test                  # Run all unit tests
npm run test:watch        # Watch mode
npx playwright test       # Run E2E tests
npx playwright test --ui  # Playwright UI mode
```

---

## Documentation

- Update README.md for new features
- Add JSDoc comments for public functions
- Update API documentation for endpoint changes
- Include code examples where helpful

---

## Questions?

- Open a [Discussion](https://github.com/aungyephyo2215/vct-visitor-registration-system/discussions)
- Check existing [Issues](https://github.com/aungyephyo2215/vct-visitor-registration-system/issues)

---

Thank you for contributing! 🎉
