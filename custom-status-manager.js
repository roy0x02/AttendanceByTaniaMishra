// ========================================
// Custom Status Manager Module
// Handles custom absence reasons (excused absences)
// ========================================

const CustomStatusManager = {
    // Load custom reasons from localStorage
    loadCustomReasons() {
        const stored = localStorage.getItem(CONFIG.storageKeys.customAbsenceReasons);
        return stored ? JSON.parse(stored) : ['On Tour', 'Treasury Inspection', 'Official Meeting'];
    },

    // Save custom reasons to localStorage
    saveCustomReasons(reasons) {
        localStorage.setItem(CONFIG.storageKeys.customAbsenceReasons, JSON.stringify(reasons));
    },

    // Add a new custom reason
    addCustomReason(reason) {
        const reasons = this.loadCustomReasons();
        const trimmedReason = reason.trim();

        if (!trimmedReason) {
            return { success: false, error: 'Reason cannot be empty' };
        }

        if (reasons.includes(trimmedReason)) {
            return { success: false, error: 'This reason already exists' };
        }

        reasons.push(trimmedReason);
        this.saveCustomReasons(reasons);
        return { success: true };
    },

    // Delete a custom reason
    deleteCustomReason(reason) {
        const reasons = this.loadCustomReasons();
        const filtered = reasons.filter(r => r !== reason);
        this.saveCustomReasons(filtered);
        return { success: true };
    },

    // ========================================
    // CUSTOM FILTER MANAGEMENT
    // ========================================

    // Storage key for custom filters
    customFiltersStorageKey: 'attendance_custom_filters',

    // Get all custom filters
    getAllCustomFilters() {
        const stored = localStorage.getItem(this.customFiltersStorageKey);
        return stored ? JSON.parse(stored) : {};
    },

    // Save custom filters
    saveAllCustomFilters(filters) {
        localStorage.setItem(this.customFiltersStorageKey, JSON.stringify(filters));
    },

    // Apply custom filter to an employee
    applyCustomFilter(date, attendanceId, filterReason, validFrom, validUntil) {
        const currentUser = AuthManager.getCurrentUser();

        if (!currentUser) {
            return { success: false, error: 'User not logged in' };
        }

        // Only nodal and admin can apply filters
        if (!AuthManager.isAdminOrNodal()) {
            return { success: false, error: 'Only nodal officers and admins can apply custom filters' };
        }

        // Validate date range if provided
        if (validFrom && validUntil) {
            const fromDate = new Date(validFrom);
            const untilDate = new Date(validUntil);
            if (fromDate > untilDate) {
                return { success: false, error: '"Valid From" date must be before or equal to "Valid Until" date' };
            }
        }

        const allFilters = this.getAllCustomFilters();

        // Initialize date if not exists
        if (!allFilters[date]) {
            allFilters[date] = {};
        }

        // Apply filter with date range
        allFilters[date][attendanceId] = {
            filterReason: filterReason,
            appliedBy: currentUser.username,
            appliedAt: new Date().toISOString(),
            validFrom: validFrom || date, // Default to current date
            validUntil: validUntil || null // null means permanent filter
        };

        this.saveAllCustomFilters(allFilters);

        return { success: true, message: 'Custom filter applied successfully' };
    },

    // Remove custom filter from an employee
    removeCustomFilter(date, attendanceId) {
        const allFilters = this.getAllCustomFilters();

        if (allFilters[date] && allFilters[date][attendanceId]) {
            delete allFilters[date][attendanceId];

            // Clean up empty date entries
            if (Object.keys(allFilters[date]).length === 0) {
                delete allFilters[date];
            }

            this.saveAllCustomFilters(allFilters);
            return { success: true, message: 'Custom filter removed successfully' };
        }

        return { success: false, error: 'No filter found for this employee' };
    },

    // Get custom filter for a specific employee
    getCustomFilter(date, attendanceId) {
        const allFilters = this.getAllCustomFilters();
        return allFilters[date]?.[attendanceId] || null;
    },

    // Check if employee has custom filter
    hasCustomFilter(date, attendanceId) {
        return this.getCustomFilter(date, attendanceId) !== null;
    },

    // Get all filtered employees for a date
    getFilteredEmployees(date) {
        const allFilters = this.getAllCustomFilters();
        return allFilters[date] || {};
    },

    // Get filtered employees count for a date
    getFilteredCount(date) {
        const filtered = this.getFilteredEmployees(date);
        return Object.keys(filtered).length;
    },

    // Check if a filter is currently valid based on date range
    isFilterValid(viewDate, filter) {
        if (!filter) return false;

        const viewDateObj = new Date(viewDate);
        const validFrom = filter.validFrom ? new Date(filter.validFrom) : null;
        const validUntil = filter.validUntil ? new Date(filter.validUntil) : null;

        // Check if viewDate is within valid range
        if (validFrom && viewDateObj < validFrom) {
            return false; // Not yet valid
        }

        if (validUntil && viewDateObj > validUntil) {
            return false; // Expired
        }

        return true; // Valid
    },

    // Get only valid filters for a specific date
    getValidFiltersForDate(date) {
        const allFilters = this.getFilteredEmployees(date);
        const validFilters = {};

        for (const [attendanceId, filter] of Object.entries(allFilters)) {
            if (this.isFilterValid(date, filter)) {
                validFilters[attendanceId] = filter;
            }
        }

        return validFilters;
    },

    // Get expired filters for a date (for cleanup/review)
    getExpiredFiltersForDate(date) {
        const allFilters = this.getFilteredEmployees(date);
        const expiredFilters = {};

        for (const [attendanceId, filter] of Object.entries(allFilters)) {
            if (!this.isFilterValid(date, filter)) {
                expiredFilters[attendanceId] = filter;
            }
        }

        return expiredFilters;
    },

    // Apply excuse reason to attendance records
    applyExcuseReason(date, employeeIds, reason) {
        const records = DataProcessor.getAttendanceForDate(date);
        let modified = false;

        records.forEach(record => {
            if (employeeIds.includes(record.attendanceId) && record.status === 'Absent') {
                record.absenceReason = reason;
                modified = true;
            }
        });

        if (modified) {
            DataProcessor.attendanceByDate[date] = records;
            DataProcessor.saveToLocalStorage();
        }

        return { success: true, modifiedCount: employeeIds.length };
    },

    // Remove excuse reason from attendance records
    removeExcuseReason(date, employeeIds) {
        const records = DataProcessor.getAttendanceForDate(date);
        let modified = false;

        records.forEach(record => {
            if (employeeIds.includes(record.attendanceId) && record.absenceReason) {
                delete record.absenceReason;
                modified = true;
            }
        });

        if (modified) {
            DataProcessor.attendanceByDate[date] = records;
            DataProcessor.saveToLocalStorage();
        }

        return { success: true };
    },

    // Get all absent employees for a date
    getAbsentEmployees(date) {
        const records = DataProcessor.getAttendanceForDate(date);
        const filteredRecords = AuthManager.filterAttendanceByPermissions(records);
        return filteredRecords.filter(r => r.status === 'Absent');
    },

    // Render custom reasons list in UI
    renderCustomReasonsList(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const reasons = this.loadCustomReasons();

        if (reasons.length === 0) {
            container.innerHTML = '<p class="text-muted">No custom reasons added yet</p>';
            return;
        }

        container.innerHTML = reasons.map(reason => `
            <div class="reason-item">
                <span class="reason-text">${reason}</span>
                <button class="btn-delete-reason" onclick="CustomStatusManager.handleDeleteReason('${reason}')" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `).join('');
    },

    // Handle delete reason button click
    handleDeleteReason(reason) {
        if (!confirm(`Are you sure you want to delete "${reason}"?`)) {
            return;
        }

        const result = this.deleteCustomReason(reason);
        if (result.success) {
            this.renderCustomReasonsList('customReasonsList');
            console.log(`Deleted custom reason: ${reason}`);
        }
    },

    // Handle add reason form submission
    handleAddReason() {
        const input = document.getElementById('newReasonInput');
        if (!input) return;

        const reason = input.value;
        const result = this.addCustomReason(reason);

        if (result.success) {
            input.value = '';
            this.renderCustomReasonsList('customReasonsList');
            this.populateReasonDropdown('excuseReasonSelect');
            console.log(`Added custom reason: ${reason}`);
        } else {
            alert(result.error);
        }
    },

    // Populate reason dropdown in modal/UI
    populateReasonDropdown(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const reasons = this.loadCustomReasons();

        select.innerHTML = '<option value="">-- Select Reason --</option>' +
            reasons.map(reason => `<option value="${reason}">${reason}</option>`).join('');
    }
};
