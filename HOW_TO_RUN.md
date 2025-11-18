# How to Run the Frontend

Simple step-by-step guide to get the frontend running.

## Prerequisites

1. **Node.js installed** (version >= 18.18)
   - Check: `node --version`
   - Download: https://nodejs.org/

2. **Backend is running** (required for frontend to work)
   - Backend should be running on `http://localhost:3000`
   - See main README.md for backend setup

## Step-by-Step Instructions

### Step 1: Open Terminal/Command Prompt

Open PowerShell or Command Prompt on Windows.

### Step 2: Navigate to Frontend Directory

```bash
cd D:\Whatsapp-Frontend
```

### Step 3: Install Dependencies (First Time Only)

```bash
npm install
```

**Note**: This only needs to be done once, or when dependencies change.

### Step 4: Create Environment File

```bash
# Copy the example file
copy env.example .env.local
```

### Step 5: Configure Environment Variables

Edit `.env.local` file and set:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_TOKEN=your_admin_token_here
```

**To edit**:
- Open `.env.local` in Notepad or any text editor
- Set `NEXT_PUBLIC_BACKEND_URL` to your backend URL (default: `http://localhost:3000`)
- Set `NEXT_PUBLIC_ADMIN_TOKEN` to match your backend `ADMIN_TOKEN` (optional for development)

### Step 6: Start the Frontend

```bash
npm run dev
```

### Step 7: Open in Browser

Once you see:
```
✓ Ready in 2.5s
○ Local:        http://localhost:3001
```

Open your browser and go to: **http://localhost:3001**

## Complete Command Sequence

```bash
# 1. Navigate to frontend
cd D:\Whatsapp-Frontend

# 2. Install dependencies (first time only)
npm install

# 3. Create environment file (first time only)
copy env.example .env.local

# 4. Edit .env.local - set NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# 5. Start frontend
npm run dev

# 6. Open browser to http://localhost:3001
```

## Quick Start (If Already Set Up)

If you've already done setup before:

```bash
cd D:\Whatsapp-Frontend
npm run dev
```

That's it! Frontend will start on http://localhost:3001

## Verify It's Working

1. **Check Terminal**: Should show "Ready" message
2. **Open Browser**: Go to http://localhost:3001
3. **Check Console**: Press F12, look for errors
4. **Test API**: Open `test-api-connection.html` in browser

## Common Issues

### Port Already in Use

**Error**: `Port 3001 is already in use`

**Solution**:
```bash
# Use different port
npm run dev -- -p 3002
```

### Module Not Found

**Error**: `Cannot find module...`

**Solution**:
```bash
# Reinstall dependencies
npm install
```

### Backend Connection Failed

**Error**: API calls failing in browser

**Solution**:
1. Make sure backend is running: `curl http://localhost:3000/api/health`
2. Check `.env.local` has correct `NEXT_PUBLIC_BACKEND_URL`
3. Verify backend CORS allows frontend origin

### Environment Variables Not Working

**Issue**: Changes to `.env.local` not taking effect

**Solution**:
1. Restart the dev server (Ctrl+C, then `npm run dev`)
2. Make sure file is named `.env.local` (not `.env`)
3. Variables must start with `NEXT_PUBLIC_` to be available in browser

## Development vs Production

### Development
```bash
npm run dev
# Runs on http://localhost:3001
# Hot reload enabled
# Shows detailed errors
```

### Production Build
```bash
npm run build
npm start
# Runs optimized production build
# Better performance
# Minified code
```

## Stopping the Server

Press `Ctrl + C` in the terminal to stop the development server.

## Next Steps

Once frontend is running:
- ✅ Test API connections using `test-api-connection.html`
- ✅ Navigate to different pages (`/templates`, `/analytics`, `/monitor`)
- ✅ Check browser console for any errors
- ✅ Verify data loads from backend

## Need Help?

- See [README.md](./README.md) for full documentation
- See [TESTING.md](./TESTING.md) for testing guide
- See [TROUBLESHOOTING.md](./README.md#troubleshooting) for common issues

