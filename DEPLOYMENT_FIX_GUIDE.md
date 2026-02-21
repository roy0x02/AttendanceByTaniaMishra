# Cloud Deployment Fix Guide
## Solving "Unexpected token < <!DOCTYPE is not valid JSON" Error

This guide helps you fix the login error when deploying your attendance system to a cloud server.

---

## 🔍 Quick Diagnosis

**Are you seeing this error when trying to login?**
```
Unexpected token < <!DOCTYPE is not valid JSON
```

**This means:** Your frontend is trying to call the backend API, but the backend server is not responding correctly.

---

## ✅ Step 1: Verify Backend Server is Running

### Test the Backend Health Endpoint

Open your browser and navigate to:
```
http://your-backend-url/api/health
```

**Replace `your-backend-url` with:**
- Railway: `https://your-app.up.railway.app/api/health`
- Heroku: `https://your-app.herokuapp.com/api/health`
- VPS: `http://your-server-ip:3000/api/health`
- Same domain: `https://yourdomain.com/api/health`

### Expected Response ✅
You should see JSON like this:
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T10:20:00.000Z",
  "version": "1.0.0"
}
```

### Wrong Response ❌
If you see:
- **HTML page** → Backend is NOT running or wrong URL
- **404 error** → Backend routes not configured
- **Connection refused** → Server is down
- **CORS error** → CORS not configured properly

---

## 🚀 Step 2: Deploy Backend Server

### Option A: Cloud Platform (Railway, Heroku, Render)

1. **Create a new service/app** on your platform
2. **Connect your GitHub repository**
3. **Set root directory** to `/server` (or configure build command)
4. **Add environment variables:**
   ```
   PORT=3000
   SESSION_SECRET=your-random-secret-key
   NODE_ENV=production
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   ```
5. **Deploy the backend**

### Option B: VPS (DigitalOcean, AWS EC2, etc.)

SSH into your server and run:

```bash
# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Navigate to project
cd /path/to/attendance/server

# Install dependencies
npm install --production

# Create .env file
nano .env
```

Add to `.env`:
```env
PORT=3000
SESSION_SECRET=your-unique-secret-key-here
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

Start the server with PM2:
```bash
sudo npm install -g pm2
pm2 start server.js --name attendance-backend
pm2 save
pm2 startup
```

### Option C: Same Server (Frontend + Backend)

If serving both from same server, use Nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve frontend
    location / {
        root /path/to/attendance;
        index index.html;
        try_files $uri $uri/ =404;
    }

    # Proxy API to backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🌐 Step 3: Configure Frontend

### Scenario 1: Frontend and Backend on SAME Domain ✅ (Recommended)

**Example:**
- Frontend: `https://yourapp.com`
- Backend: `https://yourapp.com/api`

**Configuration needed:** NONE! 
The app will automatically use relative `/api` paths.

### Scenario 2: Frontend and Backend on DIFFERENT Domains

**Example:**
- Frontend hosted on: `https://frontend-host.com`
- Backend hosted on: `https://backend-host.com`

**Configuration needed:** Yes, follow these steps:

1. **Edit `index.html`**

2. **Find this line** (around line 667):
   ```html
   <script src="api-client.js"></script>
   ```

3. **Add this BEFORE that line:**
   ```html
   <script>
       // Configure backend URL for cloud deployment
       window.BACKEND_URL = 'https://your-backend-domain.com/api';
   </script>
   <script src="api-client.js"></script>
   ```

4. **Replace** `https://your-backend-domain.com/api` with your actual backend URL:
   - Railway: `https://your-app.up.railway.app/api`
   - Heroku: `https://your-app.herokuapp.com/api`
   - Custom: `https://api.yourdomain.com/api`

5. **Important:** URL should end with `/api` (no trailing slash)

---

## 🔧 Step 4: Configure CORS (For Separate Domains)

If frontend and backend are on different domains, update backend CORS settings:

### On Backend Server

Edit `.env` file or set environment variable:
```env
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

For multiple domains:
```env
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com,https://app.yourapp.com
```

**Then restart the backend server!**

---

## 🧪 Step 5: Test Your Deployment

### 1. Open Browser DevTools
Press `F12` or right-click → Inspect → Console

### 2. Load Your Frontend
Visit your frontend URL

### 3. Check Console Messages

**You should see:**
```
API Client configured with base URL: https://your-backend.com/api
```

**For localhost, you should also see:**
```
✓ API Server connected: {status: "ok", ...}
```

### 4. Test Login

Try to login with credentials:
- Username: `nodal`
- Password: `nodal@2024`

**Success:** You should be logged in and see the dashboard

**Failure:** Check the error message in the console

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Backend server not accessible"

**Cause:** Backend is not running

**Solutions:**
- ✅ Check if backend server is running (test `/api/health`)
- ✅ Check server logs for errors
- ✅ Ensure PORT environment variable is set
- ✅ Check firewall rules allow port 3000

### Issue 2: "Cannot connect to backend server"

**Cause:** Network/CORS issue

**Solutions:**
- ✅ Check `ALLOWED_ORIGINS` in backend `.env` file
- ✅ Ensure ALLOWED_ORIGINS includes your frontend domain (with https://)
- ✅ Restart backend after changing environment variables
- ✅ Check browser Network tab for CORS errors

### Issue 3: "Unexpected token < <!DOCTYPE"

**Cause:** Still receiving HTML instead of JSON

**Solutions:**
- ✅ Verify backend `/api/health` returns JSON (not HTML)
- ✅ Check `window.BACKEND_URL` is correctly set in `index.html`
- ✅ Clear browser cache and hard refresh (Ctrl+Shift+R)
- ✅ Check Network tab to see what URL is being called

### Issue 4: Login works locally but not in cloud

**Cause:** Environment mismatch or cookies/session issue

**Solutions:**
- ✅ Ensure `NODE_ENV=production` on backend
- ✅ For HTTPS, ensure `secure: true` in cookie settings (done automatically)
- ✅ Check `SESSION_SECRET` is set in production
- ✅ Clear browser cookies for the domain

---

## 📋 Deployment Checklist

Before considering your deployment complete, verify:

### Backend
- [ ] Backend server is running
- [ ] `/api/health` endpoint returns JSON
- [ ] `PORT` environment variable is set
- [ ] `SESSION_SECRET` is set (not default value)
- [ ] `NODE_ENV=production`
- [ ] `ALLOWED_ORIGINS` includes frontend domain(s)
- [ ] Server logs show no errors

### Frontend
- [ ] Frontend files uploaded/deployed
- [ ] `window.BACKEND_URL` configured (if different domain)
- [ ] Can access frontend URL
- [ ] Browser console shows correct API base URL
- [ ] No CORS errors in browser console

### Functionality
- [ ] Login works
- [ ] Can view attendance data
- [ ] Can upload data (for nodal users)
- [ ] Can export data
- [ ] Analytics/dashboard loads

---

## 🆘 Still Having Issues?

### Debug Steps

1. **Check backend logs:**
   ```bash
   # If using PM2
   pm2 logs attendance-backend
   
   # If using cloud platform
   # Check logs in platform dashboard
   ```

2. **Test direct backend call:**
   ```bash
   curl https://your-backend-domain.com/api/health
   ```
   Should return JSON

3. **Check browser Network tab:**
   - Open DevTools → Network tab
   - Try to login
   - Click on the failed request
   - Check:
     - Request URL (is it correct?)
     - Response (HTML vs JSON?)
     - Status code
     - CORS headers

4. **Verify environment variables:**
   On backend server:
   ```bash
   echo $ALLOWED_ORIGINS
   echo $NODE_ENV
   echo $SESSION_SECRET
   ```

---

## 📚 Platform-Specific Guides

### Railway

1. Create new project
2. Deploy from GitHub
3. Set root directory: `/server`
4. Add environment variables in Variables tab
5. Get railway app URL: `https://yourapp.up.railway.app`
6. Configure frontend with this URL

### Vercel (Backend)

Create `vercel.json` in `/server`:
```json
{
  "version": 2,
  "builds": [
    { "src": "server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/server.js" }
  ]
}
```

### Heroku

```bash
# In project root
echo "web: cd server && node server.js" > Procfile
heroku create your-app-name
heroku config:set SESSION_SECRET=your-secret
heroku config:set ALLOWED_ORIGINS=https://your-frontend.com
git push heroku main
```

---

## ✨ Summary

1. **Deploy backend first** → Test `/api/health`
2. **Deploy frontend** → Configure `window.BACKEND_URL` if needed
3. **Set CORS** → Add frontend domain to `ALLOWED_ORIGINS`
4. **Test thoroughly** → Check console, try login
5. **Monitor logs** → Look for errors

If you follow these steps carefully, your deployment should work! 🎉
