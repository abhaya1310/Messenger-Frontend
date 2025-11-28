# Quick Start Guide

Get the frontend up and running in 5 minutes!

## Step 1: Prerequisites ✅

- Node.js >= 18.18 installed
- Backend server running (see main README.md)

## Step 2: Setup Frontend

```bash
# Navigate to frontend directory
cd D:\Whatsapp-Frontend

# Install dependencies
npm install

# Create environment file
copy env.example .env.local
```

## Step 3: Configure Environment

Edit `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_TOKEN=your_admin_token_here
```

## Step 4: Start Frontend

```bash
npm run dev
```

Frontend will be available at: **http://localhost:3001**

## Step 5: Verify Connection

### Quick Test (Browser Console)

1. Open http://localhost:3001
2. Press `F12` to open DevTools
3. Go to Console tab
4. Run:

```javascript
fetch('http://localhost:3000/api/health')
  .then(r => r.json())
  .then(data => console.log('✅ Connected!', data))
  .catch(err => console.error('❌ Failed:', err));
```

### Visual Test

1. Open `test-api-connection.html` in browser
2. Click "Test All Connections"
3. Verify all tests pass

## ✅ Success Indicators

- ✅ Frontend loads at http://localhost:3001
- ✅ No errors in browser console
- ✅ Templates page loads data
- ✅ Network tab shows API calls to backend

## 🐛 Troubleshooting

**Frontend won't start?**
- Check Node.js version: `node --version`
- Reinstall: `rm -rf node_modules && npm install`

**API calls failing?**
- Verify backend is running: `curl http://localhost:3000/api/health`
- Check `.env.local` has correct `NEXT_PUBLIC_BACKEND_URL`

**CORS errors?**
- Check backend `.env` has `FRONTEND_URL=http://localhost:3001`
- Restart backend after changing CORS settings

## Deploying to Vercel (Very Short Version)

To host the frontend on Vercel:

1. Import this repo into Vercel and set the project root to `Messenger-Frontend/`.
2. Keep the framework as **Next.js** and the build command as `npm run build`.
3. In Vercel environment variables, set:
   - `NEXT_PUBLIC_BACKEND_URL` to your backend URL (for example, `https://csat-cloud.vercel.app`).
   - `NEXT_PUBLIC_ADMIN_TOKEN` if needed.
   - `BACKEND_URL` and `ADMIN_TOKEN` for server-side proxy routes under `app/api`.
4. Update the backend CORS config to allow your Vercel domain.

## 📚 More Help

- **Full Documentation**: See [README.md](./README.md)
- **Testing Guide**: See [TESTING.md](./TESTING.md)
- **API Status**: See [API_CONNECTIONS_STATUS.md](./API_CONNECTIONS_STATUS.md)

## 🎉 You're Ready!

Once you see the dashboard, you're all set! Start exploring:
- `/templates` - Browse WhatsApp templates
- `/analytics` - View analytics
- `/monitor` - Manage conversations

