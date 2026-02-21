// ========================================
// File Uploader Module
// Handles file upload interface and processing
// ========================================

const FileUploader = {
    uploadHistory: [],

    // Initialize file uploader
    init() {
        this.setupDropzone();
        this.loadUploadHistory();
        this.renderUploadHistory();
    },

    // Setup drag-and-drop zone
    setupDropzone() {
        const dropzone = document.getElementById('uploadDropzone');
        const fileInput = document.getElementById('fileInput');

        if (!dropzone || !fileInput) return;

        // Click to browse
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        // File selection (supports multiple files)
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.handleMultipleFiles(files);
            }
            // Reset input so same files can be selected again
            fileInput.value = '';
        });

        // Drag and drop events
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-over');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.handleMultipleFiles(files);
            }
        });
    },

    // Handle multiple files sequentially
    async handleMultipleFiles(files) {
        const results = [];
        const errors = [];

        this.showProgress();
        const status = document.getElementById('uploadStatus');
        const fill = document.getElementById('progressFill');

        for (let i = 0; i < files.length; i++) {
            if (status) {
                status.textContent = `Processing file ${i + 1} of ${files.length}: ${files[i].name}...`;
            }
            if (fill) {
                fill.style.width = `${((i) / files.length) * 100}%`;
            }

            try {
                const result = await this.handleFile(files[i]);
                if (result) results.push(result);
            } catch (err) {
                errors.push({ filename: files[i].name, error: err.message });
            }
        }

        // Show final summary
        if (files.length > 1) {
            this.showMultiUploadSummary(results, errors);
        }

        // Refresh current view if on attendance page
        if (document.getElementById('attendanceView').classList.contains('active')) {
            window.App.loadAttendanceData();
        }
    },

    // Handle single file upload — returns result or null
    async handleFile(file) {
        // Validate file type - Accept both Excel and CSV
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'application/csv'
        ];

        const isExcel = file.name.match(/\.(xlsx|xls)$/i);
        const isCSV = file.name.match(/\.csv$/i);

        if (!validTypes.includes(file.type) && !isExcel && !isCSV) {
            this.showError(`${file.name}: Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file`);
            return null;
        }

        // Extract date from filename
        let uploadDate = CONFIG.settings.defaultDate;
        let dateMatch;

        if (isCSV) {
            dateMatch = file.name.match(/(\d{2}-\d{2}-\d{4})\.csv$/i);
        } else {
            dateMatch = file.name.match(/(\d{2}-\d{2}-\d{4})/);
        }

        if (dateMatch) {
            const parts = dateMatch[1].split('-');
            uploadDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
            this.showError(`${file.name}: Filename must include date in DD-MM-YYYY format`);
            return null;
        }

        try {
            // Process the file based on type
            const result = await DataProcessor.processAttendanceFile(file, uploadDate, isCSV);

            // Add to upload history
            this.addToHistory({
                filename: file.name,
                date: uploadDate,
                uploadTime: new Date().toISOString(),
                recordCount: result.totalRecords,
                present: result.present,
                absent: result.absent
            });

            // Show success for single file upload
            this.showSuccess(result);

            return result;

        } catch (error) {
            console.error('Upload error:', error);
            let errorMsg = `${file.name}: Failed to process - ${error.message}`;

            if (error.name === 'QuotaExceededError') {
                errorMsg = 'Storage quota exceeded. Please clear old attendance data and try again.';
            }

            this.showError(errorMsg);
            return null;
        }
    },

    // Show upload progress
    showProgress() {
        const progress = document.getElementById('uploadProgress');
        const fill = document.getElementById('progressFill');
        const status = document.getElementById('uploadStatus');

        if (progress) {
            progress.style.display = 'block';
            status.textContent = 'Processing file...';
            fill.style.width = '0%';
        }
    },

    // Show success message
    showSuccess(result) {
        const progress = document.getElementById('uploadProgress');
        const fill = document.getElementById('progressFill');
        const status = document.getElementById('uploadStatus');

        if (progress) {
            fill.style.width = '100%';

            let message = `✓ Successfully uploaded for ${result.date}! `;

            if (result.mode) {
                const modeText = result.mode === 'EXPLICIT' ? 'Status-based' : 'Time-based';
                message += `[${modeText} mode] `;
            }

            message += `Processed ${result.totalRecords} records `;
            message += `(${result.present} present, ${result.absent} absent)`;

            if (result.autoMarkedAbsent && result.autoMarkedAbsent > 0) {
                message += `. Auto-marked ${result.autoMarkedAbsent} employees as absent.`;
            }

            status.textContent = message;
            status.style.color = 'var(--success)';

            setTimeout(() => {
                progress.style.display = 'none';
                fill.style.width = '0%';
                status.textContent = 'Processing...';
                status.style.color = '';
            }, 5000);
        }
    },

    // Show summary for multiple file uploads
    showMultiUploadSummary(results, errors) {
        const progress = document.getElementById('uploadProgress');
        const fill = document.getElementById('progressFill');
        const status = document.getElementById('uploadStatus');

        if (progress) {
            fill.style.width = '100%';

            const totalRecords = results.reduce((sum, r) => sum + r.totalRecords, 0);
            const totalPresent = results.reduce((sum, r) => sum + r.present, 0);
            const totalAbsent = results.reduce((sum, r) => sum + r.absent, 0);

            let message = `✓ Uploaded ${results.length} file(s): ${totalRecords} total records (${totalPresent} present, ${totalAbsent} absent)`;

            if (errors.length > 0) {
                message += ` | ✗ ${errors.length} file(s) failed`;
            }

            status.textContent = message;
            status.style.color = errors.length > 0 ? 'var(--warning)' : 'var(--success)';

            setTimeout(() => {
                progress.style.display = 'none';
                fill.style.width = '0%';
                status.textContent = 'Processing...';
                status.style.color = '';
            }, 8000);
        }
    },

    // Show error message
    showError(message) {
        const progress = document.getElementById('uploadProgress');
        const status = document.getElementById('uploadStatus');

        if (progress) {
            progress.style.display = 'block';
            status.textContent = '✗ ' + message;
            status.style.color = 'var(--danger)';

            setTimeout(() => {
                progress.style.display = 'none';
                status.textContent = 'Processing...';
                status.style.color = '';
            }, 3000);
        }
    },

    // Add to upload history
    addToHistory(record) {
        this.uploadHistory.unshift(record);
        // Keep only last 20 uploads
        this.uploadHistory = this.uploadHistory.slice(0, 20);
        this.saveUploadHistory();
        this.renderUploadHistory();
    },

    // Save upload history to localStorage
    saveUploadHistory() {
        localStorage.setItem(CONFIG.storageKeys.uploadHistory,
            JSON.stringify(this.uploadHistory));
    },

    // Load upload history from localStorage
    loadUploadHistory() {
        const saved = localStorage.getItem(CONFIG.storageKeys.uploadHistory);
        if (saved) {
            this.uploadHistory = JSON.parse(saved);
        }
    },

    renderUploadHistory() {
        const container = document.getElementById('uploadHistoryList');
        if (!container) return;

        if (this.uploadHistory.length === 0) {
            container.innerHTML = '<p class="text-muted">No upload history</p>';
            return;
        }

        container.innerHTML = this.uploadHistory.map(record => {
            const uploadDate = new Date(record.uploadTime);
            const formattedDate = uploadDate.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="history-item">
                    <div class="history-item-info">
                        <div class="history-item-name">${record.filename}</div>
                        <div class="history-item-meta">
                            ${formattedDate} • ${record.recordCount} records
                            • ${record.present} present, ${record.absent} absent
                        </div>
                    </div>
                    <button class="btn-delete-upload" onclick="App.deleteAttendanceByDate('${record.date}')" title="Delete attendance data for ${record.date}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');
    }
};
