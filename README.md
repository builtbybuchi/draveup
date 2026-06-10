# DraveUp Deployment Guide

This guide helps you:

- continue local development in this monorepo
- deploy the API server on Leapcell
- deploy the frontend on Vercel
- connect Clerk and webhooks for production

## 1) Project layout (important for deployments)

This is a pnpm workspace monorepo.

- API app package: `artifacts/api-server`
- Frontend app package: `artifacts/drave-registry`
- Shared packages consumed by apps live in `lib/*`

Because of workspace dependencies, deploy from the repository root and use pnpm filter commands.

## 2) Prerequisites

- Node.js 24+
- pnpm (same major version used by the lockfile)
- A PostgreSQL database
- A Clerk account (if auth is enabled in production)
- Leapcell account (API hosting)
- Vercel account (frontend hosting)

## 3) Local development workflow

From repository root:

```bash
pnpm install
```

### 3.1 API local env

Create `artifacts/api-server/.env` with at least:

```env
PORT=8080
NODE_ENV=development
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
CLERK_SECRET_KEY=sk_live_or_test_optional_for_local
CLERK_WEBHOOK_SECRET=whsec_optional_for_local
LOG_LEVEL=info
PAYSTACK_SECRET_KEY=sk_test_or_live_xxx
```

Notes:

- `DATABASE_URL` is required at runtime.
- `DIRECT_URL` is needed for Prisma migration/push workflows.

Run API:

```bash
pnpm --filter @workspace/api-server run dev
```

Health endpoint:

- `GET /api/healthz`

### 3.2 Frontend local env

In `artifacts/drave-registry/.env`:

```env
PORT=3009
BASE_PATH=/
VITE_CLERK_PUBLISHABLE_KEY=pk_test_or_live_xxx
VITE_CLERK_PROXY_URL=
VITE_PAYSTACK_PUBLIC_KEY=pk_test_or_live_xxx
```

Run frontend:

```bash
pnpm --filter @workspace/drave-registry run dev
```

## 4) Deploy API on Leapcell

Create a new web service connected to this repository.

Use these settings:

- Runtime: Node.js 24
- Root directory: repository root
- Install command: `corepack enable && corepack prepare pnpm@10.8.1 --activate && pnpm install --frozen-lockfile`
- Build command: `corepack enable && corepack prepare pnpm@10.8.1 --activate && pnpm --filter @workspace/api-server run build`
- Start command: `corepack enable && corepack prepare pnpm@10.8.1 --activate && pnpm --filter @workspace/api-server run start`

Why this is required: Leapcell Node images may not ship with `pnpm` preinstalled.
The API start script now uses `--env-file-if-exists=.env`, so deployment works even when `.env` is not present in the container.

### 4.1 Leapcell environment variables

Set these in Leapcell service env config:

- `NODE_ENV=production`
- `DATABASE_URL=<required>`
- `DIRECT_URL=<recommended for migrations/maintenance>`
- `CLERK_SECRET_KEY=<required if using Clerk proxy in production>`
- `CLERK_WEBHOOK_SECRET=<required if using Clerk webhooks>`
- `PAYSTACK_SECRET_KEY=<required for processing payments>`
- `LOG_LEVEL=info`

About `PORT`:

- Most PaaS providers inject `PORT` automatically.
- This API requires `PORT`. If Leapcell does not inject it in your plan/runtime, set it manually (for example `PORT=8080`).

### 4.2 Verify backend deployment

After deploy, open:

- `https://<your-api-domain>/api/healthz`

Expected response includes:

```json
{ "status": "ok" }
```

### 4.3 Database schema sync/migrations

If schema changes are pending, run sync from a trusted environment (local CI/CD runner):

```bash
pnpm --filter @workspace/api-server run db:sync
```

If your workflow requires force sync:

```bash
pnpm --filter @workspace/api-server run db:sync:force
```

## 5) Deploy frontend on Vercel

Create a new Vercel project from the same repository.

Use these build settings:

- Framework preset: Vite (or Other, both are fine)
- Root directory: repository root
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm --filter @workspace/drave-registry run build`
- Output directory: `artifacts/drave-registry/dist/public`

Add a `vercel.json` at the repository root with an SPA rewrite so deep links like `/domains` or `/dashboard/profile` resolve to the frontend app instead of a Vercel 404.

### 5.1 Vercel environment variables

Set in Vercel (Production + Preview as needed):

- `VITE_CLERK_PUBLISHABLE_KEY=<required>`
- `VITE_CLERK_PROXY_URL=https://<your-api-domain>/api/__clerk` (recommended in production)
- `VITE_PAYSTACK_PUBLIC_KEY=<required for Paystack Inline>`
- `BASE_PATH=/` (optional unless you deploy under a subpath)

Notes:

- `PORT` is not required for Vercel static hosting.
- `BASE_PATH` defaults to `/` in your current Vite config.

## 6) Connect Clerk to production domains

In Clerk dashboard:

1. Add your frontend production domain (Vercel) in allowed origins/redirect configuration.
2. If using proxy mode, ensure frontend uses:
   - `VITE_CLERK_PROXY_URL=https://<your-api-domain>/api/__clerk`
3. Configure webhook endpoint:
   - `https://<your-api-domain>/api/webhooks/clerk`
4. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Copy webhook signing secret into API env as `CLERK_WEBHOOK_SECRET`.

## 7) Recommended production hardening

- Restrict CORS to your Vercel domains instead of wildcard reflection.
- Keep Clerk secrets only on API host, never in frontend env.
- Add uptime monitor for `/api/healthz`.
- Pin Node.js versions in both platforms.

## 8) Quick command reference

From repository root:

```bash
# install dependencies
pnpm install

# local api
pnpm --filter @workspace/api-server run dev

# local frontend
pnpm --filter @workspace/drave-registry run dev

# typecheck all
pnpm run typecheck

# build all
pnpm run build

# deploy to Cloudflare Workers
APPWRITE_SETUP_COMMAND="pnpm run <your-appwrite-setup-command>" pnpm run deploy:cloudflare:stg
APPWRITE_SETUP_COMMAND="pnpm run <your-appwrite-setup-command>" pnpm run deploy:cloudflare:prd
```

# drave-registry

https://res.cloudinary.com/dlvffw5wt/image/upload/v1779930051/Secondary_Logo-removebg-preview_nytiyb.png

https://res.cloudinary.com/dlvffw5wt/image/upload/v1779929969/Primary_Horizontal_Logo-removebg-preview_my48zk.png

https://res.cloudinary.com/dlvffw5wt/image/upload/v1779929859/copy_of_secondary_logo__2_-removebg-preview_wd7nt6.png
