// ========================================
// Document API Routes
// Handles document upload/download for employees
// ========================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const documentsDir = path.join(__dirname, '../data/documents');

// Configure multer for document uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, documentsDir);
    },
    filename: (req, file, cb) => {
        const { date, attendanceId } = req.body;
        const ext = path.extname(file.originalname);
        cb(null, `${date}_${attendanceId}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

// Only admin/nodal can upload documents
const requireAdminOrNodal = (req, res, next) => {
    if (!['admin', 'nodal'].includes(req.session.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
};

// ========================================
// POST /api/documents
// Upload document for an employee
// ========================================
router.post('/', requireAuth, requireAdminOrNodal, upload.single('document'), (req, res) => {
    try {
        const { date, attendanceId } = req.body;

        if (!date || !attendanceId) {
            return res.status(400).json({ error: 'Date and attendance ID required' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Document file is required' });
        }

        // Save metadata
        const metadataPath = path.join(documentsDir, 'metadata.json');
        let metadata = {};

        if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }

        const key = `${date}_${attendanceId}`;
        metadata[key] = {
            originalName: req.file.originalname,
            uploadedBy: req.session.user.name,
            uploadedAt: new Date().toISOString(),
            size: req.file.size
        };

        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        res.json({
            success: true,
            message: 'Document uploaded successfully',
            filename: req.file.filename
        });

    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

// ========================================
// GET /api/documents/:date/:attendanceId
// Get document for an employee
// ========================================
router.get('/:date/:attendanceId', requireAuth, (req, res) => {
    try {
        const { date, attendanceId } = req.params;

        // Find document file
        const files = fs.readdirSync(documentsDir);
        const documentFile = files.find(f => f.startsWith(`${date}_${attendanceId}.`));

        if (!documentFile) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const filePath = path.join(documentsDir, documentFile);

        // Get metadata
        const metadataPath = path.join(documentsDir, 'metadata.json');
        let originalName = documentFile;

        if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const key = `${date}_${attendanceId}`;
            if (metadata[key]) {
                originalName = metadata[key].originalName;
            }
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Get document error:', error);
        res.status(500).json({ error: 'Failed to retrieve document' });
    }
});

// ========================================
// DELETE /api/documents/:date/:attendanceId
// Delete document for an employee
// ========================================
router.delete('/:date/:attendanceId', requireAuth, requireAdminOrNodal, (req, res) => {
    try {
        const { date, attendanceId } = req.params;

        // Find and delete document file
        const files = fs.readdirSync(documentsDir);
        const documentFile = files.find(f => f.startsWith(`${date}_${attendanceId}.`));

        if (documentFile) {
            fs.unlinkSync(path.join(documentsDir, documentFile));
        }

        // Remove from metadata
        const metadataPath = path.join(documentsDir, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
            let metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const key = `${date}_${attendanceId}`;
            if (metadata[key]) {
                delete metadata[key];
                fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            }
        }

        res.json({ success: true, message: 'Document deleted successfully' });

    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

// ========================================
// GET /api/documents/check/:date/:attendanceId
// Check if document exists
// ========================================
router.get('/check/:date/:attendanceId', requireAuth, (req, res) => {
    try {
        const { date, attendanceId } = req.params;
        const files = fs.readdirSync(documentsDir);
        const documentExists = files.some(f => f.startsWith(`${date}_${attendanceId}.`));

        res.json({ exists: documentExists });

    } catch (error) {
        console.error('Check document error:', error);
        res.status(500).json({ error: 'Failed to check document' });
    }
});

module.exports = router;
