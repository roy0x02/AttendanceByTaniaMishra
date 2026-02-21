# Deployment Guide - Attendance Management System

## Overview

This system now includes a backend server to enable cloud deployment with data sharing across devices and browsers.

## Architecture

- **Frontend**: Static HTML/CSS/JavaScript files
- **Backend**: Node.js/Express server with JSON file storage
- **Data Storage**: JSON files (easily upgradeable to database)

## Local Development

### Prerequisites

- Node.js 14+ installed
- npm (comes with Node.js)

### Quick Start

1. **Install backend dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Start the backend server** (Terminal 1):
   ```bash
   cd server
   node server.js
   ```
   Server will run on `http://localhost:3000`

3. **Start the frontend server** (Terminal 2):
   ```bash
   python3 -m http.server 8000
   ```
   Frontend will run on `http://localhost:8000`

4. **Access the application**:
   Open your browser to `http://localhost:8000`

### Using the Start Script (Mac/Linux)

We've provided a convenient start script:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

This will start both servers automatically.

## Cloud Deployment

### Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc.)

1. **Setup server**:
   ```bash
   # SSH into your server
   ssh user@your-server-ip

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Clone/upload your code
   # ...

   # Install dependencies
   cd server
   npm install --production
   ```

2. **Configure environment**:
   ```bash
   cd server
   cp .env.example .env
   nano .env  # Edit with your settings
   ```

   ```env
   PORT=3000
   SESSION_SECRET=your-unique-secret-key-here
   NODE_ENV=production
   ```

3. **Install PM2 (Process Manager)**:
   ```bash
   sudo npm install -g pm2

   # Start server
   cd server
   pm2 start server.js --name attendance-backend

   # Auto-restart on reboot
   pm2 startup
   pm2 save
   ```

4. **Setup Nginx reverse proxy**:
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

       # Proxy API requests to backend
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

5. **Enable HTTPS with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

### Option 2: Heroku Deployment

1. **Create `Procfile` in project root**:
   ```
   web: cd server && node server.js
   ```

2. **Deploy**:
   ```bash
   heroku create your-app-name
   heroku config:set SESSION_SECRET=your-secret-key
   git push heroku main
   ```

### Option 3: Railway / Render

These platforms auto-detect Node.js apps:

1. Connect your Git repository
2. Set build command: `cd server && npm install`
3. Set start command: `cd server && node server.js`
4. Add environment variables in dashboard

## Data Persistence

### Current Setup (JSON Files)

- Data stored in `server/data/` directory
- **Backup recommendation**: Regular backups of `server/data/` folder

### Upgrading to Database (Future)

To upgrade to PostgreSQL/MySQL/MongoDB:

1. Install database adapter:
   ```bash
   npm install pg  # for PostgreSQL
   # or
   npm install mysql2  # for MySQL
   # or
   npm install mongodb  # for MongoDB
   ```

2. Replace file operations in API routes with database queries

3. Update deployment to include database service

## Security Considerations

### For Production:

1. Change `SESSION_SECRET` to a strong random string
2. Enable HTTPS (required for secure cookies)
3. Set `NODE_ENV=production`
4. Configure CORS to only allow your domain
5. Add rate limiting (install `express-rate-limit`)
6. Consider adding password hashing (install `bcrypt`)

### Recommended Security Updates

```javascript
// In server.js, add rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Monitoring

### Check Server Health

```bash
# Check if backend is running
curl http://localhost:3000/api/health

# Check PM2 status
pm2 status

# View logs
pm2 logs attendance-backend
```

## Troubleshooting

### Backend not connecting

1. Check if server is running: `curl http://localhost:3000/api/health`
2. Check console for errors
3. Verify CORS settings in `server.js`

### Sessions not persisting

1. Ensure cookies are enabled in browser
2. Check HTTPS is enabled (required for secure cookies in production)
3. Verify `SESSION_SECRET` is set

### Data not syncing across devices

1. Confirm both devices are accessing the same server URL
2. Check network connectivity
3. Verify backend server is accessible from both devices

## Migration from localStorage

Existing data in localStorage will NOT automatically transfer to the server. To migrate:

1. Export data from old system (use Export button)
2. Re-upload attendance files through the new system
3. Custom filters and documents must be recreated

## Support

For issues or questions, refer to the implementation plan or check server logs.
