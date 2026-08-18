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

## PR Workflow

1. Create feature branch from `develop`
2. Make changes following code style
3. Run `pnpm lint` and `pnpm test`
4. Commit with conventional format
5. Open PR to `develop`

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
