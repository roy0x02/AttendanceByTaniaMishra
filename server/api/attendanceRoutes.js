// ========================================
// Attendance API Routes
// Handles attendance data CRUD operations
// ========================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const upload = multer({
    dest: path.join(__dirname, '../uploads/'),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const attendanceDir = path.join(__dirname, '../data/attendance');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

// ========================================
// POST /api/attendance/upload
// Upload and process attendance file
// ========================================
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const { date } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'File is required' });
        }

        // Only nodal can upload
        if (req.session.user.role !== 'nodal') {
            return res.status(403).json({ error: 'Only nodal officer can upload attendance' });
        }

        // Read uploaded file
        const fileContent = fs.readFileSync(req.file.path);

        // Return file to frontend for processing (frontend has the XLSX library)
        // Frontend will process and send back the processed data
        res.json({
            success: true,
            message: 'File uploaded successfully',
            filename: req.file.originalname,
            date: date
        });

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// ========================================
// POST /api/attendance/save
// Save processed attendance data
// ========================================
router.post('/save', requireAuth, (req, res) => {
    try {
        const { date, attendanceData } = req.body;

        if (!date || !attendanceData) {
            return res.status(400).json({ error: 'Date and attendance data are required' });
        }

        // Only nodal can save
        if (req.session.user.role !== 'nodal') {
            return res.status(403).json({ error: 'Only nodal officer can save attendance' });
        }

        // Save to file
        const filePath = path.join(attendanceDir, `${date}.json`);
        fs.writeFileSync(filePath, JSON.stringify(attendanceData, null, 2));

        res.json({ success: true, message: 'Attendance data saved successfully' });

    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: 'Failed to save attendance data' });
    }
});

// ========================================
// GET /api/attendance/:date
// Get attendance for specific date
// ========================================
router.get('/:date', requireAuth, (req, res) => {
    try {
        const { date } = req.params;
        const filePath = path.join(attendanceDir, `${date}.json`);

        if (!fs.existsSync(filePath)) {
            return res.json({ attendance: [] });
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json({ attendance: data });

    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: 'Failed to retrieve attendance data' });
    }
});

// ========================================
// GET /api/attendance/range/:startDate/:endDate
// Get attendance for date range
// ========================================
router.get('/range/:startDate/:endDate', requireAuth, (req, res) => {
    try {
        const { startDate, endDate } = req.params;
        const allData = {};

        // Read all files in date range
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            const filePath = path.join(attendanceDir, `${dateStr}.json`);

            if (fs.existsSync(filePath)) {
                allData[dateStr] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        }

        res.json({ attendanceByDate: allData });

    } catch (error) {
        console.error('Get range error:', error);
        res.status(500).json({ error: 'Failed to retrieve attendance data' });
    }
});

// ========================================
// DELETE /api/attendance/:date
// Delete attendance for specific date
// ========================================
router.delete('/:date', requireAuth, (req, res) => {
    try {
        const { date } = req.params;

        // Only nodal can delete
        if (req.session.user.role !== 'nodal') {
            return res.status(403).json({ error: 'Only nodal officer can delete attendance' });
        }

        const filePath = path.join(attendanceDir, `${date}.json`);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ success: true, message: 'Attendance data deleted successfully' });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete attendance data' });
    }
});

module.exports = router;
