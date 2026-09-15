# Contributing to SpikeClip

Thanks for your interest in contributing! This guide covers code style, conventions, and workflow.

## Code Style

- **TypeScript strict mode** — No `any` types allowed. Every value must have an explicit type.
- **Clean Architecture** — Follow the layer order: `domain/` → `application/` → `infrastructure/` → `presentation/`
- **Import from `@spikeclip/shared`** — Use path aliases, never relative imports across packages.
- **Functional code** — Prefer pure functions. Use classes only when framework requires it (NestJS controllers, services).
- **No comments** — Code should be self-documenting. Comments are only added when explicitly requested.

## Adding New Endpoints

When adding a new API endpoint:

1. Create the DTO with `@ApiProperty` decorators for Swagger
2. Add `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth` decorators to the controller method
3. Update `API.md` with the new endpoint documentation
4. Add the endpoint tag to `DocumentBuilder` in `main.ts` if creating a new controller
5. Write unit tests for the use case and integration tests for the controller

## Git Conventions

| Prefix | Usage |
|--------|-------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `chore:` | Maintenance, config, dependencies |
| `docs:` | Documentation changes |
| `refactor:` | Code restructuring without behavior change |
| `test:` | Adding or updating tests |
| `style:` | Formatting, no code change |
| `ci:` | CI/CD changes |

Examples:
```
feat: add clip export endpoint
fix: resolve Redis password authentication
chore: update dependencies
docs: add API reference
```

## Branch Strategy (GitFlow-inspired)

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production releases only | ✅ Ruleset (5 checks, linear, 1 review) |
| `develop` | Integration / staging | ✅ Ruleset (5 checks, linear, 1 review) |
| `feature/*` | New features | ❌ |
| `fix/*` | Bug fixes | ❌ |
| `hotfix/*` | Urgent production fixes | ❌ |
| `release/*` | Release preparation (version bump, changelog) | ❌ |

### Workflow

1. **Start from `develop`**:
   ```bash
   git checkout develop && git pull && git checkout -b feature/your-feature-name
   ```

2. **Make changes** following code style

3. **Run checks locally**:
   ```bash
   pnpm lint
   pnpm test
   ```

4. **Commit with conventional format**:
   ```bash
   git commit -m "feat: add clip export endpoint"
   ```

5. **Open PR to `develop`** — not `main`

6. **CI runs automatically** — all 5 checks must pass:
   - Lint & Type Check
   - Prisma Schema Validation
   - Unit Tests
   - Security Audit
   - Build All Packages

7. **At least 1 approving review required** before merge

8. **Squash merge** — keeps linear history

### Hotfixes (Urgent Production Fixes)

```bash
# From main
git checkout main && git pull && git checkout -b hotfix/critical-bug

# Fix, test, PR to main
# After merge to main, backport to develop:
git checkout develop && git pull && git merge main
```

### Releases

```bash
# From develop
git checkout develop && git pull && git checkout -b release/v1.2.0

# Update version, changelog, PR to main AND develop
# After merge, tag release on main
```

## Development Setup

```bash
git clone git@github.com:ahmedhat/SpikeClip.git
cd spikeclips
pnpm install
./scripts/dev.sh
cp .env.example apps/api/.env
pnpm --filter @spikeclip/api prisma:migrate
pnpm dev
```

## Running Tests

```bash
pnpm test                                    # All packages
pnpm --filter @spikeclip/shared test        # Algorithm only
pnpm --filter @spikeclip/api test           # API unit tests
pnpm --filter @spikeclip/api test:e2e       # API E2E tests
pnpm --filter @spikeclip/web test           # Frontend tests
```

## Project Structure

```
SpikeClip/
├── apps/
│   ├── api/            # NestJS 11 backend
│   │   └── src/
│   │       ├── domain/         # Entities, value objects, repository interfaces
│   │       ├── application/    # Use cases, DTOs, mappers
│   │       ├── infrastructure/ # Database, storage, external services, workers
│   │       └── presentation/   # Controllers (API)
│   └── web/            # Next.js 16 frontend
│       └── src/
│           ├── domain/         # Ports (interfaces)
│           ├── application/    # Hooks, use cases
│           ├── infrastructure/ # API clients
│           └── presentation/   # Components, pages
├── packages/
│   └── shared/         # Shared types + spike algorithm
├── deploy/             # VPS deployment (systemd, nginx, scripts)
├── docker/             # Nginx config for Docker
├── scripts/            # dev.sh, prod.sh
├── docs/               # PRD, plan, tasks
└── docker-compose.yml  # Full stack (all services)
```