# Frontend ↔ Backend Integrations (Exhaustive)

This document lists **all current frontend integrations with the backend** in this repository.

It is intentionally **code-accurate**:
- **Client → Backend (direct)** calls are implemented in `lib/auth.ts` and `lib/api.ts` and use `NEXT_PUBLIC_BACKEND_URL` (`config.apiUrl`).
- **Client → Next.js API route → Backend (proxy)** calls are implemented under `app/api/**` and forward requests to the backend (useful for multipart/form-data, admin session cookies, or avoiding CORS).

---

## 1) Environment & Base URL

- **Backend base URL (client-side direct calls):** `NEXT_PUBLIC_BACKEND_URL` (via `lib/config.ts` → `config.apiUrl`)
- **Backend base URL (server-side proxy routes):** `BACKEND_URL` (preferred) or `NEXT_PUBLIC_BACKEND_URL` fallback.

---

## 2) Authentication + Required Headers

### 2.1 User authentication (JWT)

**Storage / retrieval (browser):** `lib/auth.ts`
- Token stored in localStorage key: `connectnow_token`
- Org stored in localStorage key: `connectnow_org`

**Headers used by client API helpers (`lib/api.ts`):**
- If token exists: `Authorization: Bearer <token>`
- Else (legacy fallback): `X-ORG-ID: <orgId>`

### 2.2 Admin authentication (JWT, X-ADMIN-TOKEN fallback, cookie)

**Middleware guard:** `middleware.ts`
- Applies to: `/api/admin/:path*`
- Allows request if one of these is present:
  - `Authorization` header
  - `X-ADMIN-TOKEN` header
  - Valid encrypted admin session cookie (`connectnow_admin_session`)

**Admin proxy auth helper:** `lib/admin-proxy-auth.ts`
- `getAdminAuthHeaders(request)` precedence:
  1. Forward incoming `Authorization` header
  2. Else forward incoming `X-ADMIN-TOKEN` header
  3. Else verify admin session cookie and inject `Authorization: Bearer <accessToken>`

**Admin session cookie:** `connectnow_admin_session` (created by `/api/admin/auth/login`).

---

## 3) Next.js API Proxy Routes (`app/api/**`) → Backend

> These are server-side routes in the frontend app that forward requests to the backend.

### 3.1 Admin auth (session cookie)

**File:** `app/api/admin/auth/login/route.ts`
- **Frontend route:** `POST /api/admin/auth/login`
- **Backend route:** `POST /api/auth/login`
- **Purpose:** Authenticate admin user and mint admin session cookie.
- **Auth to backend:** none (credential login)
- **Cookie set:** `connectnow_admin_session`

**File:** `app/api/admin/auth/logout/route.ts`
- **Frontend route:** `POST /api/admin/auth/logout`
- **Backend route:** none
- **Purpose:** Clear admin session cookie.

### 3.2 Admin Org management

**File:** `app/api/admin/orgs/route.ts`
- **Frontend route:** `POST /api/admin/orgs`
- **Backend route:** `POST /api/admin/orgs`
- **Headers forwarded:**
  - `Content-Type: application/json`
  - `X-ORG-ID: <orgId from request body>`
  - Admin auth headers (`Authorization` or `X-ADMIN-TOKEN`)

**File:** `app/api/admin/org/[orgId]/route.ts`
- **Frontend route:** `GET /api/admin/org/:orgId`
- **Backend route:** `GET /api/admin/org/:orgId`
- **Headers forwarded:**
  - `Content-Type: application/json`
  - `X-ORG-ID: :orgId`
  - Admin auth headers

**File:** `app/api/admin/org/[orgId]/user/route.ts`
- **Frontend route:** `POST /api/admin/org/:orgId/user`
- **Backend route:** `POST /api/admin/org/:orgId/user`
- **Headers forwarded:** `Content-Type`, `X-ORG-ID`, admin auth

### 3.3 Admin WhatsApp configuration

All routes below follow the same pattern:
- **Auth:** admin (via `getAdminAuthHeaders`)
- **Headers:** `Content-Type: application/json`, `X-ORG-ID: :orgId`, admin auth

**Files / Routes:**
- `POST /api/admin/org/:orgId/whatsapp/configure-dedicated` → `POST /api/admin/org/:orgId/whatsapp/configure-dedicated`
- `POST /api/admin/org/:orgId/whatsapp/configure-shared` → `POST /api/admin/org/:orgId/whatsapp/configure-shared`
- `POST /api/admin/org/:orgId/whatsapp/disable` → `POST /api/admin/org/:orgId/whatsapp/disable`
- `POST /api/admin/org/:orgId/whatsapp/process-queue` → `POST /api/admin/org/:orgId/whatsapp/process-queue`
- `GET /api/admin/org/:orgId/whatsapp/status` → `GET /api/admin/org/:orgId/whatsapp/status`
- `POST /api/admin/org/:orgId/whatsapp/update-phone-number-id` → `POST /api/admin/org/:orgId/whatsapp/update-phone-number-id`
- `POST /api/admin/org/:orgId/whatsapp/update-tier` → `POST /api/admin/org/:orgId/whatsapp/update-tier`
- `POST /api/admin/org/:orgId/whatsapp/update-token` → `POST /api/admin/org/:orgId/whatsapp/update-token`
- `POST /api/admin/org/:orgId/whatsapp/verify` → `POST /api/admin/org/:orgId/whatsapp/verify`

### 3.4 Admin Campaign Catalog: Campaign Definitions (no org header)

> Important: Campaign Definitions are **global** and do **not** forward `X-ORG-ID`.

**File:** `app/api/admin/campaign-definitions/route.ts`
- `GET /api/admin/campaign-definitions` → `GET /api/admin/campaign-definitions`
- `POST /api/admin/campaign-definitions` → `POST /api/admin/campaign-definitions`
- **Headers:** `Content-Type: application/json`, admin auth

**File:** `app/api/admin/campaign-definitions/[id]/route.ts`
- `GET /api/admin/campaign-definitions/:id` → `GET /api/admin/campaign-definitions/:id`
- `PATCH /api/admin/campaign-definitions/:id` → `PATCH /api/admin/campaign-definitions/:id`
- `DELETE /api/admin/campaign-definitions/:id` → `DELETE /api/admin/campaign-definitions/:id`

**File:** `app/api/admin/campaign-definitions/[id]/publish/route.ts`
- `POST /api/admin/campaign-definitions/:id/publish` → `POST /api/admin/campaign-definitions/:id/publish`

**File:** `app/api/admin/campaign-definitions/[id]/archive/route.ts`
- `POST /api/admin/campaign-definitions/:id/archive` → `POST /api/admin/campaign-definitions/:id/archive`

### 3.5 User Campaign Runs (JWT required)

> These routes proxy **user-authenticated** campaign runs endpoints.
> They forward **only** the incoming `Authorization` header and return 401 if missing.

**File:** `app/api/campaign-runs/route.ts`
- `GET /api/campaign-runs` → `GET /api/campaign-runs`
- `POST /api/campaign-runs` → `POST /api/campaign-runs`

**File:** `app/api/campaign-runs/capabilities/route.ts`
- `GET /api/campaign-runs/capabilities` → `GET /api/campaign-runs/capabilities`

**File:** `app/api/campaign-runs/definitions/route.ts`
- `GET /api/campaign-runs/definitions` → `GET /api/campaign-runs/definitions`

**File:** `app/api/campaign-runs/[id]/route.ts`
- `GET /api/campaign-runs/:id` → `GET /api/campaign-runs/:id`
- `PATCH /api/campaign-runs/:id` → `PATCH /api/campaign-runs/:id`
- `DELETE /api/campaign-runs/:id` → `DELETE /api/campaign-runs/:id`

**File:** `app/api/campaign-runs/[id]/schedule/route.ts`
- `POST /api/campaign-runs/:id/schedule` → `POST /api/campaign-runs/:id/schedule`

**File:** `app/api/campaign-runs/[id]/cancel/route.ts`
- `POST /api/campaign-runs/:id/cancel` → `POST /api/campaign-runs/:id/cancel`

**File:** `app/api/campaign-runs/[id]/audience/csv/route.ts`
- `POST /api/campaign-runs/:id/audience/csv` → `POST /api/campaign-runs/:id/audience/csv`
- **Content-Type:** multipart/form-data
- **Field required:** `file`

### 3.6 Templates / CSV / Analytics / Feedback (legacy proxy routes)

These proxy routes exist under `app/api/**`:
- `GET /api/templates` → `GET /api/templates`
- `POST /api/templates/analyze` → `POST /api/templates/analyze`
- `POST /api/csv/analyze` → `POST /api/csv/analyze`
- `GET /api/analytics` → `GET /api/analytics`
- `GET /api/analytics/export` → `GET /api/analytics/export`
- `POST /api/feedback/send` → backend configured via `NEXT_PUBLIC_API_URL` (see file)
- `POST /api/feedback/preview` → backend configured via `NEXT_PUBLIC_API_URL` (see file)

**Note:** The repository also performs **direct calls** for most of these via `lib/api.ts`.

### 3.7 Admin utilities

**Templates cache clear**
- **File:** `app/api/templates/cache/clear/route.ts`
- `POST /api/templates/cache/clear` → `POST /api/templates/cache/clear`
- **Auth:** admin

**Media upload**
- **File:** `app/api/media/upload/route.ts`
- `POST /api/media/upload` → `POST /api/media/upload`
- **Auth:** admin
- **Body:** multipart/form-data forwarded as-is

---

## 4) Direct Client → Backend Integrations (`lib/*`)

### 4.1 `lib/auth.ts`

All calls are made to `${config.apiUrl}`.

- `POST /api/auth/login`
  - Used by: Login UI (e.g. `app/login/login-client.tsx`)
  - Body: `{ email, password }` OR `{ username, password }`

- `POST /api/auth/register/verify`
  - Function: `verifyRegistrationAccessCode(accessCode)`

- `POST /api/auth/register/complete`
  - Function: `completeRegistrationAccessCode({ accessCode, password, username? })`

- `GET /api/auth/me`
  - Functions: `validateSessionWithMeEndpoint(token)`, `fetchMe(token)`
  - Header: `Authorization: Bearer <token>`

### 4.2 `lib/api.ts` (core application APIs)

**Base:** `${API_BASE}` where `API_BASE = config.apiUrl`.

#### Templates
- `GET /api/templates` (via `fetchTemplates(limit?)`)
- `POST /api/templates/analyze` (via `analyzeTemplate(templateName)`)
- `POST /api/send-template-dynamic` (via `sendTemplateDynamic(...)`)

#### CSV
- `POST /api/csv/analyze` (via `analyzeCsv(file, templateName?)`)

#### Analytics
- `GET /api/analytics` (via `fetchAnalytics(params?)`)
- `GET /api/analytics/export` (via `exportAnalytics()`)

Newer analytics APIs:
- `GET /api/analytics/overview`
- `GET /api/analytics/campaigns`
- `GET /api/analytics/auto-campaigns`
- `GET /api/analytics/templates`
- `GET /api/analytics/templates/:templateName`
- `GET /api/analytics/segments`

Also used (non `/api/*`):
- `GET /analytics/templates`
- `GET /analytics/summary`
- `GET /analytics/template/:name/series`
- `GET /analytics/template/:name/variables`
- `GET /analytics/template/:name/variables/:variable/top`

#### POS
- `GET /api/pos/customers`
- `GET /api/pos/customers/:customerId`
- `GET /api/pos/customers/:customerId/transactions`
- `GET /api/pos/sync/status`

#### Campaigns (legacy one-time campaign APIs)
- `GET /api/campaigns`
- `GET /api/campaigns/:campaignId`
- `POST /api/campaigns`
- `PATCH /api/campaigns/:campaignId`
- `DELETE /api/campaigns/:campaignId`
- `POST /api/campaigns/preview-audience`
- `POST /api/campaigns/:campaignId/schedule`
- `POST /api/campaigns/:campaignId/pause`
- `POST /api/campaigns/:campaignId/resume`
- `POST /api/campaigns/:campaignId/cancel`

#### Campaign Configuration (auto-campaign config based)
- `GET /api/campaign-config`
- `PATCH /api/campaign-config`
- `PATCH /api/campaign-config/birthday`
- `PATCH /api/campaign-config/anniversary`
- `PATCH /api/campaign-config/first-visit`
- `PATCH /api/campaign-config/winback`
- `POST /api/campaign-config/winback/tiers`
- `DELETE /api/campaign-config/winback/tiers/:days`
- `POST /api/campaign-config/festivals`
- `PATCH /api/campaign-config/festivals/:id`
- `DELETE /api/campaign-config/festivals/:id`
- `PATCH /api/campaign-config/utility`
- `POST /api/campaign-config/preview`

#### Auto-campaigns (deprecated endpoints)
- `GET /api/auto-campaigns`
- `GET /api/auto-campaigns/:id`
- `POST /api/auto-campaigns`
- `PATCH /api/auto-campaigns/:id`
- `DELETE /api/auto-campaigns/:id`
- `POST /api/auto-campaigns/:id/activate`
- `POST /api/auto-campaigns/:id/pause`

#### Org Settings
- `GET /api/org-settings/:orgId`
- `PATCH /api/org-settings/:orgId/services`

---

## 5) UI Pages / Features wired to backend

### Admin
- **Admin login:** `/admin/login` → `POST /api/admin/auth/login`
- **Campaign Catalog:** `/admin/campaigns`
  - Uses `/api/admin/campaign-definitions` (list/create)
  - Uses `/api/admin/campaign-definitions/:id` (get/update/delete)
  - Uses `/api/admin/campaign-definitions/:id/publish`
  - Uses `/api/admin/campaign-definitions/:id/archive`
- **Org pages:** `/admin/orgs/*`
  - Uses `/api/admin/org/:orgId` and related WhatsApp config proxy routes

### User
- **User login:** `/login` → direct `POST /api/auth/login`
- **Campaign Runs:** `/campaigns`
  - Uses `/api/campaign-runs/capabilities`
  - Uses `/api/campaign-runs/definitions`
  - Uses `/api/campaign-runs` (list/create)
  - Uses `/api/campaign-runs/:id` (detail)
  - Uses `/api/campaign-runs/:id/audience/csv` (CSV upload)
  - Uses `/api/campaign-runs/:id/schedule`, `/cancel`, `/delete`

---

## 6) Notes / Gotchas

- **Campaign Definitions** are **not org-scoped**: do **not** send `X-ORG-ID`.
- **Campaign Runs** are org-scoped by the backend via the user JWT (frontend proxies require `Authorization`).
- **WhatsApp template `componentsPreset`** is treated as a passthrough preset in Campaign Definitions and must match WhatsApp Cloud API schema.
- `app/api/README.md` claims proxy routes are deprecated, but multiple proxies are actively used (especially admin + campaign-runs + media upload).
