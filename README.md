# WhatsApp Template Management System - Frontend

Next.js frontend application for the WhatsApp Template Management System. This frontend communicates directly with the backend API and can be deployed independently.

## 📋 Table of Contents

- [Overview](#overview)
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
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Direct API Calls** - Communicates directly with backend (no proxy)

### Key Features

- 📱 **Template Management** - Browse and analyze WhatsApp templates
- 📊 **Analytics Dashboard** - View conversation and message statistics
- 💬 **Monitor Conversations** - WhatsApp Web-style conversation interface
- 📤 **CSV Upload & Mapping** - Intelligent column mapping for bulk messaging
- 🎨 **Modern UI** - Responsive design with shadcn/ui components

## Prerequisites

- **Node.js** >= 18.18
- **npm** >= 9
- **Backend Server** - Must be running and accessible (see [Backend README](../README.md))

## Quick Start

### 1. Navigate to Frontend Directory

```bash
cd D:\Whatsapp-Frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
# Copy environment template
copy env.example .env.local

# Edit .env.local with your backend URL
notepad .env.local
```

**Required Configuration**:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_TOKEN=your_admin_token_here
```

### 4. Start Development Server

```bash
npm run dev
```

The frontend will be available at [http://localhost:3001](http://localhost:3001)

## API Connections

### Connection Architecture

The frontend makes **direct API calls** to the backend using the `NEXT_PUBLIC_BACKEND_URL` environment variable. There is no proxy layer - all requests go directly to the backend.

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
  adminToken: process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
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
# In PowerShell
$env:NEXT_PUBLIC_BACKEND_URL

# Or check .env.local file
type .env.local
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

# Check for linting errors
npm run lint
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

# Run linter
npm run lint
```

### Development Workflow

1. **Start Backend First**:
   ```bash
   cd D:\Whatsapp automation\Whatsapp
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd D:\Whatsapp-Frontend
   npm run dev
   ```

3. **Open Browser**:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000

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
- **401 Errors**: Check `NEXT_PUBLIC_ADMIN_TOKEN` matches backend token

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL (browser + server) | `http://localhost:3000` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_ADMIN_TOKEN` | Admin token for protected endpoints | (empty) |
| `NEXT_PUBLIC_DEFAULT_ORG_ID` | Default organization ID | `default` |
| `BACKEND_URL` | Backend URL for Next.js API route proxies (server only) | `http://localhost:3000` |
| `ADMIN_TOKEN` | Admin token for server-side proxies (server only) | (empty) |

### Environment File

Create `.env.local` in the frontend root:

```bash
# Backend API URL (required)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Admin token (optional for development)
NEXT_PUBLIC_ADMIN_TOKEN=your_admin_token_here

# Default organization ID (optional)
NEXT_PUBLIC_DEFAULT_ORG_ID=demo-org
```

**Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put sensitive secrets in these variables.

For **server-only** variables (`BACKEND_URL`, `ADMIN_TOKEN`), set them in your deployment platform (for example, Vercel project settings) instead of committing them to `.env.local`.

## Project Structure

```
D:\Whatsapp-Frontend/
├── app/                    # Next.js app directory
│   ├── api/               # Legacy proxy routes (deprecated)
│   ├── templates/         # Template pages
│   ├── monitor/           # Monitor page
│   ├── analytics/         # Analytics page
│   └── page.tsx           # Dashboard
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── csv-uploader.tsx  # CSV upload component
│   ├── column-mapper.tsx # Column mapping interface
│   └── ...
├── lib/                  # Utilities and helpers
│   ├── api.ts            # API client (direct backend calls)
│   ├── config.ts         # Frontend configuration
│   └── services/         # Business logic services
├── public/               # Static assets
├── .env.local           # Environment variables (create this)
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript configuration
```

## Troubleshooting

### Frontend Won't Start

**Error**: `Port 3001 is already in use`

**Solution**:
```bash
# Kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3002
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
1. Check `NEXT_PUBLIC_ADMIN_TOKEN` matches backend `ADMIN_TOKEN`
2. Verify token is included in request headers
3. Check backend logs for authentication failures

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

See [DEPLOYMENT.md](../DEPLOYMENT.md) for complete deployment instructions.

### Deploying to Vercel

High-level steps:

1. Create a new project in Vercel and select this repository.
2. In **Root Directory**, choose `Messenger-Frontend/` so Vercel finds `package.json` and the `app/` directory.
3. Leave the **Framework Preset** as **Next.js**.
4. Use the default install command (`npm install`) and build command (`npm run build`).
5. In the Vercel **Environment Variables** tab, configure:
   - `NEXT_PUBLIC_BACKEND_URL` → your production backend URL (for example, `https://csat-cloud.vercel.app`).
   - `NEXT_PUBLIC_ADMIN_TOKEN` → optional, only if you rely on browser-side admin actions.
   - `NEXT_PUBLIC_DEFAULT_ORG_ID` → optional.
   - `BACKEND_URL` → same backend URL, used by `app/api/*` proxy routes.
   - `ADMIN_TOKEN` → server-side admin token matching the backend.
6. Ensure your backend CORS configuration allows your Vercel domain(s) as origins.

**Quick Production Build (self-hosted Node)**:
```bash
npm run build
npm start
```

## Related Documentation

- [Backend README](../README.md) - Backend setup and API documentation
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment guide
- [CONNECTION_ARCHITECTURE.md](../CONNECTION_ARCHITECTURE.md) - API communication details
- [MIGRATION.md](../MIGRATION.md) - Migration from monorepo

## Support

For issues:
1. Check browser console for errors
2. Check backend logs
3. Verify environment variables
4. Test API connectivity
5. Review [Troubleshooting](#troubleshooting) section

## License

Same as main project.
