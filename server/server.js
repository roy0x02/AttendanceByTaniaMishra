// ========================================
// Main Express Server
// Handles API requests for attendance system
// ========================================

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Import route modules
const authRoutes = require('./api/authRoutes');
const attendanceRoutes = require('./api/attendanceRoutes');
const filterRoutes = require('./api/filterRoutes');
const documentRoutes = require('./api/documentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// Middleware
// ========================================

// CORS - Allow frontend to access API
// In production, set ALLOWED_ORIGINS environment variable to your frontend domain(s)
// Example: ALLOWED_ORIGINS=https://your-app.com,https://www.your-app.com
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session management
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========================================
// Data Directory Setup
// ========================================

const dataDir = path.join(__dirname, 'data');
const attendanceDir = path.join(dataDir, 'attendance');
const filtersDir = path.join(dataDir, 'filters');
const documentsDir = path.join(dataDir, 'documents');

// Ensure data directories exist
[dataDir, attendanceDir, filtersDir, documentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ========================================
// API Routes
// ========================================

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/documents', documentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ========================================
// Error Handling
// ========================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
    console.log('========================================');
    console.log('Attendance System Backend Server');
    console.log('========================================');
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Data directory: ${dataDir}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
    console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
