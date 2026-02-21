// ========================================
// Custom Filter API Routes
// Handles custom status filters for employees
// ========================================

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const filtersDir = path.join(__dirname, '../data/filters');

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

// Only admin/nodal can manage filters
const requireAdminOrNodal = (req, res, next) => {
    if (!['admin', 'nodal'].includes(req.session.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
};

// ========================================
// GET /api/filters/:date
// Get all filters for a specific date
// ========================================
router.get('/:date', requireAuth, (req, res) => {
    try {
        const { date } = req.params;
        const filePath = path.join(filtersDir, `${date}.json`);

        if (!fs.existsSync(filePath)) {
            return res.json({ filters: {} });
        }

        const filters = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json({ filters });

    } catch (error) {
        console.error('Get filters error:', error);
        res.status(500).json({ error: 'Failed to retrieve filters' });
    }
});

// ========================================
// POST /api/filters
// Apply custom filter to an employee
// ========================================
router.post('/', requireAuth, requireAdminOrNodal, (req, res) => {
    try {
        const { date, attendanceId, filterReason, validFrom, validUntil } = req.body;

        if (!date || !attendanceId || !filterReason) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const filePath = path.join(filtersDir, `${date}.json`);
        let filters = {};

        // Load existing filters
        if (fs.existsSync(filePath)) {
            filters = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        // Add/update filter
        filters[attendanceId] = {
            filterReason,
            validFrom,
            validUntil,
            appliedBy: req.session.user.name,
            appliedAt: new Date().toISOString()
        };

        // Save filters
        fs.writeFileSync(filePath, JSON.stringify(filters, null, 2));

        res.json({ success: true, message: 'Filter applied successfully' });

    } catch (error) {
        console.error('Apply filter error:', error);
        res.status(500).json({ error: 'Failed to apply filter' });
    }
});

// ========================================
// DELETE /api/filters/:date/:attendanceId
// Remove custom filter from an employee
// ========================================
router.delete('/:date/:attendanceId', requireAuth, requireAdminOrNodal, (req, res) => {
    try {
        const { date, attendanceId } = req.params;
        const filePath = path.join(filtersDir, `${date}.json`);

        if (!fs.existsSync(filePath)) {
            return res.json({ success: true, message: 'No filters found for this date' });
        }

        let filters = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (filters[attendanceId]) {
            delete filters[attendanceId];
            fs.writeFileSync(filePath, JSON.stringify(filters, null, 2));
        }

        res.json({ success: true, message: 'Filter removed successfully' });

    } catch (error) {
        console.error('Remove filter error:', error);
        res.status(500).json({ error: 'Failed to remove filter' });
    }
});

// ========================================
// GET /api/filters/reasons
// Get custom filter reasons list
// ========================================
router.get('/reasons/list', requireAuth, (req, res) => {
    try {
        const reasonsPath = path.join(filtersDir, 'custom_reasons.json');

        if (!fs.existsSync(reasonsPath)) {
            // Default reasons
            const defaultReasons = [
                'On Tour',
                'Treasury Inspection',
                'Training',
                'Medical Leave',
                'Official Duty'
            ];
            fs.writeFileSync(reasonsPath, JSON.stringify(defaultReasons, null, 2));
            return res.json({ reasons: defaultReasons });
        }

        const reasons = JSON.parse(fs.readFileSync(reasonsPath, 'utf8'));
        res.json({ reasons });

    } catch (error) {
        console.error('Get reasons error:', error);
        res.status(500).json({ error: 'Failed to retrieve reasons' });
    }
});

// ========================================
// POST /api/filters/reasons
// Add custom filter reason
// ========================================
router.post('/reasons/add', requireAuth, requireAdminOrNodal, (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Reason is required' });
        }

        const reasonsPath = path.join(filtersDir, 'custom_reasons.json');
        let reasons = [];

        if (fs.existsSync(reasonsPath)) {
            reasons = JSON.parse(fs.readFileSync(reasonsPath, 'utf8'));
        }

        if (!reasons.includes(reason)) {
            reasons.push(reason);
            fs.writeFileSync(reasonsPath, JSON.stringify(reasons, null, 2));
        }

        res.json({ success: true, reasons });

    } catch (error) {
        console.error('Add reason error:', error);
        res.status(500).json({ error: 'Failed to add reason' });
    }
});

module.exports = router;
