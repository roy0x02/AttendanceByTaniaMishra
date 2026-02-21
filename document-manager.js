// ========================================
// Document Manager Module
// Handles PDF document upload and storage for custom filtered employees
// ========================================

const DocumentManager = {
    // Storage keys
    storageKey: 'attendance_documents',
    maxFileSize: 5 * 1024 * 1024, // 5MB limit per file

    // Initialize document manager
    init() {
        console.log('Document Manager initialized');
    },

    // Get all documents from localStorage
    getAllDocuments() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : {};
    },

    // Save documents to localStorage
    saveDocuments(documents) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(documents));
            return { success: true };
        } catch (error) {
            console.error('Error saving documents:', error);
            if (error.name === 'QuotaExceededError') {
                return {
                    success: false,
                    error: 'Storage quota exceeded. Please delete some documents or use smaller files.'
                };
            }
            return { success: false, error: error.message };
        }
    },

    // Validate PDF file
    validatePDFFile(file) {
        // Check if file exists
        if (!file) {
            return { valid: false, error: 'No file selected' };
        }

        // Check file type
        const validTypes = ['application/pdf'];
        const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (!isPDF) {
            return { valid: false, error: 'Only PDF files are allowed' };
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            const maxSizeMB = (this.maxFileSize / (1024 * 1024)).toFixed(2);
            return {
                valid: false,
                error: `File size (${sizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
            };
        }

        return { valid: true };
    },

    // Upload document for an employee
    async uploadDocument(date, attendanceId, file) {
        // Validate file
        const validation = this.validatePDFFile(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        try {
            // Read file as base64
            const base64Content = await this.fileToBase64(file);

            // Get current user
            const currentUser = AuthManager.getCurrentUser();

            // Get all documents
            const allDocuments = this.getAllDocuments();

            // Initialize date if not exists
            if (!allDocuments[date]) {
                allDocuments[date] = {};
            }

            // Store document
            allDocuments[date][attendanceId] = {
                filename: file.name,
                content: base64Content,
                uploadedBy: currentUser ? currentUser.username : 'unknown',
                uploadedAt: new Date().toISOString(),
                size: file.size
            };

            // Save to localStorage
            const saveResult = this.saveDocuments(allDocuments);
            if (!saveResult.success) {
                return saveResult;
            }

            return {
                success: true,
                message: 'Document uploaded successfully',
                filename: file.name
            };

        } catch (error) {
            console.error('Error uploading document:', error);
            return { success: false, error: 'Failed to upload document: ' + error.message };
        }
    },

    // Convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                // Extract base64 content (remove data:application/pdf;base64, prefix)
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };

            reader.onerror = (error) => {
                reject(error);
            };

            reader.readAsDataURL(file);
        });
    },

    // Get document for an employee
    getDocument(date, attendanceId) {
        const allDocuments = this.getAllDocuments();
        return allDocuments[date]?.[attendanceId] || null;
    },

    // Check if document exists
    hasDocument(date, attendanceId) {
        return this.getDocument(date, attendanceId) !== null;
    },

    // Delete document
    deleteDocument(date, attendanceId) {
        const allDocuments = this.getAllDocuments();

        if (allDocuments[date] && allDocuments[date][attendanceId]) {
            delete allDocuments[date][attendanceId];

            // Clean up empty date entries
            if (Object.keys(allDocuments[date]).length === 0) {
                delete allDocuments[date];
            }

            const saveResult = this.saveDocuments(allDocuments);
            if (!saveResult.success) {
                return saveResult;
            }

            return { success: true, message: 'Document deleted successfully' };
        }

        return { success: false, error: 'Document not found' };
    },

    // Get document as downloadable blob
    getDocumentBlob(date, attendanceId) {
        const document = this.getDocument(date, attendanceId);
        if (!document) {
            return null;
        }

        // Convert base64 to blob
        const byteCharacters = atob(document.content);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'application/pdf' });
    },

    // Download document
    downloadDocument(date, attendanceId) {
        const document = this.getDocument(date, attendanceId);
        if (!document) {
            alert('Document not found');
            return;
        }

        const blob = this.getDocumentBlob(date, attendanceId);
        if (!blob) {
            alert('Failed to retrieve document');
            return;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // View document in new tab
    viewDocument(date, attendanceId) {
        const document = this.getDocument(date, attendanceId);
        if (!document) {
            alert('Document not found');
            return;
        }

        const blob = this.getDocumentBlob(date, attendanceId);
        if (!blob) {
            alert('Failed to retrieve document');
            return;
        }

        // Open in new tab
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');

        // Clean up after a delay
        setTimeout(() => URL.revokeObjectURL(url), 100);
    },

    // Get storage usage statistics
    getStorageStats() {
        const allDocuments = this.getAllDocuments();
        let totalDocuments = 0;
        let totalSize = 0;

        Object.values(allDocuments).forEach(dateDocuments => {
            Object.values(dateDocuments).forEach(doc => {
                totalDocuments++;
                totalSize += doc.size || 0;
            });
        });

        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

        // Estimate localStorage usage (localStorage typically has 5-10MB limit)
        const estimatedStorageLimit = 5 * 1024 * 1024; // 5MB typical limit
        const usagePercentage = ((totalSize / estimatedStorageLimit) * 100).toFixed(1);

        return {
            totalDocuments,
            totalSize,
            totalSizeMB,
            usagePercentage,
            estimatedLimit: (estimatedStorageLimit / (1024 * 1024)).toFixed(0) + 'MB'
        };
    },

    // Clear all documents (useful when quota is exceeded)
    clearAllDocuments() {
        try {
            localStorage.removeItem(this.storageKey);
            return {
                success: true,
                message: 'All documents cleared successfully'
            };
        } catch (error) {
            console.error('Error clearing documents:', error);
            return {
                success: false,
                error: 'Failed to clear documents: ' + error.message
            };
        }
    }
};
