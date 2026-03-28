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
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted by the app, but the local CLI output typically gives you the publishable key directly.

5. Start the app:

```bash
pnpm dev
```

## Local Seller Auth Setup

The seller area expects a Supabase Auth user with a `store_id` in `app_metadata` or `user_metadata`.

Create or update a local seller user with:

```bash
pnpm local:seller -- --email deva@salesense.local --store-id demo-store --name "Dev A"
```

If you omit flags, the script uses these defaults:

- email: `manager@salesense.local`
- store id: `demo-store`
- name: `Local Store Manager`

What the script does:

- creates the user if it does not exist
- updates the user if it already exists
- sets:
  - `app_metadata.role = "manager"`
  - `app_metadata.store_id = <store id>`
  - `user_metadata.name = <name>`
  - `user_metadata.store_id = <store id>`

After creating the user:

1. Open the app at `/seller/sign-in`
2. Request a magic link for that email
3. Open local Mailpit at `http://127.0.0.1:54324`
4. Click the sign-in link from the email

## Useful Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
pnpm local:seller -- --email manager@salesense.local --store-id demo-store
```

## Current Routes

- `/` boot page
- `/seller` protected seller surface
- `/seller/sign-in` seller auth entrypoint
- `/kiosk` customer route scaffold
- `/api/v1/health` health check

## Notes

- Local seller sign-in uses magic links, not passwords.
- Local auth emails are captured by Mailpit, not sent to a real inbox.
- The current auth layer is ready for local development, but the product, lead, and device APIs are still the next Dev A milestone.
