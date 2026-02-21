// ========================================
// Main Application Controller
// Integrates all modules and manages UI
// ========================================

const App = {
    currentView: 'attendance',
    currentDate: null,

    // Initialize application
    async init() {
        console.log('Initializing Attendance Management System...');

        // Set current date
        this.currentDate = CONFIG.settings.defaultDate;

        // Check authentication
        const isLoggedIn = await AuthManager.init();

        if (isLoggedIn) {
            // User is already logged in, show dashboard
            await this.showDashboard();
        } else {
            // Show login page
            this.showLogin();
        }

        // Setup event listeners
        this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Date filter
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.value = this.currentDate;
            dateFilter.addEventListener('change', (e) => {
                this.currentDate = e.target.value;
                this.loadAttendanceData();
            });
        }

        // Search and filters
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.applyFilters();
            });
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        const sectionFilter = document.getElementById('sectionFilter');
        if (sectionFilter) {
            sectionFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportAttendance();
            });
        }

        // Send Message button
        const sendMessageBtn = document.getElementById('sendMessageBtn');
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => {
                this.showMessageComposer();
            });
        }

        // Analytics date range - only attach event listeners here.
        // Values are seeded in showDashboard() after data is loaded.
        const analyticsStartDate = document.getElementById('analyticsStartDate');
        const analyticsEndDate = document.getElementById('analyticsEndDate');

        if (analyticsStartDate && analyticsEndDate) {
            analyticsStartDate.addEventListener('change', () => {
                this.updateAnalytics();
            });

            analyticsEndDate.addEventListener('change', () => {
                this.updateAnalytics();
            });
        }
    },

    // Handle login
    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        const result = await AuthManager.login(username, password);

        if (result.success) {
            // Clear form
            document.getElementById('loginForm').reset();
            errorDiv.style.display = 'none';

            // Show dashboard
            await this.showDashboard();
        } else {
            // Show error
            errorDiv.textContent = result.error;
            errorDiv.style.display = 'block';
        }
    },

    // Handle logout
    async handleLogout() {
        await AuthManager.logout();
        this.showLogin();
    },

    // Show login page
    showLogin() {
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('dashboardPage').classList.remove('active');
    },

    // Show dashboard
    async showDashboard() {
        // Initialize data processor
        await DataProcessor.init();

        // Update UI with user info
        const user = AuthManager.getCurrentUser();
        document.getElementById('userDisplayName').textContent = user.name;
        document.getElementById('userRole').textContent = user.role.toUpperCase();

        // Configure menu based on role
        this.configureMenuForRole(user.role);

        // Load attendance data
        await this.loadAttendanceData();

        // Initialize file uploader for nodal only (not admin)
        if (user.role === 'nodal') {
            FileUploader.init();
        }

        // Initialize analytics for admin/nodal
        if (AuthManager.isAdminOrNodal()) {
            // Seed analytics date range to last available data (not today which may have no data)
            const lastDate = this.getLastAvailableDate();
            const startEl = document.getElementById('analyticsStartDate');
            const endEl = document.getElementById('analyticsEndDate');
            if (startEl && endEl) {
                endEl.value = lastDate;
                startEl.value = this.getDateNDaysBack(lastDate, 6);
            }
            Analytics.initCharts();
        }

        // Show dashboard page
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('dashboardPage').classList.add('active');
    },

    // Configure menu based on user role
    configureMenuForRole(role) {
        const uploadMenuItem = document.getElementById('uploadMenuItem');
        const analyticsMenuItem = document.getElementById('analyticsMenuItem');
        const reportsMenuItem = document.getElementById('reportsMenuItem');

        // Reports menu is visible for all roles
        if (reportsMenuItem) {
            reportsMenuItem.style.display = 'flex';
        }

        if (role === 'nodal') {
            // Nodal can upload, view analytics, and send messages
            uploadMenuItem.style.display = 'flex';
            analyticsMenuItem.style.display = 'flex';
            const sendMsgBtn = document.getElementById('sendMessageBtn');
            if (sendMsgBtn) sendMsgBtn.style.display = 'inline-flex';
        } else if (role === 'admin') {
            // Admin can view analytics and send messages but not upload
            uploadMenuItem.style.display = 'none';
            analyticsMenuItem.style.display = 'flex';
            const sendMsgBtn = document.getElementById('sendMessageBtn');
            if (sendMsgBtn) sendMsgBtn.style.display = 'inline-flex';
        } else {
            // BO can only view attendance and reports
            uploadMenuItem.style.display = 'none';
            analyticsMenuItem.style.display = 'none';
            const sendMsgBtn = document.getElementById('sendMessageBtn');
            if (sendMsgBtn) sendMsgBtn.style.display = 'none';
        }

        // Note: View visibility is handled by switchView() using the 'active' class
    },

    // Switch view
    switchView(viewName) {
        // Update menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            }
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(viewName + 'View');
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;

            // Load data for the view
            if (viewName === 'analytics') {
                // On first open, seed date inputs to last available date range so charts aren't blank
                const startEl = document.getElementById('analyticsStartDate');
                const endEl = document.getElementById('analyticsEndDate');
                if (startEl && endEl) {
                    // Safety net: if inputs are empty (shouldn't happen after showDashboard seeding),
                    // default to last available date
                    if (!startEl.value || !endEl.value) {
                        const lastDate = this.getLastAvailableDate();
                        endEl.value = lastDate;
                        startEl.value = this.getDateNDaysBack(lastDate, 6);
                    }
                }
                this.updateAnalytics();
            } else if (viewName === 'upload') {
                // Initialize custom reasons list for nodal
                const user = AuthManager.getCurrentUser();
                if (user && user.role === 'nodal') {
                    CustomStatusManager.renderCustomReasonsList('customReasonsList');
                }
            } else if (viewName === 'reports') {
                // Initialize reports view
                const user = AuthManager.getCurrentUser();
                if (user) {
                    ReportsView.init(user);
                }
            }
        }
    },

    // Load attendance data
    async loadAttendanceData() {
        const attendance = DataProcessor.getAttendanceForDate(this.currentDate);

        // Filter by user permissions
        let filteredAttendance = AuthManager.filterAttendanceByPermissions(attendance);

        // Update subtitle
        const subtitle = document.getElementById('attendanceSubtitle');
        const user = AuthManager.getCurrentUser();
        if (subtitle) {
            if (user.role === 'bo') {
                const sectionCount = user.sections?.length || 0;
                if (sectionCount === 0) {
                    subtitle.textContent = 'No sections assigned';
                } else if (sectionCount === 1) {
                    subtitle.textContent = `Viewing: ${user.sections[0]}`;
                } else {
                    subtitle.textContent = `Viewing ${sectionCount} sections`;
                }
            } else {
                subtitle.textContent = 'View daily attendance records';
            }
        }

        // Update table headers based on user role
        this.updateTableHeaders();

        // Populate section filter (pass ALL records including unmapped for the dropdown count)
        this.populateSectionFilter(filteredAttendance);

        // By default, hide unmapped employees (they only show when filter is selected)
        const sectionFilter = document.getElementById('sectionFilter');
        const currentSectionValue = sectionFilter ? sectionFilter.value : 'all';
        if (currentSectionValue !== '__UNMAPPED__') {
            filteredAttendance = filteredAttendance.filter(r => !r.isUnmapped);
        }

        // Display data
        this.displayAttendance(filteredAttendance);

        // Update statistics
        this.updateStatistics(filteredAttendance);
    },

    // Update table headers based on user role
    updateTableHeaders() {
        const thead = document.getElementById('attendanceTableHead');
        if (!thead) return;

        const isNodalOrAdmin = AuthManager.isAdminOrNodal();
        const headerRow = thead.querySelector('tr');

        // Check if Actions column already exists
        const existingActionsHeader = Array.from(headerRow.children).find(th => th.textContent === 'Actions');

        if (isNodalOrAdmin && !existingActionsHeader) {
            // Add Actions header for nodal/admin
            const actionsHeader = document.createElement('th');
            actionsHeader.textContent = 'Actions';
            headerRow.appendChild(actionsHeader);
        } else if (!isNodalOrAdmin && existingActionsHeader) {
            // Remove Actions header for BO users
            existingActionsHeader.remove();
        }
    },

    // Populate section filter dropdown
    populateSectionFilter(attendance) {
        const sectionFilter = document.getElementById('sectionFilter');
        if (!sectionFilter) return;

        // Count unmapped employees
        const unmappedCount = attendance.filter(a => a.isUnmapped).length;

        // Get unique sections (excluding unmapped ones for normal list)
        const sections = [...new Set(attendance.filter(a => !a.isUnmapped).map(a => a.section))].sort();

        // Preserve current selection
        const currentValue = sectionFilter.value;

        // Clear and repopulate
        sectionFilter.innerHTML = '<option value="all">All Sections</option>';

        // Add Unmapped option at the top if there are unmapped employees
        if (unmappedCount > 0) {
            const unmappedOption = document.createElement('option');
            unmappedOption.value = '__UNMAPPED__';
            unmappedOption.textContent = `⚠ Unmapped (${unmappedCount})`;
            unmappedOption.style.color = '#e67e22';
            sectionFilter.appendChild(unmappedOption);
        }

        sections.forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = section;
            sectionFilter.appendChild(option);
        });

        // Restore previous selection if it still exists
        if (currentValue && [...sectionFilter.options].some(o => o.value === currentValue)) {
            sectionFilter.value = currentValue;
        }
    },

    // Display attendance table
    displayAttendance(records) {
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) return;

        // Store globally for modal access
        window.currentAttendanceData = records;

        const currentUser = AuthManager.getCurrentUser();
        const isNodalOrAdmin = AuthManager.isAdminOrNodal();

        if (records.length === 0) {
            const colspanCount = isNodalOrAdmin ? 10 : 9; // Extra column for actions if nodal/admin
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="${colspanCount}">
                        <div class="empty-message">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <p>No attendance data available</p>
                            <small>Please select a date or upload attendance data</small>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = records.map((record, index) => {
            // Check for custom filter and validate date range
            const customFilter = CustomStatusManager.getCustomFilter(this.currentDate, record.attendanceId);
            const isFilterValid = customFilter && CustomStatusManager.isFilterValid(this.currentDate, customFilter);
            const hasDocument = DocumentManager.hasDocument(this.currentDate, record.attendanceId);

            // Determine row class (yellow if custom filtered AND currently valid)
            const rowClass = isFilterValid ? 'filtered-row' : '';

            // Determine status class and text
            let statusClass, statusText;
            if (isFilterValid) {
                // Custom filter status - yellow badge (only if currently valid)
                statusClass = 'status-custom-filter';
                statusText = customFilter.filterReason;
            } else if (record.absenceReason) {
                // Excused absence - yellow badge (legacy)
                statusClass = 'status-excused';
                statusText = record.absenceReason;
            } else {
                // Regular status - green or red
                statusClass = record.status === 'Marked Attendance' ? 'status-present' : 'status-absent';
                statusText = record.status;
            }

            // Document column HTML
            let documentHtml = '';
            if (hasDocument) {
                documentHtml = `
                    <button class="btn-icon" onclick="DocumentManager.viewDocument('${this.currentDate}', '${record.attendanceId}')" title="View Document">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                            <line x1="9" y1="11" x2="13" y2="11"></line>
                        </svg>
                    </button>
                `;
            } else {
                documentHtml = '<span class="text-muted">-</span>';
            }

            // Actions column for nodal/admin
            let actionsHtml = '';
            if (isNodalOrAdmin) {
                if (customFilter) {
                    // Show remove filter button
                    actionsHtml = `
                        <button class="btn-action btn-remove-filter" 
                                onclick="App.removeCustomFilter('${record.attendanceId}')" 
                                title="Remove Custom Filter">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    `;
                } else {
                    // Show apply filter button
                    actionsHtml = `
                        <button class="btn-action btn-apply-filter" 
                                onclick="App.showCustomFilterModal('${record.attendanceId}', '${record.name.replace(/'/g, "\\'")}', '${record.section}')" 
                                title="Apply Custom Filter">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                            </svg>
                        </button>
                    `;
                }
            }

            return `
                <tr class="${rowClass}">
                    <td>${index + 1}</td>
                    <td><strong>${record.name}</strong></td>
                    <td>${record.designation}</td>
                    <td>${record.section}</td>
                    <td>${record.phoneNumber || '-'}</td>
                    <td>${record.education || '-'}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            <span class="status-indicator"></span>
                            ${statusText}
                        </span>
                    </td>
                    <td>${record.inTime}</td>
                    <td>${record.outTime}</td>
                    <td>${record.duration}</td>
                    <td class="document-cell">${documentHtml}</td>
                    ${isNodalOrAdmin ? `<td class="actions-cell">${actionsHtml}</td>` : ''}
                </tr>
            `;
        }).join('');
    },

    // Update statistics
    updateStatistics(records) {
        const stats = DataProcessor.calculateStats(records);

        document.getElementById('statPresent').textContent = stats.present;
        document.getElementById('statAbsent').textContent = stats.absent;
        document.getElementById('statTotal').textContent = stats.total;
        document.getElementById('statPercentage').textContent = stats.percentage + '%';
    },

    // Apply filters
    applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const sectionFilter = document.getElementById('sectionFilter').value;

        // Get base attendance data
        let attendance = DataProcessor.getAttendanceForDate(this.currentDate);
        attendance = AuthManager.filterAttendanceByPermissions(attendance);

        // Apply section filter (handle unmapped specially)
        if (sectionFilter === '__UNMAPPED__') {
            // Show only unmapped employees
            attendance = attendance.filter(record => record.isUnmapped);
        } else if (sectionFilter !== 'all') {
            // Normal section filter — also exclude unmapped
            attendance = attendance.filter(record => record.section === sectionFilter && !record.isUnmapped);
        } else {
            // "All Sections" — hide unmapped by default
            attendance = attendance.filter(record => !record.isUnmapped);
        }

        // Apply search filter
        if (searchTerm) {
            attendance = attendance.filter(record =>
                record.name.toLowerCase().includes(searchTerm) ||
                record.designation.toLowerCase().includes(searchTerm)
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            const status = statusFilter === 'present' ? 'Marked Attendance' : 'Not Marked Attendance';
            attendance = attendance.filter(record => record.status === status);
        }

        // Display filtered results
        this.displayAttendance(attendance);
        this.updateStatistics(attendance);
    },


    // Export attendance to Excel
    exportAttendance() {
        // Get attendance data for current date
        const attendance = DataProcessor.getAttendanceForDate(this.currentDate);
        const filteredAttendance = AuthManager.filterAttendanceByPermissions(attendance);

        if (filteredAttendance.length === 0) {
            alert('No attendance data available for export');
            return;
        }

        // CSV Headers - add custom filter and document columns
        const headers = [
            'Sl. No.',
            'Name',
            'Designation',
            'Section',
            'Phone Number',
            'Education',
            'Group',
            'Status',
            'Custom Filter',
            'Filter Valid From',
            'Filter Valid Until',
            'Document',
            'In Time',
            'Out Time',
            'Duration'
        ];

        // Helper function to escape CSV values
        const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return '"' + stringValue.replace(/"/g, '""') + '"';
            }
            return stringValue;
        };

        // Build CSV content
        let csvContent = '';

        // Add title row
        const user = AuthManager.getCurrentUser();
        const dateFormatted = new Date(this.currentDate).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        csvContent += `Attendance Report - ${dateFormatted}\n`;
        csvContent += `Generated for: ${user.name} (${user.role.toUpperCase()})\n`;
        csvContent += `Generated on: ${new Date().toLocaleString('en-IN')}\n`;
        csvContent += `\n`; // Empty line

        // Add headers
        csvContent += headers.map(h => escapeCSV(h)).join(',') + '\n';

        // Add data rows
        filteredAttendance.forEach((record, index) => {
            // Check for custom filter
            const customFilter = CustomStatusManager.getCustomFilter(this.currentDate, record.attendanceId);
            const hasDocument = DocumentManager.hasDocument(this.currentDate, record.attendanceId);

            const row = [
                index + 1,
                record.name,
                record.designation,
                record.section,
                record.phoneNumber || '-',
                record.education || '-',
                record.group || 'N/A',
                record.status,
                customFilter ? customFilter.filterReason : '-',
                customFilter ? (customFilter.validFrom || '-') : '-',
                customFilter ? (customFilter.validUntil || 'Permanent') : '-',
                hasDocument ? 'Yes' : 'No',
                record.inTime || '-',
                record.outTime || '-',
                record.duration || '-'
            ];
            csvContent += row.map(cell => escapeCSV(cell)).join(',') + '\n';
        });

        // Add summary at the end
        const stats = DataProcessor.calculateStats(filteredAttendance);
        csvContent += '\n'; // Empty line
        csvContent += 'Summary\n';
        csvContent += `Total Employees,${stats.total}\n`;
        csvContent += `Marked Attendance,${stats.present}\n`;
        csvContent += `Not Marked Attendance,${stats.absent}\n`;
        csvContent += `Attendance Percentage,${stats.percentage}%\n`;

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        // Format filename: attendance_YYYY-MM-DD_role.csv
        const dateStr = this.currentDate.replace(/-/g, '');
        const roleStr = user.role === 'bo' ? `BO_${user.sections[0] || 'all'}` : user.role;
        const filename = `attendance_${this.currentDate}_${roleStr}.csv`;

        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();

        // Show success message
        console.log(`Exported ${filteredAttendance.length} records to ${filename}`);
    },

    // Update analytics dashboard
    updateAnalytics() {
        const startEl = document.getElementById('analyticsStartDate');
        const endEl = document.getElementById('analyticsEndDate');
        let startDate = startEl?.value;
        let endDate = endEl?.value;

        // Validate date range
        if (!startDate || !endDate) {
            console.warn('Analytics: no date range selected, defaulting to last available date');
            const lastDate = this.getLastAvailableDate();
            const firstDate = this.getDateNDaysBack(lastDate, 6);
            if (startEl) startEl.value = firstDate;
            if (endEl) endEl.value = lastDate;
            Analytics.updateAnalytics(firstDate, lastDate);
            return;
        }

        // Validate start date is before or equal to end date
        if (new Date(startDate) > new Date(endDate)) {
            console.warn('Start date must be before or equal to end date');
            alert('Start date must be before or equal to end date');
            return;
        }

        // Auto-correct: if the selected range has no data, fall back to last available range
        const rangeHasData = DataProcessor.getTrendDataForRange(startDate, endDate).length > 0;
        if (!rangeHasData && Object.keys(DataProcessor.attendanceByDate).length > 0) {
            console.warn('Analytics: no data for selected range, switching to last available date range');
            const lastDate = this.getLastAvailableDate();
            const firstDate = this.getDateNDaysBack(lastDate, 6);
            if (startEl) startEl.value = firstDate;
            if (endEl) endEl.value = lastDate;
            startDate = firstDate;
            endDate = lastDate;
        }

        // Update analytics with date range
        console.log('Updating analytics for date range:', startDate, 'to', endDate);
        Analytics.updateAnalytics(startDate, endDate);
    },

    // Get the most recent date that has attendance data loaded
    getLastAvailableDate() {
        const dates = Object.keys(DataProcessor.attendanceByDate || {});
        if (dates.length === 0) {
            return this.currentDate || CONFIG.settings.defaultDate;
        }
        // Sort ascending and return the last (most recent)
        return dates.sort().pop();
    },

    // Return a date string N days before the given YYYY-MM-DD date string
    getDateNDaysBack(dateStr, n) {
        const d = new Date(dateStr);
        d.setDate(d.getDate() - n);
        return d.toISOString().split('T')[0];
    },

    // ========================================
    // CUSTOM FILTER MANAGEMENT
    // ========================================

    // Show custom filter modal
    showCustomFilterModal(attendanceId, employeeName, section) {
        // Store current selection
        this.currentFilterEmployee = {
            attendanceId: attendanceId,
            name: employeeName,
            section: section
        };

        // Update modal content
        document.getElementById('filterEmployeeName').textContent = employeeName;
        document.getElementById('filterEmployeeSection').textContent = section;

        // Populate filter reason dropdown
        const filterReasonSelect = document.getElementById('filterReasonSelect');
        const customReasons = CustomStatusManager.loadCustomReasons();

        filterReasonSelect.innerHTML = '<option value="">-- Select Reason --</option>' +
            customReasons.map(reason => `<option value="${reason}">${reason}</option>`).join('');

        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const defaultUntil = new Date();
        defaultUntil.setDate(defaultUntil.getDate() + 7); // Default: 7 days from now

        document.getElementById('filterValidFrom').value = today;
        document.getElementById('filterValidUntil').value = defaultUntil.toISOString().split('T')[0];

        // Clear file input
        const fileInput = document.getElementById('filterDocumentFile');
        if (fileInput) {
            fileInput.value = '';
        }

        // Show modal
        document.getElementById('customFilterModal').style.display = 'block';
    },

    // Close custom filter modal
    closeCustomFilterModal() {
        document.getElementById('customFilterModal').style.display = 'none';
        this.currentFilterEmployee = null;
    },

    // Apply custom filter
    async applyCustomFilter() {
        if (!this.currentFilterEmployee) {
            alert('No employee selected');
            return;
        }

        const filterReason = document.getElementById('filterReasonSelect').value;
        const validFrom = document.getElementById('filterValidFrom').value;
        const validUntil = document.getElementById('filterValidUntil').value;
        const documentFile = document.getElementById('filterDocumentFile').files[0];

        if (!filterReason) {
            alert('Please select a filter reason');
            return;
        }

        if (!validFrom) {
            alert('Please select a "Valid From" date');
            return;
        }

        try {
            // Apply the custom filter with date range
            const filterResult = CustomStatusManager.applyCustomFilter(
                this.currentDate,
                this.currentFilterEmployee.attendanceId,
                filterReason,
                validFrom,
                validUntil || null  // null if empty = permanent filter
            );

            if (!filterResult.success) {
                alert('Error applying filter: ' + filterResult.error);
                return;
            }

            // Upload document if provided
            if (documentFile) {
                const uploadResult = await DocumentManager.uploadDocument(
                    this.currentDate,
                    this.currentFilterEmployee.attendanceId,
                    documentFile
                );

                if (!uploadResult.success) {
                    alert('Filter applied but document upload failed: ' + uploadResult.error);
                }
            }

            // Close modal and refresh view
            this.closeCustomFilterModal();
            this.loadAttendanceData();

            // Show success message
            console.log(`Custom filter "${filterReason}" applied to ${this.currentFilterEmployee.name}`);
        } catch (error) {
            console.error('Error applying custom filter:', error);
            alert('Failed to apply custom filter: ' + error.message);
        }
    },

    // Remove custom filter
    removeCustomFilter(attendanceId) {
        if (!confirm('Remove custom filter from this employee?')) {
            return;
        }

        try {
            const result = CustomStatusManager.removeCustomFilter(this.currentDate, attendanceId);

            if (result.success) {
                // Reload attendance data
                this.loadAttendanceData();
                console.log('Custom filter removed');
            } else {
                alert('Error removing filter: ' + result.error);
            }
        } catch (error) {
            console.error('Error removing custom filter:', error);
            alert('Failed to remove custom filter: ' + error.message);
        }
    },

    // ========================================
    // MESSAGE COMPOSER
    // ========================================

    // Show message composer
    showMessageComposer() {
        // Populate section dropdown
        const messageSection = document.getElementById('messageSection');
        const attendance = DataProcessor.getAttendanceForDate(this.currentDate);
        const sections = [...new Set(attendance.map(r => r.section))].sort();

        messageSection.innerHTML = '<option value="">-- Select Section --</option>' +
            sections.map(section => `<option value="${section}">${section}</option>`).join('');

        // Clear previous selections
        document.getElementById('messageFilterType').value = '';
        document.getElementById('messageContent').value = '';
        document.getElementById('recipientsList').innerHTML = '';
        document.getElementById('recipientCount').textContent = '0';
        document.getElementById('messageCharCount').textContent = '0';
        document.getElementById('messageSectionGroup').style.display = 'none';

        // Show modal
        document.getElementById('messageComposerModal').style.display = 'block';

        // Add character count listener
        const messageContent = document.getElementById('messageContent');
        messageContent.addEventListener('input', () => {
            document.getElementById('messageCharCount').textContent = messageContent.value.length;
        });
    },

    // Close message composer
    closeMessageComposer() {
        document.getElementById('messageComposerModal').style.display = 'none';
    },

    // Update message recipients based on filter
    updateMessageRecipients() {
        const filterType = document.getElementById('messageFilterType').value;
        const attendance = DataProcessor.getAttendanceForDate(this.currentDate);
        const filteredAttendance = AuthManager.filterAttendanceByPermissions(attendance);

        let recipients = [];

        if (filterType === 'absent') {
            recipients = filteredAttendance.filter(r => r.status === 'Not Marked Attendance');
        } else if (filterType === 'present') {
            recipients = filteredAttendance.filter(r => r.status === 'Marked Attendance');
        } else if (filterType === 'custom_filtered') {
            recipients = filteredAttendance.filter(r => {
                const filter = CustomStatusManager.getCustomFilter(this.currentDate, r.attendanceId);
                return CustomStatusManager.isFilterValid(this.currentDate, filter);
            });
        } else if (filterType === 'section') {
            document.getElementById('messageSectionGroup').style.display = 'block';
            const selectedSection = document.getElementById('messageSection').value;
            if (selectedSection) {
                recipients = filteredAttendance.filter(r => r.section === selectedSection);
            }
        } else {
            document.getElementById('messageSectionGroup').style.display = 'none';
        }

        // Store recipients globally
        this.messageRecipients = recipients;

        // Display recipients
        const recipientsList = document.getElementById('recipientsList');
        const recipientCount = document.getElementById('recipientCount');

        recipientCount.textContent = recipients.length;

        if (recipients.length === 0) {
            recipientsList.innerHTML = '<p class="text-muted" style="padding: 1rem; text-align: center;">No employees match this filter</p>';
        } else {
            recipientsList.innerHTML = recipients.map(r => `
                <div class="recipient-item">
                    <span class="recipient-name">${r.name}</span>
                    <span class="recipient-phone">${r.phoneNumber || 'No phone number'}</span>
                </div>
            `).join('');
        }
    },

    // Copy message list to clipboard
    copyMessageList() {
        if (!this.messageRecipients || this.messageRecipients.length === 0) {
            alert('No recipients selected');
            return;
        }

        const message = document.getElementById('messageContent').value;
        if (!message) {
            alert('Please write a message first');
            return;
        }

        let text = `Message: ${message}\n\nRecipients (${this.messageRecipients.length}):\n\n`;
        this.messageRecipients.forEach((r, index) => {
            text += `${index + 1}. ${r.name} - ${r.phoneNumber || 'No phone'} (${r.section})\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
            alert('Message list copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy to clipboard');
        });
    },

    // Download message as CSV
    downloadMessageCSV() {
        if (!this.messageRecipients || this.messageRecipients.length === 0) {
            alert('No recipients selected');
            return;
        }

        const message = document.getElementById('messageContent').value;
        const filterType = document.getElementById('messageFilterType').value;

        // CSV Headers
        const headers = ['Sl. No.', 'Name', 'Phone Number', 'Section', 'Designation', 'Message'];

        // Build CSV content
        let csvContent = `Message Recipients - ${new Date(this.currentDate).toLocaleDateString('en-IN')}\n`;
        csvContent += `Filter: ${filterType || 'Custom'}\n`;
        csvContent += `Total Recipients: ${this.messageRecipients.length}\n\n`;
        csvContent += headers.join(',') + '\n';

        this.messageRecipients.forEach((r, index) => {
            const row = [
                index + 1,
                r.name,
                r.phoneNumber || '',
                r.section,
                r.designation,
                message || ''
            ];
            csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });

        // Create download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const filename = `message_recipients_${this.currentDate}_${filterType}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Downloaded message recipients: ${filename}`);
    },

    // ========================================
    // DATA DELETION MANAGEMENT
    // ========================================

    /**
     * Delete all attendance data from the system
     * Only available to Nodal Officer
     */
    async deleteAllData() {
        const user = AuthManager.getCurrentUser();

        // Authorization check
        if (!user || user.role !== 'nodal') {
            alert('Only Nodal Officer can delete data');
            return;
        }

        // Confirmation dialog
        const confirmMessage =
            '⚠️ WARNING: This will permanently delete ALL attendance data!\n\n' +
            'This action cannot be undone and will:\n' +
            '• Delete all attendance records from backend server\n' +
            '• Clear all data from local storage\n' +
            '• Remove all upload history\n\n' +
            'Are you absolutely sure you want to continue?';

        if (!confirm(confirmMessage)) {
            return;
        }

        // Double confirmation
        const doubleConfirm = prompt(
            'Type "DELETE ALL" (in UPPERCASE) to confirm deletion:'
        );

        if (doubleConfirm !== 'DELETE ALL') {
            alert('Deletion cancelled - confirmation text did not match');
            return;
        }

        try {
            // Show progress
            const statusDiv = document.getElementById('uploadStatus');
            const progressDiv = document.getElementById('uploadProgress');

            if (progressDiv && statusDiv) {
                progressDiv.style.display = 'block';
                statusDiv.textContent = 'Deleting all data...';
            }

            // Get all dates from IndexedDB
            const allDates = await StorageManager.getAllDates();

            let deletedCount = 0;
            const failedDates = [];

            // Delete from backend first
            for (const date of allDates) {
                try {
                    await ApiClient.attendance.deleteByDate(date);
                    deletedCount++;
                } catch (error) {
                    console.error(`Failed to delete ${date} from backend:`, error);
                    failedDates.push(date);
                }
            }

            // Clear IndexedDB
            await StorageManager.clearAll();

            // Clear localStorage items
            if (typeof CONFIG !== 'undefined' && CONFIG.storageKeys) {
                localStorage.removeItem(CONFIG.storageKeys.attendanceData);
                localStorage.removeItem(CONFIG.storageKeys.employeeData);
                localStorage.removeItem(CONFIG.storageKeys.uploadHistory);
            }

            // Clear upload history in FileUploader
            if (typeof FileUploader !== 'undefined') {
                FileUploader.uploadHistory = [];
                FileUploader.saveUploadHistory();
                FileUploader.renderUploadHistory();
            }

            // Clear custom filters and documents
            localStorage.removeItem('ams_custom_filters');
            localStorage.removeItem('ams_documents');

            // Reload attendance view
            await this.loadAttendanceData();

            // Show success message
            if (statusDiv && progressDiv) {
                statusDiv.textContent =
                    `✓ Successfully deleted ${deletedCount} dates from backend and cleared all local data!` +
                    (failedDates.length > 0 ? ` (${failedDates.length} dates failed to delete from backend)` : '');
                statusDiv.style.color = 'var(--success)';

                setTimeout(() => {
                    progressDiv.style.display = 'none';
                    statusDiv.textContent = 'Processing...';
                    statusDiv.style.color = '';
                }, 5000);
            }

            console.log(`Deleted all attendance data: ${deletedCount} dates removed from backend`);
            if (failedDates.length > 0) {
                console.warn('Failed to delete from backend:', failedDates);
            }

        } catch (error) {
            console.error('Error deleting all data:', error);
            alert('Failed to delete all data: ' + error.message);

            const statusDiv = document.getElementById('uploadStatus');
            const progressDiv = document.getElementById('uploadProgress');
            if (statusDiv && progressDiv) {
                statusDiv.textContent = '✗ Failed to delete data: ' + error.message;
                statusDiv.style.color = 'var(--danger)';
                setTimeout(() => {
                    progressDiv.style.display = 'none';
                    statusDiv.textContent = 'Processing...';
                    statusDiv.style.color = '';
                }, 5000);
            }
        }
    },

    /**
     * Delete attendance data for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     */
    async deleteAttendanceByDate(date) {
        const user = AuthManager.getCurrentUser();

        // Authorization check
        if (!user || user.role !== 'nodal') {
            alert('Only Nodal Officer can delete data');
            return;
        }

        // Format date for display
        const dateObj = new Date(date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Confirmation dialog
        const confirmMessage =
            `Are you sure you want to delete attendance data for ${formattedDate}?\n\n` +
            'This will:\n' +
            '• Delete the data from backend server\n' +
            '• Remove the data from local storage\n' +
            '• Remove it from upload history\n\n' +
            'This action cannot be undone.';

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            // Show progress
            const statusDiv = document.getElementById('uploadStatus');
            const progressDiv = document.getElementById('uploadProgress');

            if (progressDiv && statusDiv) {
                progressDiv.style.display = 'block';
                statusDiv.textContent = `Deleting data for ${formattedDate}...`;
            }

            // Delete from backend
            await ApiClient.attendance.deleteByDate(date);

            // Delete from IndexedDB
            await StorageManager.deleteAttendance(date);

            // Remove from upload history
            if (typeof FileUploader !== 'undefined') {
                FileUploader.uploadHistory = FileUploader.uploadHistory.filter(
                    record => record.date !== date
                );
                FileUploader.saveUploadHistory();
                FileUploader.renderUploadHistory();
            }

            // Reload attendance if currently viewing this date
            if (this.currentDate === date) {
                await this.loadAttendanceData();
            }

            // Show success message
            if (statusDiv && progressDiv) {
                statusDiv.textContent = `✓ Successfully deleted data for ${formattedDate}`;
                statusDiv.style.color = 'var(--success)';

                setTimeout(() => {
                    progressDiv.style.display = 'none';
                    statusDiv.textContent = 'Processing...';
                    statusDiv.style.color = '';
                }, 3000);
            }

            console.log(`Deleted attendance data for ${date}`);

        } catch (error) {
            console.error(`Error deleting data for ${date}:`, error);
            alert(`Failed to delete data for ${formattedDate}: ` + error.message);

            const statusDiv = document.getElementById('uploadStatus');
            const progressDiv = document.getElementById('uploadProgress');
            if (statusDiv && progressDiv) {
                statusDiv.textContent = '✗ Failed: ' + error.message;
                statusDiv.style.color = 'var(--danger)';
                setTimeout(() => {
                    progressDiv.style.display = 'none';
                    statusDiv.textContent = 'Processing...';
                    statusDiv.style.color = '';
                }, 3000);
            }
        }
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// ========================================
// Employee Attendance Trend Modal
// ========================================

// Global variable to store current attendance for modal access
window.currentAttendanceData = [];

// Global variable for the trend chart instance
let employeeTrendChartInstance = null;

/**
 * Get employee attendance trend across all uploaded dates
 */
function getEmployeeAttendanceTrend(attendanceId) {
    const allDates = Object.keys(DataProcessor.attendanceByDate).sort();
    const trendData = [];

    allDates.forEach(date => {
        const records = DataProcessor.attendanceByDate[date];
        const employeeRecord = records.find(r => String(r.attendanceId) === String(attendanceId));

        if (employeeRecord) {
            trendData.push({
                date: date,
                dateFormatted: new Date(date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short'
                }),
                status: employeeRecord.status,
                isPresent: employeeRecord.status === 'Marked Attendance' ? 1 : 0
            });
        }
    });

    return trendData;
}

/**
 * Show employee trend modal with attendance data
 */
function showEmployeeTrendModal(employeeData) {
    // Get trend data
    const trendData = getEmployeeAttendanceTrend(employeeData.attendanceId);

    // Update modal content
    document.getElementById('modalEmployeeName').textContent = employeeData.name;
    document.getElementById('modalAttendanceId').textContent = employeeData.attendanceId;
    document.getElementById('modalDesignation').textContent = employeeData.designation;
    document.getElementById('modalSection').textContent = employeeData.section;

    // Calculate stats
    const totalDays = trendData.length;
    const presentDays = trendData.filter(d => d.isPresent === 1).length;
    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

    document.getElementById('modalTotalDays').textContent = totalDays;
    document.getElementById('modalPresentDays').textContent = presentDays;
    document.getElementById('modalAttendancePercent').textContent = percentage + '%';

    // Create chart
    createEmployeeTrendChart(trendData, employeeData.name);

    // Show modal
    document.getElementById('employeeTrendModal').style.display = 'block';
}

/**
 * Close employee trend modal
 */
function closeEmployeeTrendModal() {
    document.getElementById('employeeTrendModal').style.display = 'none';
}

/**
 * Create employee trend chart using Chart.js
 */
function createEmployeeTrendChart(trendData, employeeName) {
    const ctx = document.getElementById('employeeTrendChart').getContext('2d');

    // Destroy previous chart if exists
    if (employeeTrendChartInstance) {
        employeeTrendChartInstance.destroy();
    }

    // Check if we have data
    if (trendData.length === 0) {
        ctx.font = '16px Arial';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('No attendance data available for this employee', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    employeeTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.map(d => d.dateFormatted),
            datasets: [{
                label: 'Attendance Status',
                data: trendData.map(d => d.isPresent),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                pointRadius: 6,
                pointBackgroundColor: trendData.map(d => d.isPresent === 1 ? '#10b981' : '#ef4444'),
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                stepped: true,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Attendance Trend - ${employeeName}`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 20
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.parsed.y === 1 ? '✓ Marked Attendance' : '✗ Not Marked Attendance';
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1.1,
                    min: -0.1,
                    ticks: {
                        stepSize: 1,
                        callback: function (value) {
                            return value === 1 ? 'Marked Attendance' : value === 0 ? 'Not Marked Attendance' : '';
                        },
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: '#e2e8f0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

/**
 * Make employee names clickable in the attendance table
 */
function initEmployeeNameClickHandler() {
    const table = document.getElementById('attendanceTable');
    if (!table) return;

    const tbody = table.querySelector('tbody');

    // Use event delegation to handle clicks on name cells
    tbody.addEventListener('click', function (e) {
        const cell = e.target.closest('td');

        // Check if clicked on name column (2nd column, index 1)
        if (cell && cell.cellIndex === 1) {
            const row = cell.closest('tr');

            // Skip if it's the empty state row
            if (row.classList.contains('empty-state')) return;

            // Find the corresponding employee in currentAttendanceData
            const cells = row.querySelectorAll('td');
            const name = cells[1]?.textContent.trim();
            const section = cells[3]?.textContent.trim();

            // Find matching record in current attendance data
            const employeeRecord = window.currentAttendanceData.find(r =>
                r.name === name && r.section === section
            );

            if (employeeRecord) {
                showEmployeeTrendModal({
                    attendanceId: employeeRecord.attendanceId,
                    name: employeeRecord.name,
                    designation: employeeRecord.designation,
                    section: employeeRecord.section
                });
            }
        }
    });
}

// Close modal when clicking outside of it
window.addEventListener('click', function (event) {
    const modal = document.getElementById('employeeTrendModal');
    if (event.target === modal) {
        closeEmployeeTrendModal();
    }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initEmployeeNameClickHandler();
});

