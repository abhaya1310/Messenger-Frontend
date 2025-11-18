# Frontend Testing Guide

Complete guide for testing the frontend application and verifying API connections.

## Quick Start Testing

### Step 1: Verify Backend is Running

**Before testing frontend**, ensure backend is running:

```bash
# In backend directory
cd D:\Whatsapp automation\Whatsapp
npm run dev

# Test backend health
curl http://localhost:3000/api/health
# Should return: {"status":"ok",...}
```

### Step 2: Start Frontend

```bash
# In frontend directory
cd D:\Whatsapp-Frontend

# Install dependencies (if not done)
npm install

# Create .env.local if not exists
copy env.example .env.local

# Edit .env.local - set NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Start development server
npm run dev
```

### Step 3: Open Browser

Navigate to: **http://localhost:3001**

## API Connection Verification

### Method 1: Browser DevTools

1. **Open DevTools** (Press `F12`)
2. **Go to Network Tab**
3. **Navigate to any page** (e.g., `/templates`)
4. **Check API Requests**:
   - Look for requests to `http://localhost:3000`
   - Verify status codes are `200` (success)
   - Check response data

### Method 2: Browser Console

Open browser console (F12) and run:

```javascript
// Test health endpoint
fetch('http://localhost:3000/api/health')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Backend connected:', data);
  })
  .catch(err => {
    console.error('❌ Backend connection failed:', err);
  });

// Test templates endpoint
fetch('http://localhost:3000/api/templates?limit=5')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Templates loaded:', data.data?.length || 0, 'templates');
  })
  .catch(err => {
    console.error('❌ Templates failed:', err);
  });
```

### Method 3: Test HTML Page

1. **Open** `test-api-connection.html` in browser
2. **Enter backend URL**: `http://localhost:3000`
3. **Click "Test All Connections"**
4. **Review results** for each endpoint

### Method 4: Command Line Test

```bash
# Test backend health
curl http://localhost:3000/api/health

# Test templates endpoint
curl http://localhost:3000/api/templates?limit=5

# Test with admin token
curl -H "X-ADMIN-TOKEN: your_token" http://localhost:3000/api/templates/analyze
```

## Testing Checklist

### ✅ Setup Tests

- [ ] Frontend starts without errors
- [ ] No console errors on page load
- [ ] Backend is running and accessible
- [ ] Environment variables are set correctly
- [ ] `.env.local` file exists and has `NEXT_PUBLIC_BACKEND_URL`

### ✅ API Connection Tests

- [ ] Health endpoint responds (`/api/health`)
- [ ] Templates endpoint works (`/api/templates`)
- [ ] Analytics endpoint works (`/api/analytics`)
- [ ] No CORS errors in console
- [ ] All API calls use correct backend URL

### ✅ Feature Tests

#### Dashboard (`/`)
- [ ] Page loads without errors
- [ ] Statistics display correctly
- [ ] Navigation links work

#### Templates Page (`/templates`)
- [ ] Templates list loads
- [ ] Template cards display correctly
- [ ] "Send" button navigates to send page
- [ ] Search/filter works (if implemented)

#### Template Send Page (`/templates/[name]/send`)
- [ ] Page loads for selected template
- [ ] CSV upload works
- [ ] CSV analysis completes
- [ ] Column mapping interface displays
- [ ] Template preview shows correctly
- [ ] Send functionality works

#### Analytics Page (`/analytics`)
- [ ] Analytics data loads
- [ ] Charts/graphs display (if implemented)
- [ ] Date filters work (if implemented)
- [ ] Export functionality works

#### Monitor Page (`/monitor`)
- [ ] Conversations list loads
- [ ] Conversation selection works
- [ ] Messages display correctly
- [ ] Send reply works
- [ ] Metadata editing works
- [ ] Real-time updates work (polling)

## Common Issues & Solutions

### Issue: "Failed to fetch" Error

**Symptoms**: Network errors in console, API calls failing

**Solutions**:
1. ✅ Verify backend is running: `curl http://localhost:3000/api/health`
2. ✅ Check `NEXT_PUBLIC_BACKEND_URL` in `.env.local`
3. ✅ Verify no firewall blocking requests
4. ✅ Check backend logs for errors

### Issue: CORS Errors

**Symptoms**: `Access to fetch at '...' has been blocked by CORS policy`

**Solutions**:
1. ✅ Check backend `.env` has `FRONTEND_URL=http://localhost:3001`
2. ✅ Restart backend after changing `FRONTEND_URL`
3. ✅ Verify frontend URL matches exactly (including protocol)
4. ✅ Check backend CORS configuration in `src/server.ts`

### Issue: 401 Unauthorized

**Symptoms**: API calls return 401 status

**Solutions**:
1. ✅ Check `NEXT_PUBLIC_ADMIN_TOKEN` matches backend `ADMIN_TOKEN`
2. ✅ Verify token is included in request headers
3. ✅ Check backend logs for authentication errors
4. ✅ For development, backend may allow unauthenticated requests

### Issue: Templates Not Loading

**Symptoms**: Templates page shows empty or error

**Solutions**:
1. ✅ Test backend directly: `curl http://localhost:3000/api/templates`
2. ✅ Check backend has WhatsApp credentials configured
3. ✅ Verify `WABA_ID` is set in backend `.env`
4. ✅ Check backend logs for API errors

### Issue: Frontend Won't Start

**Symptoms**: `npm run dev` fails

**Solutions**:
1. ✅ Check Node.js version: `node --version` (should be >= 18.18)
2. ✅ Reinstall dependencies: `rm -rf node_modules && npm install`
3. ✅ Check for port conflicts: `netstat -ano | findstr :3001`
4. ✅ Clear Next.js cache: `rm -rf .next`

## Automated Testing

### Build Test

```bash
# Test TypeScript compilation
npm run build

# Should complete without errors
```

### Lint Test

```bash
# Check code quality
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

## Performance Testing

### Check Bundle Size

```bash
npm run build

# Check .next/analyze for bundle analysis
```

### Network Performance

1. Open DevTools → Network tab
2. Check API response times
3. Verify no unnecessary requests
4. Check for failed requests

## API Endpoints Status

### ✅ Active Endpoints

All these endpoints are **active** and configured in `lib/api.ts`:

| Endpoint | Method | Status | Function |
|----------|--------|--------|----------|
| `/api/health` | GET | ✅ Active | Health check |
| `/api/templates` | GET | ✅ Active | `fetchTemplates()` |
| `/api/templates/analyze` | POST | ✅ Active | `analyzeTemplate()` |
| `/api/csv/analyze` | POST | ✅ Active | `analyzeCsv()` |
| `/api/send-template-dynamic` | POST | ✅ Active | `sendTemplateDynamic()` |
| `/api/analytics` | GET | ✅ Active | `fetchAnalytics()` |
| `/api/analytics/export` | GET | ✅ Active | `exportAnalytics()` |
| `/conversations` | GET | ✅ Active | `fetchConversations()` |
| `/conversations/:phone/messages` | GET | ✅ Active | `fetchConversationMessages()` |
| `/conversations/:phone/metadata` | PATCH | ✅ Active | `updateConversationMetadata()` |
| `/send-text` | POST | ✅ Active | `sendTextMessage()` |
| `/analytics/templates` | GET | ✅ Active | `fetchTemplatesAnalytics()` |
| `/analytics/summary` | GET | ✅ Active | `fetchAnalyticsSummary()` |
| `/analytics/template/:name/series` | GET | ✅ Active | `fetchTemplateSeries()` |
| `/analytics/template/:name/variables` | GET | ✅ Active | `fetchTemplateVariables()` |
| `/analytics/template/:name/variables/:var/top` | GET | ✅ Active | `fetchTopValues()` |

## Verification Commands

### Quick Verification Script

Create `verify-connections.js`:

```javascript
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

async function verify() {
  console.log('🔍 Verifying API connections...\n');
  console.log('Backend URL:', API_BASE);
  
  const tests = [
    { name: 'Health Check', url: '/api/health' },
    { name: 'Templates', url: '/api/templates?limit=1' },
    { name: 'Analytics', url: '/api/analytics' }
  ];
  
  for (const test of tests) {
    try {
      const response = await fetch(`${API_BASE}${test.url}`);
      const data = await response.json();
      console.log(`✅ ${test.name}: OK (${response.status})`);
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED - ${error.message}`);
    }
  }
}

verify();
```

Run in Node.js (with fetch support) or browser console.

## Next Steps

After verifying connections:

1. ✅ Test all features manually
2. ✅ Check for console errors
3. ✅ Verify data flows correctly
4. ✅ Test on different browsers
5. ✅ Test responsive design (mobile/tablet)

## Support

If issues persist:
1. Check [README.md](./README.md) for setup instructions
2. Review [Troubleshooting](#common-issues--solutions) section
3. Check backend logs for errors
4. Verify environment variables are correct

