# AGENTS.md

## Purpose

This file is the implementation contract for AI coding agents working on SaleSense.

Use it to make consistent technical decisions across the repo. Treat it as the default engineering standard unless the user gives a more specific instruction.

This file is intentionally code-focused. Product scope and milestone intent live in [prd.md](/home/eugemigliaro/Documents/hackathon/saleSense/prd.md).

## Source Of Truth

When working in this repo, follow this priority order:

1. Direct user instructions.
2. `prd.md` for product scope, milestones, and user behavior.
3. `AGENTS.md` for implementation rules and engineering conventions.
4. Existing code patterns already established in the repo.

If `prd.md` and a requested implementation conflict, ask for clarification instead of guessing.

## Product Guardrails

Build for the current PRD milestone, not the imagined future platform.

- Do not pull future-milestone features into earlier work unless the user explicitly asks for it.
- Milestone 1 is typed chat plus tap-to-wake.
- Milestone 2 adds voice-first interaction with typed fallback.
- Milestone 3 adds client-side face detection and passive wake-up.
- Checkout, open-web browsing, and multi-store administration are out of scope unless explicitly requested.

Although implementation should seek to not satisfy future needs, keep in mind current and future milestones to make flexible code.

## Tech Baseline

Unless the repo or user says otherwise, use these defaults:

- Framework: Next.js App Router
- Language: TypeScript
- Package manager: `pnpm`
- Styling: Tailwind CSS
- Component baseline: shadcn/ui for reusable primitives
- Deployment target: Vercel
- Database and auth: Supabase
- LLM provider: Gemini, called from server-side code only

## Architecture Defaults

### App Structure

Converge on this structure once the app is scaffolded:

```text
src/
  app/
    api/
      v1/
    (seller)/
    (customer)/
  components/
    ui/
  lib/
  hooks/
  types/
```

Use route groups or equivalent separation so seller/admin surfaces and customer kiosk surfaces do not bleed into each other.

### Domain Language

Use the same domain names across UI, API, database, and docs:

- `StoreManager`
- `Product`
- `DeviceSession`
- `Lead`

Avoid inventing alternate names for the same concept without a strong reason.

## Frontend Standards

### React And Next.js

- Prefer Server Components by default.
- Use Client Components only for browser-only behavior such as forms with local interactivity, media playback, camera access, microphone access, typed chat input state, and future voice or face-detection features.
- Keep data fetching close to the server boundary when possible.
- Do not expose secrets or Gemini API keys to the client.
- Use small, focused components with clear prop interfaces.
- Prefer composition over large monolithic components.

### State Management

- Start with local component state.
- Lift state only when multiple sibling components genuinely need the same source of truth.
- Use context sparingly and only for truly shared UI/session state.
- Do not introduce a global state library unless the repo complexity clearly justifies it.

### Seller UI

The seller surface is an operational tool.

- Optimize for speed, clarity, and dense utility.
- Use plain layouts before adding cards.
- Prefer explicit labels, forms, tables, lists, and status text over decorative UI.
- Keep product CRUD and lead review straightforward and skimmable.

### Customer UI

The customer surface is a kiosk experience.

- The first viewport should feel deliberate and product-led.
- Default to bold typography, strong hierarchy, and a clear primary action.
- Avoid generic dashboard-card layouts, boxed heroes, and visual clutter.
- Keep copy short.
- Make tap targets large and obvious.
- Motion should support hierarchy or atmosphere, not decoration.

### Accessibility

- All interactive elements must be keyboard reachable.
- Use semantic elements before custom div-based controls.
- Preserve visible focus states.
- Ensure text contrast is strong enough over media backgrounds.
- Typed chat must remain available when voice is present.

## API Standards

### Route Design

- Use `app/api/v1/...` for route handlers.
- Resource names must be plural, lowercase, and kebab-case.
- Use nouns in URLs, not verbs, except for true non-CRUD actions.

Examples:

- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `POST /api/v1/products`
- `PATCH /api/v1/products/:id`
- `GET /api/v1/leads`

### Response Contract

Use a consistent envelope.

Success:

```json
{
  "data": {}
}
```

Failure:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed"
  }
}
```

### Status Codes

Use semantic HTTP status codes.

- `200` for successful reads and updates with a response body
- `201` for successful creates
- `204` for successful deletes without a response body
- `400` for malformed requests
- `401` for missing or invalid auth
- `403` for forbidden access
- `404` for missing resources
- `409` for state conflicts
- `422` for validation failures
- `500` only for unexpected server failures

Never return `200` with a failure payload.

### Validation

- Validate request bodies, params, and query strings at the route boundary.
- Use Zod for input validation.
- Return structured validation errors.
- Keep parsing and validation separate from business logic when the handler grows.

## Data And Auth Standards

- Use Supabase Auth for seller authentication.
- Protect seller APIs and seller routes by default.
- Scope data by store whenever the product model requires it.
- Select only the columns needed for the current use case.
- Do not use `select('*')` unless there is a clear reason.
- Keep database access behind small helpers or server-side modules when logic becomes non-trivial.

## AI And Integration Standards

### Gemini

- Gemini calls must stay server-side.
- Prompts must be grounded in store-managed product data, not vague assumptions.
- The active product markdown is the primary context for the current session.
- Other product snippets are comparison context only.
- Do not add open-web browsing without explicit product direction.

### Voice

- Voice is Milestone 2 work, not Milestone 1.
- Keep typed input available as a fallback even after voice ships.
- If voice is unstable, degrade gracefully to text rather than blocking the flow.

### Camera And Face Detection

- Do not add attention detection before Milestone 3 unless explicitly asked.
- Face detection must run client-side.
- Camera frames must not be uploaded or persisted.
- Prefer serving face-detection runtime and model assets from the app origin when possible.
- If a third-party CDN is used for static asset delivery, it is acceptable only for downloading runtime assets, never for remote frame inference.

## Environment Variable Rules

- Keep secrets in server-only environment variables.
- Only values intentionally meant for the browser may use the `NEXT_PUBLIC_` prefix.
- Never hardcode secrets, tokens, or service-role keys.
- Prefer Vercel project environment variables for deployed environments.
- Keep local-only values in `.env.local` and out of git.

## Coding Standards

- Favor simple, explicit, readable TypeScript.
- Use descriptive names for variables, functions, and components.
- Avoid `any`. If unavoidable, isolate it behind a typed adapter or parser.
- Prefer immutable updates with spreads or pure transforms.
- Split long functions and deeply nested logic into smaller helpers.
- Reuse utilities and hooks instead of copy-pasting logic.
- Comment only to explain why a decision exists, not what obvious code is doing.

## File And Naming Conventions

- React components: PascalCase file names
- Hooks: `useX.ts` or `useX.tsx`
- Utilities: camelCase file names
- Shared types: keep near the domain or under `src/types`
- API resources and route paths: kebab-case

Use consistent names across database records, TypeScript types, and API payloads.

## Testing And Verification

Hackathon quality bar:

- Run lint, typecheck, and build before considering work done.
- Add focused tests for critical API handlers, validation, and non-trivial business logic.
- Manually verify the main user path for the current milestone.
- For UI work, verify desktop and mobile layouts.
- For kiosk-facing work, verify the idle-to-engaged transition and reset behavior.

Prefer a small number of high-signal tests over broad low-value test scaffolding.

## Definition Of Done

A task is not done until:

- The implementation matches the current PRD milestone.
- Types, API shapes, and naming are consistent.
- Secrets remain server-side.
- Errors and empty states are handled.
- The relevant verification has been run.
- Any product-scope change is reflected in `prd.md` or explicitly called out.

## Agent Behavior In This Repo

- Read `prd.md` before implementing product behavior.
- Do not invent extra platform features because they seem useful.
- When multiple solutions are possible, choose the one that minimizes complexity and preserves future extension.
- Preserve existing patterns once the repo establishes them.
- If a change affects public behavior, keep the API and UI contract explicit and consistent.
