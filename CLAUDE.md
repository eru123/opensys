# CLAUDE.md — AI Assistant Guide for OpenSys

This document is the primary reference for AI assistants (Claude and others) working on this codebase. Read this before making any changes.

---

## Project Overview

**OpenSys** is a full-stack starter template for building internal platforms and SaaS control panels. It provides a production-ready foundation with authentication, user management, email handling, audit logging, and system configuration built in.

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Radix UI
- **Backend**: PHP 8.2+ REST API (custom router, PSR-4, service/controller/model pattern)
- **Database**: MySQL 8+ with Phinx migrations
- **Package manager**: pnpm (v10.30.1) — do **not** use npm or yarn
- **PHP dependencies**: Composer

---

## Directory Structure

```
opensys/
├── src/                    # React frontend (TypeScript/TSX)
│   ├── components/         # Shared UI components (Radix-based primitives in ui/)
│   ├── pages/              # Route-level page components
│   ├── hooks/              # Custom React hooks (data fetching, auth, etc.)
│   ├── stores/             # Zustand state stores (auth, etc.)
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Utility functions (branding, form helpers)
│   ├── App.tsx             # Root router with lazy-loaded pages
│   └── main.tsx            # React entry point (React Query + BrowserRouter)
├── api/                    # PHP backend
│   ├── Controllers/        # Request handlers + route orchestration
│   │   └── Routes.php      # Canonical route definitions
│   ├── Services/           # Business logic (Auth, Email, Cache, Audit, etc.)
│   ├── Models/             # Database abstractions
│   ├── Middleware/         # CORS, CSRF, RateLimit, Auth middleware
│   ├── Router.php          # Custom PHP router
│   └── Context.php         # Request/response context object
├── db/
│   └── migrations/         # Phinx migration files (26 migrations)
├── docker/                 # Docker base image (PHP 8.4 + Apache + Node 22)
├── docs/                   # Architecture and operational docs
├── skills/                 # Custom agent skill implementations (PHP)
├── public/                 # Static assets
├── uploads/                # User-uploaded files
├── index.php               # PHP entry point (router bootstrap + SPA fallback)
├── phinx.php               # Database migration config
├── vite.config.js          # Vite config (proxies /api, /assets to PHP port 8000)
├── tailwind.config.js      # TailwindCSS (dark mode, HSL color system)
├── tsconfig.json           # TypeScript (ES2020, path aliases: @/* → src/*)
├── composer.json           # PHP dependencies + PSR-4 autoload (Api\ → api/)
└── package.json            # Frontend scripts and dependencies
```

---

## Development Setup

### Prerequisites

- PHP 8.2+, Composer
- Node.js 20+, pnpm (auto-installed via Composer post-install hook)
- MySQL 8+

### Initial Setup

```bash
# Install all dependencies (also triggers pnpm install automatically)
composer install

# Configure environment
cp .env.example .env
# Edit .env with your DB credentials and app URLs

# Create MySQL database
mysql -u root -p -e "CREATE DATABASE opensys;"

# Run migrations
pnpm db:migrate

# Start development servers (Vite frontend + PHP backend)
pnpm dev
```

Development URLs:
- Frontend: `http://localhost:5173`
- API: `http://127.0.0.1:8000/api`

---

## Key Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start Vite frontend + PHP backend |
| `pnpm build` | TypeScript check + Vite production build |
| `pnpm lint` | ESLint |
| `pnpm type-check` | TypeScript check only (no emit) |
| `pnpm db:migrate` | Run pending Phinx migrations |
| `pnpm db:rollback` | Rollback last migration |
| `pnpm db:reset` | Rollback all migrations |
| `pnpm db:create` | Create a new migration file |
| `vendor/bin/phpunit` | Run PHP tests |

**Quality gates before any merge** (run what is relevant to your changes):

```bash
pnpm lint
pnpm type-check
pnpm build
vendor/bin/phpunit
```

---

## Environment Variables

Defined in `.env` (copy from `.env.example`):

```
# Frontend (Vite exposes VITE_* to the browser)
VITE_API_URL=http://localhost:8000
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME=Open System
VITE_APP_SHORT_NAME=OpenSys
VITE_COMPANY_NAME=OpenSys

# Database
DB_HOST=localhost
DB_NAME=opensys
DB_USER=opensys
DB_PASS=opensys
DB_PORT=3306
```

SMTP is configured via the System Settings admin panel at runtime, not via `.env`.

---

## Architecture

### Backend (PHP)

The layered architecture is strict — respect boundaries:

- **Controllers** (`api/Controllers/`): Thin orchestrators. Handle HTTP in/out, call services, return responses. No business logic here.
- **Services** (`api/Services/`): All business logic. Auth, email, cache, OTP, audit, SMTP, etc.
- **Models** (`api/Models/`): Database access only. SQL queries, result mapping.
- **Middleware** (`api/Middleware/`): CORS, CSRF, rate limiting, authentication.
- **Router/Context** (`api/Router.php`, `api/Context.php`): Lightweight custom routing. `Context` carries the request/response lifecycle.

PSR-4 namespace: `Api\` maps to `api/`.

#### Adding a new API endpoint

1. Create/update controller in `api/Controllers/`
2. Add service logic in `api/Services/` if needed
3. Register route in `api/Controllers/Routes.php`
4. Apply appropriate middleware (`$auth` or `$admin`) to protect the route

### Frontend (React/TypeScript)

- **Pages** (`src/pages/`): Route-level components. Orchestrate hooks and UI. Keep minimal logic.
- **Hooks** (`src/hooks/`): Data fetching (React Query), state, and shared logic.
- **Stores** (`src/stores/`): Zustand stores for global client state (e.g., `useAuthStore`).
- **Components** (`src/components/ui/`): Radix UI-based primitives. Use these before creating new ones.
- **Types** (`src/types/index.ts`): Shared TypeScript interfaces (User, Role, InvitationSummary, etc.).

Path alias: `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.js`).

---

## API Routes Reference

All routes are under `/api` prefix. Two middleware levels:
- `$auth` — requires valid session token
- `$admin` — requires admin role

| Group | Method | Path | Auth | Description |
|---|---|---|---|---|
| **Auth** | GET | `/api/auth/admin-count` | Public | Check admin count (for setup) |
| | POST | `/api/auth/setup-admin` | Public | Initial admin registration |
| | POST | `/api/auth/register` | Public | User self-registration |
| | POST | `/api/auth/login` | Public | Login |
| | POST | `/api/auth/refresh` | Public | Refresh JWT token |
| | POST | `/api/auth/logout` | Auth | Logout |
| | GET | `/api/auth/me` | Auth | Current user info |
| | POST | `/api/auth/invite` | Admin | Invite a user |
| **System Settings** | GET | `/api/system-settings/public` | Public | Public app config |
| | GET/PUT | `/api/system-settings/security` | Admin | Security settings |
| | PUT | `/api/system-settings/company` | Admin | Company branding |
| | GET/PUT | `/api/system-settings/smtp` | Admin | SMTP config |
| **Email Templates** | CRUD + preview | `/api/email-templates` | Admin | Transactional templates |
| **Emails** | POST | `/api/emails/send-template` | Admin | Send templated email |
| | POST | `/api/emails/send-raw` | Admin | Send raw email |
| **Customers** | CRUD | `/api/customers/profiles` | Admin | Customer profiles |
| | CRUD | `/api/customers/groups` | Admin | Customer groups |
| | CRUD | `/api/customers/marketing-templates` | Admin | Marketing email templates |
| | POST/GET | `/api/customers/marketing-emails/queue` | Admin | Marketing email queue |
| **Users** | GET | `/api/users` | Admin | List users |
| | PUT | `/api/users/{id}` | Admin | Update user |
| | POST | `/api/users/{id}/approve` | Admin | Approve pending user |
| | POST | `/api/users/{id}/reject` | Admin | Reject pending user |
| **Profile** | GET/PUT | `/api/profile` | Auth | Own profile |
| | PUT | `/api/profile/password` | Auth | Change password |
| **Public Profile** | GET | `/api/u/{username}` | Public | User profile by username |
| **Uploads** | CRUD | `/api/uploads` | Auth | File upload management |
| **Audit Logs** | GET | `/api/audit-logs` | Admin | Admin audit trail |
| **Auth Logs** | GET | `/api/authentication-logs` | Auth | Login/auth history |
| **Error Logs** | GET/DELETE | `/api/error-logs` | Admin | Application error logs |

---

## Database

Migrations are in `db/migrations/` (Phinx). Key tables:

| Table | Purpose |
|---|---|
| `users` | User accounts with MFA, roles, approval status |
| `user_invitations` | Admin invitation workflow |
| `user_activities` | User activity tracking |
| `pending_registrations` | Registration verification flow |
| `email_templates` | Transactional email templates |
| `marketing_email_templates` | Marketing email templates |
| `marketing_email_requests` | Marketing email queue |
| `customer_profiles` | External customer records |
| `customer_groups` | Customer segmentation |
| `audit_logs` | Admin action audit trail |
| `authentication_logs` | Login attempt history |
| `error_logs` | Application error log |
| `kv_store` | Key-value cache (DB-backed, Redis-migratable) |
| `system_settings` | Global runtime configuration |
| `api_keys` | API key management |
| `device_verification` | MFA device verification |
| `user_otp` | OTP for MFA |

**Migration rules:**
- Always make migrations reversible where possible
- Avoid destructive operations without clear mitigation
- Consider production lock/time implications before running large migrations

---

## Authentication & Authorization

- JWT tokens with refresh flow
- Roles: `admin`, `support`, `client` (check `api/Services/AuthService.php`)
- Middleware: `$auth` validates token; `$admin` additionally checks admin role
- MFA: Email/authenticator app OTP support
- User lifecycle: registration → email verification → admin approval → active

---

## Frontend State Management

- **Server state**: React Query (`@tanstack/react-query`) — all API data fetching/caching
  - Configured with 5-minute stale time in `src/main.tsx`
  - Always handle cache invalidation after mutations
- **Client state**: Zustand (`zustand`) — auth store and other global UI state
  - Auth store: `src/stores/` (handles login/logout/token/refresh)
- **Forms**: React Hook Form + Zod validation
- **HTTP**: Axios for API calls

`snake_case` (PHP API) to `camelCase` (TypeScript) field name conventions must be explicitly handled — there is no automatic transformer; check each consumer.

---

## UI Component System

- **Primitives**: `src/components/ui/` — Radix UI-based, themed with TailwindCSS HSL variables
- **Icons**: `lucide-react`
- **Animations**: `framer-motion`
- **Toasts**: `goey-toast`
- **Dark mode**: TailwindCSS `dark:` variant with CSS variable color system

Always reuse existing `src/components/ui/*` components before creating new ones. Do not introduce ad hoc button/input/dialog styles.

---

## Custom Agent Skills

Located in `skills/` — PHP implementations callable by AI agents:

| Skill | Purpose |
|---|---|
| `execute_curl` | HTTP requests via PHP curl |
| `generate_auth_token` | Generate auth tokens |
| `execute_sql` | Execute SQL queries |
| `send_email` | Send email via configured SMTP |
| `download_avatars` | Download and store user avatars |

Each skill has a `SKILL.md` documenting its interface.

---

## Docker

Base image: `docker/base/` — PHP 8.4 + Apache + Node.js 22 + pnpm + Composer.
Published to Docker Hub as `eru123/opensys-base:latest`.

Production entry: `docker/entrypoint.sh`
PHP runtime config: `docker/php.ini`

---

## Key Conventions

### PHP

- Strict types: `declare(strict_types=1)` at the top of every file
- Namespace: `Api\Controllers`, `Api\Services`, `Api\Models`
- Controllers stay lean — all branching logic goes to services
- Always validate inputs server-side even when frontend validates
- Use parameterized queries — never concatenate user input into SQL
- Return consistent response shapes: `{ error: bool, message: string, data?: mixed }`
- Protect every endpoint with the appropriate middleware (`$auth` or `$admin`)

### TypeScript/React

- Prefer strict typing; avoid `any` unless unavoidable
- Path alias `@/` for all imports from `src/`
- Lazy-load page components (`React.lazy`) to maintain code-splitting
- Use React Query for all async data; handle loading/error states explicitly
- Use Zod schemas with React Hook Form for form validation
- Tailwind: favor readability; avoid one-off utility explosions; no inline styles

### Git

- Commit messages: imperative, explicit — what changed, why, what risk
- Keep PRs scoped; large refactors need measurable justification
- Branch naming: feature work on `feat` or descriptive branches; never push to `master` directly without review

---

## Anti-Patterns to Avoid

- Fat controllers or services doing too many jobs
- N+1 query patterns — batch or join where needed
- Hidden side effects or mutation-heavy flows
- Divergent endpoint behavior for similar resources
- Bypassing shared UI primitives with ad hoc styles
- Adding new dependencies when the existing stack already solves the problem
- Stale TODOs, orphaned files, dead imports, or magic numbers
- Using `any` in TypeScript without documenting why

---

## Documentation

- `docs/getting-started.md` — Local setup guide
- `docs/api-reference.md` — Full API endpoint docs
- `docs/deployment.md` — Build, env config, migrations, serving
- `docs/caching.md` — KV store / CacheService usage
- `docs/email-service.md` — SMTP, PHPMailer, marketing queue
- `docs/implementation-progress.md` — Intended usage as a starter template
- `AGENTS.md` — Engineering principles and agent workflow guide (read this too)

Update docs whenever behavior, API contracts, or workflows change.

---

## Definition of Done

A task is complete when:

1. Behavior is correct
2. Code is clean and maintainable
3. API contracts are preserved (or explicitly versioned)
4. Relevant checks pass (`pnpm lint`, `pnpm type-check`, `pnpm build`, `phpunit`)
5. Docs are updated where needed
6. Another engineer can understand the change quickly
