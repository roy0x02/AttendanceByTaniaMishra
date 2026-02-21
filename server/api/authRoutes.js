// ========================================
// Authentication API Routes
// Handles login, logout, and session management
// ========================================

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Load user credentials from parent directory
const configPath = path.join(__dirname, '../../config.js');
let USER_CONFIG = {};

// Load config dynamically
try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    // Extract USER_CONFIG from the file
    const match = configContent.match(/const USER_CONFIG = ({[\s\S]*?});/);
    if (match) {
        USER_CONFIG = eval(`(${match[1]})`);
    }
} catch (error) {
    console.error('Error loading config:', error);
}

// ========================================
// POST /api/auth/login
// Authenticate user and create session
// ========================================
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Username and password are required'
        });
    }

    // Check credentials
    const user = USER_CONFIG[username];

    if (!user || user.password !== password) {
        return res.status(401).json({
            success: false,
            error: 'Invalid username or password'
        });
    }

    // Create session
    req.session.user = {
        username: username,
        name: user.name,
        role: user.role,
        sections: user.sections || []
    };

    res.json({
        success: true,
        user: req.session.user
    });
});

// ========================================
// POST /api/auth/logout
// End user session
// ========================================
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Failed to logout'
            });
        }
        res.json({ success: true });
    });
});

// ========================================
// GET /api/auth/session
// Check current session status
// ========================================
router.get('/session', (req, res) => {
    if (req.session.user) {
        res.json({
            loggedIn: true,
            user: req.session.user
        });
    } else {
        res.json({
            loggedIn: false
        });
    }
});

module.exports = router;
