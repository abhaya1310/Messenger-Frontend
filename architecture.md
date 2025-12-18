# ConnectNow Command Center — Frontend Architecture

This document describes the current architecture of the **ConnectNow Command Center** frontend located in `Messenger-Frontend/`.

## Goals

- Document how the Next.js frontend is structured (routing, layout, auth).
- Document how the frontend talks to backend services (direct calls + legacy proxies).
- Provide a reference for debugging, onboarding, and deployment.

## High-level Architecture

The frontend is a **Next.js 15** app (App Router) that primarily performs **client-side** data fetching against a backend API.

```text
+------------------------------+              +------------------------------+
|      Browser (User)          |              |            Backend            |
|  Next.js Frontend UI         |   HTTPS/HTTP |  REST APIs (Express, etc.)    |
|  http://localhost:3000/3001  +------------->|  http://localhost:3000        |
|                              |              |                              |
|  - app/* pages               |              |  /api/auth/login              |
|  - components/*              |              |  /api/templates               |
|  - lib/api.ts (API client)   |              |  /api/campaigns, /api/pos/*   |
|  - lib/auth.ts (localStorage)|              |  /conversations, /send-text   |
+--------------+---------------+              +------------------------------+
               |
               | (Optional / Legacy)
               v
+------------------------------+
| Next.js Route Handlers       |
| app/api/*                    |
| Proxy to backend using       |
| BACKEND_URL                  |
+------------------------------+
```

For an exhaustive, code-accurate list of endpoints and call sites, see `BACKEND_INTEGRATIONS.md`.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: Tailwind + shadcn/ui
- **Icons**: lucide-react
- **State**: React state/hooks + localStorage (no global store)

## Repository Structure (Frontend)

```text
Messenger-Frontend/
  app/                    # Next.js app router pages + route handlers
  components/             # reusable components (incl. ui/)
  lib/                    # API client, auth helpers, config, domain logic
  public/                 # static assets
  env.example             # environment variable template
  package.json
```

## Routing Model

Next.js App Router routes are defined by folders under `app/`.

Key pages:

- `/login`
- `/dashboard`
- `/templates`
- `/templates/[templateName]/send`
- `/campaigns`
- `/auto-campaigns`
- `/analytics`
- `/monitor`
- `/settings`
- `/privacy-policy`

## Layout & Auth Gating

### Root Layout

`app/layout.tsx` wraps the app in:

- `AuthProvider` (`components/auth-provider.tsx`)
- `LayoutWrapper` (`components/layout-wrapper.tsx`)

### AuthProvider

`AuthProvider` is the client-side auth state container.

- Loads stored auth on mount using `getStoredAuth()`.
- Exposes `login`, `loginLegacy`, and `logout`.

### LayoutWrapper

`LayoutWrapper` is responsible for:

- Applying shell UI (sidebar/layout)
- Redirecting unauthenticated users to `/login` for protected routes

## Authentication Model

### Login

- UI: `app/login/page.tsx`
- Backend call: `POST ${NEXT_PUBLIC_BACKEND_URL}/api/auth/login`
- Implementation: `lib/auth.ts` (`login()`)
- Session validation: `GET ${NEXT_PUBLIC_BACKEND_URL}/api/auth/me` (called on app boot when a token exists)

### Stored State

`lib/auth.ts` stores auth state in `localStorage`:

- `connectnow_auth` (user + isAuthenticated)
- `connectnow_token` (JWT/opaque token)
- `connectnow_org` ({ orgId, orgName })

### Headers & Authorization

There are two major auth mechanisms used across endpoints:

- **Bearer token**: `Authorization: Bearer <token>`

Tenant scoping:

- For end-user UI requests, the backend should infer `orgId` from the JWT.
- `X-ORG-ID` is treated as legacy/fallback and is only sent when there is no JWT.
- **Temporary backend constraint**: for admin proxy calls under `/api/admin/**`, the frontend currently always forwards `X-ORG-ID` (even when the admin JWT is present), because many admin endpoints still select tenant via the header.

### Admin Portal Auth (role-based)

Admin access is enforced based on the authenticated user's role.

- Admin UI routes: `/admin/*`
- Route guard: `app/admin/layout.tsx` wraps all admin pages in `components/admin/admin-route-guard.tsx`
  - Reads the stored token (`connectnow_token`) and calls `GET /api/auth/me`
  - Requires `user.role === "admin"` to render admin pages
  - Redirects unauthenticated/expired sessions to `/login?reason=session_expired&next=...`

Admin API calls are routed through Next.js route handlers under `app/api/admin/*`.

- The admin UI typically sends `Authorization: Bearer <token>`.
- Admin proxies accept (and forward) either:
  - `Authorization: Bearer <admin_jwt>` (preferred)
  - `X-ADMIN-TOKEN: <admin_token>` (break-glass)
  - or an admin session cookie (`connectnow_admin_session`) minted via `/api/admin/auth/login`
- Proxy auth helper: `lib/admin-proxy-auth.ts` implements this precedence.
- Middleware: `middleware.ts` guards `/api/admin/*` requests and allows Authorization header, `X-ADMIN-TOKEN`, or a valid admin session cookie.

Org selection:

- Selected org is persisted as `selectedOrgId` in localStorage via `lib/selected-org.ts`.


### User Onboarding (Access Code)

The main user onboarding flow is access-code based:

- UI route: `/onboarding`
- Verify: `POST /api/auth/register/verify`
- Complete: `POST /api/auth/register/complete`
- After success, user is redirected to `/login` (no auto-login).

Admin → Invite flow:

- Admin creates org and invites a specific email via `/admin/orgs/new`.
- The invite endpoint returns an `accessCode` that the invited user redeems via `/onboarding`.

## Backend Communication

### Primary pattern: Direct backend calls

The canonical backend base URL is:

- `lib/config.ts` → `config.apiUrl`
- Derived from `NEXT_PUBLIC_BACKEND_URL` (defaults to `http://localhost:3000`)

The primary API module is `lib/api.ts`:

- `fetchWithErrorHandling()` wraps `fetch()` with improved errors (incl. CORS hints).
- Many functions assert they are called client-side (`typeof window !== 'undefined'`).

Examples:

- Templates: `fetchTemplates()`, `analyzeTemplate()`, `analyzeCsv()`, `sendTemplateDynamic()`
- Monitor: `fetchConversations()`, `fetchConversationMessages()`, `updateConversationMetadata()`, `sendTextMessage()`
- POS/Campaign: `apiClient()` injects `Authorization` when available, and uses `X-ORG-ID` only as a fallback when no token exists

### Legacy pattern: Next.js proxy route handlers (`app/api/*`)

This repo still contains route handlers that proxy backend requests and they are actively used for:

- `/api/admin/*` (admin portal)
- `/api/campaign-runs/*` (campaign runs UI)
- Multipart endpoints like `/api/media/upload` and `/api/campaign-runs/:id/audience/csv`

- Templates proxies use:
  - `BACKEND_URL || NEXT_PUBLIC_BACKEND_URL || http://localhost:3000`
  - `ADMIN_TOKEN` (server-side) for protected calls
- Feedback proxies use:
  - `NEXT_PUBLIC_API_URL || http://localhost:3002`
  - `ADMIN_TOKEN` (server-side)

Current proxy routes:

- `app/api/templates/route.ts`
- `app/api/templates/analyze/route.ts`
- `app/api/csv/analyze/route.ts`
- `app/api/analytics/route.ts`
- `app/api/analytics/export/route.ts`
- `app/api/feedback/send/route.ts`
- `app/api/feedback/preview/route.ts`

Admin proxy routes:

- `app/api/admin/orgs/route.ts`
- `app/api/admin/org/[orgId]/route.ts`
- `app/api/admin/org/[orgId]/user/route.ts`
- `app/api/admin/org/[orgId]/whatsapp/update-phone-number-id/route.ts`
- `app/api/admin/org/[orgId]/whatsapp/configure-shared/route.ts`
- `app/api/admin/org/[orgId]/whatsapp/configure-dedicated/route.ts`
- `app/api/admin/org/[orgId]/whatsapp/status/route.ts`
- `app/api/admin/whatsapp/orgs/route.ts`

The repo includes `app/api/README.md` marking these as deprecated; treat that file as outdated.

## Key Feature Flows

### 1) Login

```text
/login -> lib/auth.login() -> POST /api/auth/login
     -> storeAuthData() in localStorage
     -> user is redirected to authenticated routes
```

### 2) Templates Browse

- Page: `app/templates/page.tsx`
- Data: `lib/api.fetchTemplates()` (direct backend call)
- Local caching: `lib/template-cache` (in-memory/local cache used to reduce calls)

### 3) Template Bulk Send

- Route: `/templates/[templateName]/send`
- Major steps:
  - Upload CSV
  - Backend analysis (`/api/csv/analyze`) to detect columns and suggestions
  - Column mapping UI
  - Send messages in batches via `/api/send-template-dynamic`

### 4) Campaigns

- Route: `/campaigns`
- Uses `lib/api.ts` campaign functions (via `apiClient()`)
- Uses org + token headers when available

Credits gating:

- Campaign run scheduling is protected by a server-authoritative credits system.
- The Campaign Runs UI performs a credits precheck before attempting to schedule.
- A run can transition to `waiting_for_credits` if it has been queued but cannot proceed until credits are available.

### 5) Auto Campaign Configuration

- Route: `/auto-campaigns`
- Uses `/api/campaign-config*` endpoints via `apiClient()`

### 6) Monitor (Conversation Inbox)

- Route: `/monitor`
- Uses:
  - `GET /conversations`
  - `GET /conversations/:phone/messages`
  - `PATCH /conversations/:phone/metadata`
  - `POST /send-text`
- Behavior:
  - Polling to refresh conversations/messages
  - Responsive UI (inbox + thread + metadata panel)

### 7) Analytics

- Route: `/analytics`
- Uses:
  - `GET /api/analytics`
  - `GET /api/analytics/export` (CSV download)
  - Multitenant endpoints (e.g. `/analytics/summary`) with `X-ORG-ID`

### 8) Settings

- Route: `/settings`
- Updates org configuration and service toggles using `apiClient()`.

### 9) Credits

User UI:

- Route: `/dashboard`
- Displays live WhatsApp credits (utility + marketing) via the Next.js proxy route `GET /api/credits/me`.

Campaign Runs UI:

- Route: `/campaigns` (Campaign Runs list/dialog)
- Before scheduling a run, the UI calls `GET /api/campaign-runs/[id]/credits/precheck`.
- If precheck indicates insufficient credits, scheduling is blocked client-side.
- If backend still returns `409` with `code=INSUFFICIENT_CREDITS`, the UI surfaces the returned details.

Admin UI:

- Org list: `/admin/orgs`
  - Source of truth: `GET /api/admin/whatsapp/orgs` (includes WhatsApp config + credits summary).
- Org credits: `/admin/orgs/[orgId]/credits`
  - Balances: `GET /api/admin/org/[orgId]/credits`
  - Refill: `POST /api/admin/org/[orgId]/credits/refill`
  - Ledger: `GET /api/admin/org/[orgId]/credits/ledger`

Proxy routes involved:

- `GET /api/credits/me`
- `GET /api/campaign-runs/[id]/credits/precheck`
- `GET /api/admin/whatsapp/orgs`
- `GET /api/admin/org/[orgId]/credits`
- `POST /api/admin/org/[orgId]/credits/refill`
- `GET /api/admin/org/[orgId]/credits/ledger`

## State Management

- **Local component state**: `useState`, `useEffect`
- **Auth state**: `AuthProvider` + `localStorage`
- **Caching**:
  - Templates page uses a dedicated cache helper (`lib/template-cache`).

There is currently no centralized state library (Redux/Zustand/etc.).

## Error Handling & Observability

- `lib/api.ts`:
  - Throws enriched errors for non-2xx responses
  - Adds actionable CORS diagnostics when `Failed to fetch` occurs
- Many pages log key actions to the console for debugging.

## Environment Variables

Client-exposed:

- `NEXT_PUBLIC_BACKEND_URL` (required for correct deployments)
- `NEXT_PUBLIC_DEFAULT_ORG_ID` (optional)
- `NEXT_PUBLIC_API_URL` (legacy; used by feedback proxy route handlers)

Server-only (used by Next.js route handlers under `app/api/*`):

- `BACKEND_URL`

Server-only (legacy; only used if you rely on admin session cookies instead of passing `Authorization`):

- `ADMIN_SESSION_SECRET`
- `ADMIN_PORTAL_USERNAME` (optional)
- `ADMIN_PORTAL_PASSWORD` (optional)

## Local Development Notes

- Next.js defaults to port `3000`.
- If backend uses `3000`, run frontend on a different port:
  - `npm run dev -- -p 3001`

CORS:

- When frontend and backend run on different origins, backend must allow the frontend origin.

## Deployment Notes

- Configure `NEXT_PUBLIC_BACKEND_URL` in the hosting platform.
- If you still rely on Next.js proxy routes (`app/api/*`), also configure `BACKEND_URL` and `ADMIN_TOKEN`.

## Known Gaps / Footguns

- `app/templates/page.tsx` calls `POST /api/templates/cache/clear`, but there is **no** corresponding route handler found under `app/api/templates/cache/clear`.
  - If this endpoint is required, it needs to be implemented in `app/api/templates/cache/clear/route.ts` or updated to call the backend directly.

---

If you want, I can also add a small diagram per feature (Templates, Monitor, Campaigns) with request/response shapes and the exact headers each flow uses.
