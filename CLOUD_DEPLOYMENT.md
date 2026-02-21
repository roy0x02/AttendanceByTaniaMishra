# Cloud Deployment Guide

This guide covers deploying your Attendance Management System to various cloud platforms and resolving common deployment issues like "Failed to fetch" errors.

## Overview

Your attendance system consists of two parts:
- **Frontend**: Static HTML/CSS/JS files (served from the root directory)
- **Backend**: Node.js Express API server (in the `server/` directory)

## Prerequisites

Before deploying, ensure you have:
- Node.js installed on the cloud platform
- Access to set environment variables
- Your cloud platform's deployment URL

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the `server/` directory based on `.env.example`:

```bash
PORT=3000
SESSION_SECRET=your-strong-random-secret-key-here
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

### Variable Explanations

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `3000` |
| `SESSION_SECRET` | Secret key for session encryption (use a random string) | `a8f7d92c3b1e...` |
| `NODE_ENV` | Environment mode | `production` |
| `ALLOWED_ORIGINS` | Comma-separated list of frontend URLs that can access the API | `https://myapp.vercel.app` |

> [!IMPORTANT]
> **ALLOWED_ORIGINS is critical!** This must match your frontend domain exactly, or you'll get "Failed to fetch" errors.

## Platform-Specific Deployment

### Option 1: Deploy to Railway

**Backend Deployment:**
1. Create a new Railway project
2. Connect your GitHub repository
3. Set root directory to `/server`
4. Add environment variables in Railway dashboard
5. Deploy

**Frontend Deployment:**
1. Deploy to any static hosting (Vercel, Netlify, GitHub Pages)
2. Set `ALLOWED_ORIGINS` in Railway to your frontend URL

### Option 2: Deploy to Vercel

**Backend:**
1. Create a `vercel.json` in the `server/` directory:
```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "/server.js" }]
}
```
2. Deploy from `server/` directory
3. Set environment variables in Vercel dashboard

**Frontend:**
1. Deploy from root directory
2. Update backend `ALLOWED_ORIGINS` with Vercel frontend URL

### Option 3: Deploy to VPS/DigitalOcean

**Backend:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <your-repo>
cd attendance/server
npm install

# Create .env file
nano .env
# Add your environment variables

# Install PM2 for process management
sudo npm install -g pm2

# Start server
pm2 start server.js --name attendance-backend
pm2 save
pm2 startup
```

**Frontend:**
```bash
# Install nginx
sudo apt-get install nginx

# Copy files
sudo cp -r /path/to/attendance/* /var/www/html/

# Configure nginx (if needed)
sudo nano /etc/nginx/sites-available/default
```

## Testing Your Deployment

### 1. Check Backend Health

Visit: `https://your-backend-domain.com/api/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T...",
  "version": "1.0.0"
}
```

### 2. Check Backend Logs

Look for the startup message confirming allowed origins:
```
========================================
Attendance System Backend Server
========================================
Server running on port 3000
Environment: production
Data directory: /path/to/data
Allowed origins: https://your-frontend-domain.com
========================================
```

### 3. Test Frontend Connection

1. Open browser DevTools (F12) → Console tab
2. Visit your frontend URL
3. Look for: `✓ API Server connected: {status: "ok", ...}`

## Troubleshooting

### Error: "Failed to fetch"

**Cause**: CORS is blocking the request

**Solution**:
1. Check `ALLOWED_ORIGINS` environment variable on backend
2. Ensure it EXACTLY matches your frontend URL (including `https://`)
3. Check for typos (trailing slashes, www vs non-www)
4. Restart backend server after changing variables

**To debug:**
```bash
# Check what origins are allowed
# Look at backend server logs on startup
```

### Error: "ERR_CONNECTION_REFUSED"

**Cause**: Backend server is not running or wrong URL

**Solution**:
1. Verify backend server is running
2. Check backend URL in your deployment
3. Test backend health endpoint

### Error: CORS with localhost

**Cause**: Accessing production backend from localhost

**Solution**: Don't mix localhost and production - use either:
- Both frontend and backend on localhost
- Both frontend and backend on cloud

### Sessions not persisting

**Cause**: Cookie settings or SESSION_SECRET issues

**Solution**:
1. Ensure `SESSION_SECRET` is set in production
2. For HTTPS, cookies work automatically
3. Frontend and backend should be on same domain or enable CORS credentials

## API URL Configuration

Your frontend automatically detects the environment:

- **Localhost**: Uses `http://localhost:3000/api`
- **Production**: Uses relative path `/api`

> [!WARNING]
> If you deploy frontend and backend to different domains, you need to modify `api-client.js` to use the full backend URL:
> ```javascript
> baseUrl: 'https://your-backend-domain.com/api'
> ```

## Security Checklist

Before going to production:

- [ ] Change `SESSION_SECRET` to a strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Set `ALLOWED_ORIGINS` to only your actual frontend domain(s)
- [ ] Enable HTTPS on both frontend and backend
- [ ] Change default passwords in `config.js`
- [ ] Restrict file upload sizes if needed
- [ ] Set up regular backups of the `server/data` directory

## Next Steps

1. Deploy backend to your chosen platform
2. Set environment variables correctly
3. Deploy frontend to static hosting
4. Update backend `ALLOWED_ORIGINS` with frontend URL
5. Test login functionality
6. Monitor server logs for any issues

## Support

If you encounter issues:
1. Check backend server logs
2. Check browser DevTools Console and Network tabs
3. Verify all environment variables are set correctly
4. Test the backend `/api/health` endpoint
