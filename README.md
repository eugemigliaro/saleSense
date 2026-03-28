# SaleSense

SaleSense is a Next.js webapp for an in-store virtual salesperson experience. The current codebase is structured so three developers can work in parallel:

- Dev A: platform, auth, shared types, APIs, and integrations
- Dev B: seller surface
- Dev C: customer kiosk surface

Product scope and milestones live in [prd.md](./prd.md). Engineering conventions live in [AGENTS.md](./AGENTS.md).

## Prerequisites

- Node.js 20+
- `pnpm`
- Docker

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Start the local Supabase stack:

```bash
pnpm supabase:start
```

The first run is slow because Docker has to pull the full Supabase image set.

3. Print the local Supabase credentials:

```bash
pnpm supabase:status
```

4. Create `.env.local` from [.env.example](./.env.example) and fill it with:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=PASTE_FROM_SUPABASE_STATUS
SUPABASE_SERVICE_ROLE_KEY=PASTE_FROM_SUPABASE_STATUS
GEMINI_API_KEY=YOUR_GEMINI_KEY
GEMINI_MODEL=gemini-3-flash-preview
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted by the app, but the local CLI output typically gives you the publishable key directly.
If `GEMINI_MODEL` is omitted, the server defaults to `gemini-3-flash-preview`.

5. Start the app:

```bash
pnpm dev
```

## Local Seller Auth Setup

The seller area expects a Supabase Auth user with:

- an email and password
- a `store_id` in `app_metadata` or `user_metadata`

Create or update a local seller user with:

```bash
pnpm local:seller --email deva@salesense.local --store-id demo-store --name "Dev A" --password "dev-a-local-123"
```

Reset the local store catalog back to the seeded demo products with:

```bash
pnpm local:seller --store-id demo-store --reset-store
```

If you omit flags, the script uses these defaults:

- email: `manager@salesense.local`
- store id: `demo-store`
- name: `Local Store Manager`
- password: `salesense-local-123`

What the script does:

- creates the user if it does not exist
- updates the user if it already exists
- sets or resets the password
- optionally clears all products for the store when you pass `--reset-store`
- sets:
  - `app_metadata.role = "manager"`
  - `app_metadata.store_id = <store id>`
  - `user_metadata.name = <name>`
  - `user_metadata.store_id = <store id>`
- seeds a demo catalog with:
  - `iPhone 16 Pro Max`
  - `Galaxy S25 Ultra`
  - `Pixel 9 Pro`

After creating the user:

1. Open the app at `/seller/sign-in`
2. Sign in with that email and password

## Useful Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
pnpm local:seller --email manager@salesense.local --store-id demo-store --password "salesense-local-123"
pnpm local:seller --store-id demo-store --reset-store
```

## Current Routes

- `/` boot page
- `/seller` protected seller workspace with real product CRUD, kiosk launch, and lead refresh
- `/seller/sign-in` seller auth entrypoint
- `/kiosk` customer kiosk preview
- `/kiosk?session=<device-session-id>` live kiosk route backed by the Milestone 1 APIs
- `/api/v1/health` health check

## Notes

- Local seller sign-in uses email/password.
- `pnpm local:seller` is intended for local development only.
- The kiosk uses the live Gemini-backed chat flow when opened with a valid `deviceSessionId`.
- The lead form now posts to `/api/v1/leads` for live sessions and falls back to a local-only thank-you flow in preview mode.
