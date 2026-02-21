// ========================================
// Reports View Module
// Handles report generation UI and interactions
// ========================================

const ReportsView = {
    currentReportData: null,
    currentUser: null,

    /**
     * Initialize reports view
     */
    init(currentUser) {
        this.currentUser = currentUser;
        this.setupEventListeners();
        this.initializeDateRange();
        this.updateViewModeVisibility();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Report type change
        document.querySelectorAll('input[name="reportType"]').forEach(radio => {
            radio.addEventListener('change', () => this.handleReportTypeChange());
        });

        // View mode change (for nodal/admin)
        const viewModeRadios = document.querySelectorAll('input[name="viewMode"]');
        if (viewModeRadios.length > 0) {
            viewModeRadios.forEach(radio => {
                radio.addEventListener('change', () => this.handleViewModeChange());
            });
        }

        // Generate report button
        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateReport());
        }

        // Export PDF button
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportToPDF());
        }

        // Date range changes
        document.getElementById('reportStartDate')?.addEventListener('change', () => {
            // Clear preview when date changes
            this.currentReportData = null;
        });
        document.getElementById('reportEndDate')?.addEventListener('change', () => {
            this.currentReportData = null;
        });
    },

    /**
     * Initialize date range to last 30 days
     */
    initializeDateRange() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const startInput = document.getElementById('reportStartDate');
        const endInput = document.getElementById('reportEndDate');

        if (startInput) {
            startInput.value = startDate.toISOString().split('T')[0];
        }
        if (endInput) {
            endInput.value = endDate.toISOString().split('T')[0];
        }
    },

    /**
     * Update view mode visibility based on user role
     */
    updateViewModeVisibility() {
        const viewModeSection = document.getElementById('viewModeSection');
        if (!viewModeSection) return;

        // Only show view mode for nodal/admin
        if (this.currentUser.role === 'nodal' || this.currentUser.role === 'admin') {
            viewModeSection.style.display = 'block';
        } else {
            viewModeSection.style.display = 'none';
        }
    },

    /**
     * Handle report type change
     */
    handleReportTypeChange() {
        // Clear current preview
        this.currentReportData = null;
        this.renderPreview([]);
    },

    /**
     * Handle view mode change
     */
    handleViewModeChange() {
        // Clear current preview
        this.currentReportData = null;
        this.renderPreview([]);
    },

    /**
     * Generate report
     */
    async generateReport() {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const reportType = document.querySelector('input[name="reportType"]:checked')?.value;
        const viewMode = document.querySelector('input[name="viewMode"]:checked')?.value || 'individual';

        // Validation
        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('Start date must be before end date');
            return;
        }

        if (!reportType) {
            alert('Please select a report type');
            return;
        }

        // Show loading
        const generateBtn = document.getElementById('generateReportBtn');
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<span>Generating...</span>';
        generateBtn.disabled = true;

        try {
            let reportData;

            if (viewMode === 'bo-wise' && (this.currentUser.role === 'nodal' || this.currentUser.role === 'admin')) {
                // Generate BO-wise report
                reportData = ReportsEngine.generateBOWiseReport(startDate, endDate, reportType);
            } else {
                // Generate individual employee report
                const userSections = this.currentUser.role === 'bo' ? this.currentUser.sections : [];

                if (reportType === 'failures') {
                    reportData = ReportsEngine.analyzeAttendanceFailures(
                        startDate,
                        endDate,
                        this.currentUser.role,
                        userSections
                    );
                } else if (reportType === 'performers') {
                    reportData = ReportsEngine.analyzeBestPerformers(
                        startDate,
                        endDate,
                        this.currentUser.role,
                        userSections
                    );
                } else if (reportType === 'duration') {
                    reportData = ReportsEngine.analyzeOfficeDuration(
                        startDate,
                        endDate,
                        this.currentUser.role,
                        userSections
                    );
                }
            }

            this.currentReportData = {
                data: reportData,
                type: reportType,
                viewMode: viewMode,
                dateRange: { start: startDate, end: endDate }
            };

            this.renderPreview(reportData);

            // Enable export button
            const exportBtn = document.getElementById('exportPdfBtn');
            if (exportBtn) {
                exportBtn.disabled = false;
            }

        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error generating report. Please try again.');
        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    },

    /**
     * Render report preview
     */
    renderPreview(reportData) {
        const previewContainer = document.getElementById('reportPreview');
        if (!previewContainer) return;

        if (!reportData || reportData.length === 0) {
            previewContainer.innerHTML = `
                <div class="empty-message">
                    <p>No data available for the selected criteria</p>
                    <small>Try selecting a different date range or report type</small>
                </div>
            `;
            return;
        }

        const reportType = this.currentReportData?.type;
        const viewMode = this.currentReportData?.viewMode || 'individual';

        let tableHTML;

        if (viewMode === 'bo-wise') {
            tableHTML = this.renderBOWisePreview(reportData, reportType);
        } else {
            tableHTML = this.renderIndividualPreview(reportData, reportType);
        }

        previewContainer.innerHTML = tableHTML;
    },

    /**
     * Render individual employee preview
     */
    renderIndividualPreview(reportData, reportType) {
        let headers, rowsHTML;

        switch (reportType) {
            case 'failures':
                headers = '<th>Sl No</th><th>Name</th><th>Designation</th><th>Section</th><th>Total Days</th><th>Absent Days</th><th>Failure Rate</th>';
                rowsHTML = reportData.slice(0, 100).map((emp, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${emp.name}</td>
                        <td>${emp.designation}</td>
                        <td>${emp.section}</td>
                        <td>${emp.totalDays}</td>
                        <td class="text-danger">${emp.absentDays}</td>
                        <td><span class="badge badge-danger">${emp.failureRate}%</span></td>
                    </tr>
                `).join('');
                break;

            case 'performers':
                headers = '<th>Sl No</th><th>Name</th><th>Designation</th><th>Section</th><th>Total Days</th><th>Present Days</th><th>Attendance %</th>';
                rowsHTML = reportData.slice(0, 100).map((emp, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${emp.name}</td>
                        <td>${emp.designation}</td>
                        <td>${emp.section}</td>
                        <td>${emp.totalDays}</td>
                        <td class="text-success">${emp.presentDays}</td>
                        <td><span class="badge badge-success">${emp.attendanceRate}%</span></td>
                    </tr>
                `).join('');
                break;

            case 'duration':
                headers = '<th>Sl No</th><th>Name</th><th>Designation</th><th>Section</th><th>Days with Data</th><th>Avg Duration</th>';
                rowsHTML = reportData.slice(0, 100).map((emp, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${emp.name}</td>
                        <td>${emp.designation}</td>
                        <td>${emp.section}</td>
                        <td>${emp.daysWithTime}</td>
                        <td><span class="badge badge-info">${emp.avgDurationFormatted}</span></td>
                    </tr>
                `).join('');
                break;

            default:
                return '<p>Unknown report type</p>';
        }

        const limitMessage = reportData.length > 100 ?
            `<p class="text-muted" style="margin-top: 1rem;">Showing top 100 of ${reportData.length} records. PDF will include all records.</p>` : '';

        return `
            <table class="report-table">
                <thead>
                    <tr>${headers}</tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>
            ${limitMessage}
        `;
    },

    /**
     * Render BO-wise preview
     */
    renderBOWisePreview(reportData, reportType) {
        let headers, rowsHTML;

        switch (reportType) {
            case 'failures':
                headers = '<th>Sl No</th><th>Branch Officer</th><th>Total Employees</th><th>Total Absent Days</th><th>Avg Failure Rate</th>';
                rowsHTML = reportData.map((bo, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${bo.boName}</td>
                        <td>${bo.totalEmployees}</td>
                        <td class="text-danger">${bo.totalAbsentDays}</td>
                        <td><span class="badge badge-danger">${bo.avgFailureRate}%</span></td>
                    </tr>
                `).join('');
                break;

            case 'performers':
                headers = '<th>Sl No</th><th>Branch Officer</th><th>Total Employees</th><th>Total Present Days</th><th>Avg Attendance %</th>';
                rowsHTML = reportData.map((bo, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${bo.boName}</td>
                        <td>${bo.totalEmployees}</td>
                        <td class="text-success">${bo.totalPresentDays}</td>
                        <td><span class="badge badge-success">${bo.avgAttendanceRate}%</span></td>
                    </tr>
                `).join('');
                break;

            case 'duration':
                headers = '<th>Sl No</th><th>Branch Officer</th><th>Total Employees</th><th>Avg Office Duration</th>';
                rowsHTML = reportData.map((bo, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${bo.boName}</td>
                        <td>${bo.totalEmployees}</td>
                        <td><span class="badge badge-info">${bo.avgDuration}</span></td>
                    </tr>
                `).join('');
                break;

            default:
                return '<p>Unknown report type</p>';
        }

        return `
            <table class="report-table">
                <thead>
                    <tr>${headers}</tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>
        `;
    },

    /**
     * Export to PDF
     */
    async exportToPDF() {
        if (!this.currentReportData) {
            alert('Please generate a report first');
            return;
        }

        const exportBtn = document.getElementById('exportPdfBtn');
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<span>Exporting...</span>';
        exportBtn.disabled = true;

        try {
            await PDFGenerator.generateAttendanceReportPDF(
                this.currentReportData.data,
                this.currentReportData.type,
                this.currentReportData.dateRange,
                this.currentReportData.viewMode,
                this.currentUser.role,
                this.currentUser.name
            );
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Error exporting PDF. Please try again.');
        } finally {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }
    }
};
