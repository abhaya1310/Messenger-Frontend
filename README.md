# ConnectNow Command Center (Frontend)

Next.js 15 (App Router) frontend for ConnectNow: a WhatsApp + POS driven customer engagement command center. This frontend communicates with the backend API and can be deployed independently.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Pages & Routes](#pages--routes)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [API Connections](#api-connections)
- [Testing Guide](#testing-guide)
- [Development](#development)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## Overview

This is a **Next.js 15** application built with:
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (Radix UI)

## Key Features

- **Authentication**
  - Login page (`/login`) backed by `POST /api/auth/login`.
  - Uses `Authorization: Bearer <accessToken>` on authenticated calls.
  - Validates stored sessions via `GET /api/auth/me` on app boot.
  - User onboarding via **access code** at `/onboarding` (verify + set password).
- **Admin Portal (role-based)**
  - Admin routes under `/admin/*` are guarded client-side via `GET /api/auth/me` and require `user.role === "admin"`.
  - Admin org context is persisted as `selectedOrgId` in localStorage.
  - Admin UI calls `/api/admin/*` Next.js route handlers, passing `Authorization: Bearer <accessToken>` and (for org-scoped calls) `X-ORG-ID: <orgId>`.
  - Admin onboarding flow: create org + invite user email to generate an **access code** (see `/admin/orgs/new`).
  - Admin credits operations:
    - Org list with credits summary (`/admin/orgs`) via `GET /api/admin/whatsapp/orgs`
    - Org credits drill-down (`/admin/orgs/[orgId]/credits`) showing balances, refill, and ledger
- **Dashboard**
  - KPI overview and customer segments (`/dashboard`).
  - Live WhatsApp credits balances (`/dashboard`) via `GET /api/credits/me`.
- **Templates + Bulk Send**
  - Browse templates (`/templates`).
  - CSV upload + intelligent mapping + preview + batched sending (`/templates/[templateName]/send`).
- **Campaigns**
  - Create and schedule campaigns (`/campaigns`).
  - Campaign run scheduling includes a credits precheck and can show `waiting_for_credits` when a run is queued but awaiting credit availability.
  - Campaign catalog:
    - Admins manage reusable campaign definitions at `/admin/campaigns`.
    - Users pick from the catalog and create runs at `/campaigns`.
    - Definitions store a template preview payload (`template.preview`) with sample values; the backend computes `template.preview.message`, which is shown on the user-facing catalog cards.
- **Auto Campaign Settings**
  - Configure birthday/anniversary/first-visit/winback/festivals + utility messaging (`/auto-campaigns`).
- **Analytics**
  - Messaging + customer analytics and export (`/analytics`).
- **Monitor**
  - Conversation inbox, message thread, replies, and metadata (`/monitor`).
- **Settings**
  - Organization services toggles and POS integration settings (`/settings`).

## Pages & Routes

- **`/login`**: Auth entrypoint.
- **`/admin/login`**: Admin login page (uses standard JWT login, then requires `role=admin`).
- **`/admin/orgs`**: Admin org list + WhatsApp status + credits summary (admin-only).
- **`/admin/orgs/new`**: Create a new org + invite a user email (admin-only). Displays `accessCode` + `expiresAt`.
- **`/admin/orgs/[orgId]`**: Org details + WhatsApp configuration (admin-only).
- **`/admin/orgs/[orgId]/credits`**: Org credits balances + refill + ledger (admin-only).
- **`/admin/templates`**: Admin templates browser (UI mirrors `/templates`).
- **`/admin/campaigns`**: Admin campaign catalog (Campaign Definitions).
- **`/onboarding`**: Access-code based account setup.
- **`/privacy-policy`**: Public policy page.
- **`/dashboard`**: Primary authenticated landing.
- **`/templates`**: Template listing.
- **`/templates/[templateName]/send`**: CSV-driven bulk send flow.
- **`/campaigns`**: Campaign scheduler.
- **`/auto-campaigns`**: Automated campaigns + utility messaging configuration.
- **`/analytics`**: Reporting and exports.
- **`/monitor`**: Conversations inbox.
- **`/settings`**: Org settings and service toggles.

## Prerequisites

- **Node.js**
  - Minimum: `>= 18.18`
  - Recommended: use the version in `.nvmrc` (`20.15.1`).
- **npm** >= 9
- **Backend server** running and reachable (default expected: `http://localhost:3000`).

## Quick Start

### 1. Navigate to Frontend Directory

```bash
cd Messenger-Frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
# Create local env file from template
# macOS / Linux:
cp env.example .env.local

# Windows PowerShell:
# copy env.example .env.local
```

**Required Configuration**:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### 4. Start Development Server

```bash
npm run dev
```

By default, Next.js starts on port `3000`. If your backend is already on `3000`, run the frontend on a different port:

```bash
npm run dev -- -p 3001
```

Open the app at:
- `http://localhost:3000` (default)
- `http://localhost:3001` (if you pass `-p 3001`)

## API Connections

### Connection Architecture

The frontend primarily makes **direct API calls** to the backend using the `NEXT_PUBLIC_BACKEND_URL` environment variable (see `lib/config.ts` and `lib/api.ts`).

This repo also contains **Next.js route handlers** under `app/api/*` that proxy requests server-side using `BACKEND_URL` (and `NEXT_PUBLIC_API_URL` for feedback routes). These route handlers are actively used for:

- `/api/admin/*` (admin portal operations)
- `/api/campaign-runs/*` (campaign runs UI)
- Credits endpoints (`/api/credits/*`, `/api/admin/org/*/credits*`)
- Multipart requests like `/api/media/upload` and `/api/campaign-runs/:id/audience/csv`

They forward admin/user auth headers as needed.

### Campaign Catalog (Definitions) + Runs

The campaign catalog is built from **campaign definitions** created in the admin portal.

- Admin definitions (proxy routes):
  - `GET /api/admin/campaign-definitions`
  - `POST /api/admin/campaign-definitions`
  - `PATCH /api/admin/campaign-definitions/:id`
  - `DELETE /api/admin/campaign-definitions/:id` (draft-only)
  - `POST /api/admin/campaign-definitions/:id/publish`
  - `POST /api/admin/campaign-definitions/:id/unpublish`
  - `POST /api/admin/campaign-definitions/:id/archive`
  - `POST /api/admin/campaign-definitions/:id/unarchive`

- Template analysis + preview:
  - Admin UI calls `POST /api/templates/analyze` when selecting a template.
  - Admin UI renders one input per template variable index.
  - On save, admin UI sends `template.preview` in the definition body:
    - `headerText`, `bodyText`, `footerText`, `sampleValues`
  - Backend computes and stores `template.preview.message` (authoritative preview string).

- User catalog + run creation:
  - `GET /api/campaign-runs/definitions` returns user-visible definitions.
  - `POST /api/campaign-runs` creates a run (optionally including `templateParams` overrides).

Credits-related proxy routes:

- `GET /api/credits/me`
- `GET /api/campaign-runs/[id]/credits/precheck`
- `GET /api/admin/whatsapp/orgs` (org list + WhatsApp config + credits summary)
- `GET /api/admin/org/[orgId]/credits`
- `POST /api/admin/org/[orgId]/credits/refill`
- `GET /api/admin/org/[orgId]/credits/ledger`

For an exhaustive, code-accurate list of integrations, see:

- `BACKEND_INTEGRATIONS.md`

```
Frontend (Next.js)          Backend (Express)
     │                            │
     │  HTTP Request              │
     ├───────────────────────────>│
     │  (REST API)                │
     │                            │
     │  JSON Response             │
     │<───────────────────────────┤
     │                            │
```

### API Base URL Configuration

The API base URL is configured via `lib/config.ts` and used in `lib/api.ts`:

```typescript
// lib/config.ts
export const config = {
  apiUrl: getApiUrl(), // uses NEXT_PUBLIC_BACKEND_URL
} as const;

// lib/api.ts
const API_BASE = config.apiUrl;
```

**All API calls** use this base URL:
- ✅ `fetchTemplates()` → `${API_BASE}/api/templates`
- ✅ `analyzeTemplate()` → `${API_BASE}/api/templates/analyze`
- ✅ `analyzeCsv()` → `${API_BASE}/api/csv/analyze`
- ✅ `sendTemplateDynamic()` → `${API_BASE}/api/send-template-dynamic`
- ✅ `fetchConversations()` → `${API_BASE}/conversations`
- ✅ And all other endpoints...

### Verifying API Connections

#### 1. Check Environment Variable

```bash
# macOS / Linux
cat .env.local

# Windows PowerShell
# type .env.local
```

#### 2. Test Backend Connectivity

**Before starting frontend**, verify backend is running:

```bash
# Test backend health endpoint
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":123.45}
```

#### 3. Check Browser Console

Open browser DevTools (F12) and check:
- **Network Tab**: All API calls should go to `http://localhost:3000` (or your backend URL)
- **Console Tab**: Look for any CORS or connection errors

#### 4. Test API Endpoints

**In Browser Console** (F12):
```javascript
// Test API connection
fetch('http://localhost:3000/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Should return: {status: "ok", ...}
```

## Testing Guide

### Manual Testing Checklist

#### ✅ Setup Verification

- [ ] Frontend starts without errors
- [ ] No console errors on page load
- [ ] Backend is running and accessible
- [ ] Environment variables are set correctly

#### ✅ API Connection Tests

1. **Health Check**:
   - Open browser console (F12)
   - Navigate to any page
   - Check Network tab for `/api/health` request
   - Should return 200 status

2. **Templates Page**:
   - Navigate to `/templates`
   - Should load templates from backend
   - Check Network tab for `/api/templates` request
   - Verify templates are displayed

3. **Analytics Page**:
   - Navigate to `/analytics`
   - Should load analytics data
   - Check Network tab for `/api/analytics` request
   - Verify charts/data are displayed

4. **Monitor Page**:
   - Navigate to `/monitor`
   - Should load conversations
   - Check Network tab for `/conversations` request
   - Verify conversations list is displayed

#### ✅ Feature Testing

**Template Analysis**:
1. Go to `/templates`
2. Click "Send" on any template
3. Upload a CSV file
4. Verify CSV analysis works
5. Check column mapping interface
6. Verify template preview

**Message Sending**:
1. Complete template selection and CSV mapping
2. Click "Send Messages"
3. Verify progress tracking
4. Check send results

**Conversation Management**:
1. Go to `/monitor`
2. Select a conversation
3. Verify messages load
4. Test sending a reply
5. Test metadata editing

### Automated Testing

```bash
# Run build to check for TypeScript errors
npm run build
```

### API Connection Test Script

Create a test file `test-api-connection.js`:

```javascript
// Test API connection
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

async function testConnection() {
  try {
    console.log('Testing backend connection...');
    console.log('Backend URL:', API_BASE);
    
    // Test health endpoint
    const health = await fetch(`${API_BASE}/api/health`);
    const healthData = await health.json();
    console.log('✅ Health check:', healthData);
    
    // Test templates endpoint
    const templates = await fetch(`${API_BASE}/api/templates`);
    const templatesData = await templates.json();
    console.log('✅ Templates:', templatesData.data?.length || 0, 'templates');
    
    console.log('✅ All API connections working!');
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
    console.error('Make sure:');
    console.error('1. Backend is running on', API_BASE);
    console.error('2. CORS is configured correctly');
    console.error('3. Environment variable NEXT_PUBLIC_BACKEND_URL is set');
  }
}

testConnection();
```

Run in browser console or Node.js environment.

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Development Workflow

1. **Start backend first** (whatever command your backend repo uses).
2. **Start frontend**:
   ```bash
   cd Messenger-Frontend
   npm run dev -- -p 3001
   ```
3. **Open browser**:
   - Frontend: http://localhost:3001
   - Backend: http://localhost:3000

### Hot Reload

Next.js automatically reloads when you make changes to:
- React components
- Pages
- API routes (if any)
- Configuration files

### Debugging

**Browser DevTools**:
- Press `F12` to open DevTools
- Check **Console** for errors
- Check **Network** tab for API requests
- Check **Application** tab for environment variables

**Common Issues**:
- **CORS Errors**: Check backend `FRONTEND_URL` configuration
- **404 Errors**: Verify `NEXT_PUBLIC_BACKEND_URL` is correct
- **401 Errors**: Confirm the user is logged in and the app is sending `Authorization: Bearer <JWT>`

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL (browser + server) | `http://localhost:3000` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_DEFAULT_ORG_ID` | Default organization ID | `default` |
| `BACKEND_URL` | Backend URL for Next.js API proxy routes under `app/api/*` (server only) | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Legacy proxy base used by `app/api/feedback/*` routes | `http://localhost:3002` |
| `ADMIN_SESSION_SECRET` | Secret used to sign the admin portal session cookie (server only) | (empty) |
| `ADMIN_PORTAL_USERNAME` | Optional admin portal username allowlist (server only) | (empty) |
| `ADMIN_PORTAL_PASSWORD` | Optional admin portal password allowlist (server only) | (empty) |

### Backend prerequisites (for access codes)

The **invite/access-code onboarding** flow requires backend configuration:

- Required on backend: `REGISTRATION_CODE_PEPPER`
- Optional on backend: `REGISTRATION_CODE_TTL_SECONDS` (defaults to 86400)

### Environment File

Create `.env.local` in the frontend root:

```bash
# Backend API URL (required)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Default organization ID (optional)
NEXT_PUBLIC_DEFAULT_ORG_ID=demo-org

# Admin portal session secret (server-only; required if you use /admin)
ADMIN_SESSION_SECRET=change_me
```

**Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put sensitive secrets in these variables.

For **server-only** variables (`BACKEND_URL`, `ADMIN_TOKEN`), set them in your deployment platform (for example, Vercel project settings) instead of committing them to `.env.local`.

## Project Structure

```
Messenger-Frontend/
├── app/                       # Next.js app directory (App Router)
│   ├── login/                 # Login page
│   ├── dashboard/             # Dashboard
│   ├── templates/             # Templates list + send flow
│   ├── campaigns/             # Campaign scheduler
│   ├── auto-campaigns/        # Automated campaign settings
│   ├── analytics/             # Analytics + export
│   ├── monitor/               # Conversation inbox
│   ├── settings/              # Org settings + service toggles
│   ├── feedback/              # Feedback UI (WIP)
│   ├── loyalty-programs/      # Loyalty page (coming soon)
│   ├── privacy-policy/        # Public privacy policy
│   ├── api/                   # Optional/legacy Next.js route handlers
│   ├── layout.tsx             # Root layout (AuthProvider + LayoutWrapper)
│   └── page.tsx               # Home cards (authenticated)
├── components/                # UI + feature components
│   ├── ui/                    # shadcn/ui components
│   ├── monitor/               # Monitor page components
│   └── ...
├── lib/
│   ├── api.ts                 # API client (direct backend calls)
│   ├── auth.ts                # Auth + localStorage helpers
│   ├── config.ts              # URL normalization + env handling
│   ├── services/              # Validation/mapping services
│   └── types/                 # Shared types (campaign, pos, mapping, monitor, ...)
├── public/                    # Static assets
├── env.example                # Env template (copy to .env.local)
├── package.json
└── tsconfig.json
```

## Troubleshooting

### Frontend Won't Start

**Error**: `Port 3001 is already in use`

**Solution**:
```bash
# Use a different port
npm run dev -- -p 3002

# Or free the port
# macOS / Linux:
#   lsof -i :3001
#   kill -9 <PID>
# Windows PowerShell:
#   netstat -ano | findstr :3001
#   taskkill /PID <PID> /F
```

### API Calls Failing

**Error**: `Failed to fetch` or `Network error`

**Checklist**:
1. ✅ Backend is running (`curl http://localhost:3000/api/health`)
2. ✅ `NEXT_PUBLIC_BACKEND_URL` is set correctly
3. ✅ No CORS errors in browser console
4. ✅ Backend `FRONTEND_URL` matches frontend origin

**Debug Steps**:
```javascript
// In browser console
console.log('API Base:', process.env.NEXT_PUBLIC_BACKEND_URL);
fetch(process.env.NEXT_PUBLIC_BACKEND_URL + '/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### CORS Errors

**Error**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Solution**:
1. Check backend `.env` has correct `FRONTEND_URL`
2. Verify frontend URL matches exactly (including protocol)
3. Restart backend after changing `FRONTEND_URL`

### Templates Not Loading

**Possible Causes**:
1. Backend not running
2. Wrong `NEXT_PUBLIC_BACKEND_URL`
3. Backend API error (check backend logs)
4. Network/firewall blocking requests

**Debug**:
```javascript
// In browser console
fetch('http://localhost:3000/api/templates')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### Authentication Errors

**Error**: `401 Unauthorized`

**Solution**:
1. Log in again (token may be expired)
2. Verify the app is sending `Authorization: Bearer <JWT>` on authenticated requests
3. Check backend logs for authentication failures
4. For admin routes (`/admin/*`), ensure the logged-in user has `role=admin` and that admin calls include `Authorization`

### Build Errors

**TypeScript Errors**:
```bash
npm run build
# Fix any TypeScript errors shown
```

**Missing Dependencies**:
```bash
npm install
```

## Production Deployment

### Deploying to Vercel

High-level steps:

1. Create a new project in Vercel and select this repository.
2. In **Root Directory**, choose `Messenger-Frontend/` so Vercel finds `package.json` and the `app/` directory.
3. Leave the **Framework Preset** as **Next.js**.
4. Use the default install command (`npm install`) and build command (`npm run build`).
5. In the Vercel **Environment Variables** tab, configure:
   - `NEXT_PUBLIC_BACKEND_URL` → your production backend URL (for example, `https://csat-cloud.vercel.app`).
   - `NEXT_PUBLIC_DEFAULT_ORG_ID` → optional.
   - `BACKEND_URL` → same backend URL, used by `app/api/*` proxy routes.
   - `ADMIN_SESSION_SECRET` → optional; only needed if you rely on admin cookie-based proxy auth instead of passing `Authorization` to `/api/admin/*`.
6. Ensure your backend CORS configuration allows your Vercel domain(s) as origins.

**Quick Production Build (self-hosted Node)**:
```bash
npm run build
npm start
```

## Related Documentation

- [QUICK_START.md](./QUICK_START.md)
- [HOW_TO_RUN.md](./HOW_TO_RUN.md)
- [TESTING.md](./TESTING.md)
- [API_CONNECTIONS_STATUS.md](./API_CONNECTIONS_STATUS.md)

## Support

For issues:
1. Check browser console for errors
2. Check backend logs
3. Verify environment variables
4. Test API connectivity
5. Review [Troubleshooting](#troubleshooting) section

## License

Same as main project.
