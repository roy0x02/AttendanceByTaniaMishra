// ========================================
// Reports Engine Module
// Handles attendance analytics and report generation
// ========================================

const ReportsEngine = {
    /**
     * Analyze employees who frequently fail to mark attendance
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {string} userRole - User role (bo/nodal/admin)
     * @param {Array} userSections - User's accessible sections
     * @returns {Array} Employees sorted by failure rate (descending)
     */
    analyzeAttendanceFailures(startDate, endDate, userRole, userSections) {
        const records = DataProcessor.getAttendanceForDateRange(startDate, endDate);
        const employeeStats = {};

        // Aggregate attendance by employee
        records.forEach(record => {
            // Filter by sections if BO role
            if (userRole === 'bo' && userSections && userSections.length > 0 && !userSections.includes(record.section)) {
                return;
            }

            const key = record.attendanceId || record.name;
            if (!employeeStats[key]) {
                employeeStats[key] = {
                    attendanceId: record.attendanceId,
                    name: record.name,
                    designation: record.designation,
                    section: record.section,
                    group: record.group || 'N/A',
                    totalDays: 0,
                    absentDays: 0,
                    presentDays: 0
                };
            }

            employeeStats[key].totalDays++;
            if (record.status === 'Not Marked Attendance') {
                employeeStats[key].absentDays++;
            } else {
                employeeStats[key].presentDays++;
            }
        });

        // Calculate failure rate and convert to array
        const results = Object.values(employeeStats).map(emp => ({
            ...emp,
            failureRate: emp.totalDays > 0 ? ((emp.absentDays / emp.totalDays) * 100).toFixed(1) : 0,
            attendanceRate: emp.totalDays > 0 ? ((emp.presentDays / emp.totalDays) * 100).toFixed(1) : 0
        }));

        // Sort by absent days (descending), then by failure rate
        results.sort((a, b) => {
            if (b.absentDays !== a.absentDays) {
                return b.absentDays - a.absentDays;
            }
            return parseFloat(b.failureRate) - parseFloat(a.failureRate);
        });

        return results;
    },

    /**
     * Analyze best performing employees (highest attendance)
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {string} userRole - User role (bo/nodal/admin)
     * @param {Array} userSections - User's accessible sections
     * @returns {Array} Employees sorted by attendance rate (descending)
     */
    analyzeBestPerformers(startDate, endDate, userRole, userSections) {
        const records = DataProcessor.getAttendanceForDateRange(startDate, endDate);
        const employeeStats = {};

        // Aggregate attendance by employee
        records.forEach(record => {
            // Filter by sections if BO role
            if (userRole === 'bo' && userSections && userSections.length > 0 && !userSections.includes(record.section)) {
                return;
            }

            const key = record.attendanceId || record.name;
            if (!employeeStats[key]) {
                employeeStats[key] = {
                    attendanceId: record.attendanceId,
                    name: record.name,
                    designation: record.designation,
                    section: record.section,
                    group: record.group || 'N/A',
                    totalDays: 0,
                    absentDays: 0,
                    presentDays: 0
                };
            }

            employeeStats[key].totalDays++;
            if (record.status === 'Not Marked Attendance') {
                employeeStats[key].absentDays++;
            } else {
                employeeStats[key].presentDays++;
            }
        });

        // Calculate attendance rate and convert to array
        const results = Object.values(employeeStats).map(emp => ({
            ...emp,
            attendanceRate: emp.totalDays > 0 ? ((emp.presentDays / emp.totalDays) * 100).toFixed(1) : 0
        }));

        // Sort by attendance rate (descending), then by present days
        results.sort((a, b) => {
            if (parseFloat(b.attendanceRate) !== parseFloat(a.attendanceRate)) {
                return parseFloat(b.attendanceRate) - parseFloat(a.attendanceRate);
            }
            return b.presentDays - a.presentDays;
        });

        return results;
    },

    /**
     * Parse duration string to minutes
     * @param {string} durationStr - Duration string like "8h 30m" or "8:30"
     * @returns {number} Duration in minutes, or 0 if invalid
     */
    parseDurationToMinutes(durationStr) {
        if (!durationStr || durationStr === '-' || durationStr === '' || durationStr === ' ') {
            return 0;
        }

        // Handle "Xh Ym" format
        const hourMinMatch = durationStr.match(/(\d+)h\s*(\d+)m/i);
        if (hourMinMatch) {
            const hours = parseInt(hourMinMatch[1], 10);
            const minutes = parseInt(hourMinMatch[2], 10);
            return hours * 60 + minutes;
        }

        // Handle "X:Y" format (hours:minutes)
        const colonMatch = durationStr.match(/(\d+):(\d+)/);
        if (colonMatch) {
            const hours = parseInt(colonMatch[1], 10);
            const minutes = parseInt(colonMatch[2], 10);
            return hours * 60 + minutes;
        }

        // Handle "Xh" format (hours only)
        const hoursOnly = durationStr.match(/(\d+)h/i);
        if (hoursOnly) {
            const hours = parseInt(hoursOnly[1], 10);
            return hours * 60;
        }

        return 0;
    },

    /**
     * Analyze employees by office duration (using existing duration field)
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {string} userRole - User role (bo/nodal/admin)
     * @param {Array} userSections - User's accessible sections
     * @returns {Array} Employees sorted by average duration (descending)
     */
    analyzeOfficeDuration(startDate, endDate, userRole, userSections) {
        const records = DataProcessor.getAttendanceForDateRange(startDate, endDate);
        const employeeStats = {};

        // Aggregate office time by employee
        records.forEach(record => {
            // Filter by sections if BO role
            if (userRole === 'bo' && userSections && userSections.length > 0 && !userSections.includes(record.section)) {
                return;
            }

            // Only process records with marked attendance and duration
            if (record.status !== 'Marked Attendance') {
                return;
            }

            // Use the existing duration field from the record
            const durationMinutes = this.parseDurationToMinutes(record.duration);

            if (durationMinutes === 0) {
                return;  // Skip records without valid duration
            }

            const key = record.attendanceId || record.name;
            if (!employeeStats[key]) {
                employeeStats[key] = {
                    attendanceId: record.attendanceId,
                    name: record.name,
                    designation: record.designation,
                    section: record.section,
                    group: record.group || 'N/A',
                    totalDuration: 0,
                    daysWithTime: 0,
                    durations: [],
                    inTimes: [],
                    outTimes: []
                };
            }

            employeeStats[key].totalDuration += durationMinutes;
            employeeStats[key].daysWithTime++;
            employeeStats[key].durations.push(record.duration);

            // Track in and out times for averaging
            if (record.inTime && record.inTime !== '-') {
                employeeStats[key].inTimes.push(record.inTime);
            }
            if (record.outTime && record.outTime !== '-') {
                employeeStats[key].outTimes.push(record.outTime);
            }
        });

        // Calculate average duration and convert to array
        const results = Object.values(employeeStats)
            .filter(emp => emp.daysWithTime > 0)
            .map(emp => {
                const avgDuration = emp.totalDuration / emp.daysWithTime;

                return {
                    attendanceId: emp.attendanceId,
                    name: emp.name,
                    designation: emp.designation,
                    section: emp.section,
                    group: emp.group,
                    daysWithTime: emp.daysWithTime,
                    avgDurationMinutes: avgDuration,
                    avgDurationFormatted: this.formatDuration(avgDuration),
                    avgInTime: this.calculateAvgTime(emp.inTimes),
                    avgOutTime: this.calculateAvgTime(emp.outTimes),
                    // Keep a sample of actual durations for reference
                    sampleDuration: emp.durations[0] || '-'
                };
            });

        // Sort by average duration (descending)
        results.sort((a, b) => b.avgDurationMinutes - a.avgDurationMinutes);

        return results;
    },

    /**
     * Format duration in minutes to "Xh Ym" format
     * @param {number} minutes - Duration in minutes
     * @returns {string} Formatted duration
     */
    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return `${hours}h ${mins}m`;
    },

    /**
     * Calculate average time from an array of time strings
     * @param {Array} times - Array of time strings (HH:MM format)
     * @returns {string} Average time in HH:MM format, or '-' if no valid times
     */
    calculateAvgTime(times) {
        if (!times || times.length === 0) {
            return '-';
        }

        // Parse times to minutes since midnight
        const minutesArray = times.map(timeStr => {
            const match = timeStr.match(/(\d{1,2}):(\d{2})/);
            if (!match) return null;
            const hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            return hours * 60 + minutes;
        }).filter(m => m !== null);

        if (minutesArray.length === 0) {
            return '-';
        }

        // Calculate average
        const avgMinutes = minutesArray.reduce((sum, m) => sum + m, 0) / minutesArray.length;

        // Convert back to HH:MM format
        const hours = Math.floor(avgMinutes / 60);
        const mins = Math.round(avgMinutes % 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    },

    /**
     * Get BO name from sections
     * @param {Array} sections - Employee sections
     * @returns {string} BO name
     */
    getBOFromSections(sections) {
        // Find which BO these sections belong to
        for (const [username, config] of Object.entries(USER_CONFIG)) {
            if (config.role === 'bo') {
                // Check if any of the employee's sections are in this BO's sections
                const hasMatch = sections.some(section => config.sections.includes(section));
                if (hasMatch) {
                    return config.name;
                }
            }
        }
        return 'Unassigned';
    },

    /**
     * Generate BO-wise aggregated report
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {string} reportType - 'failures', 'performers', or 'duration'
     * @returns {Array} BO-wise aggregated data
     */
    generateBOWiseReport(startDate, endDate, reportType) {
        let employeeData;

        // Get employee-level data based on report type
        if (reportType === 'failures') {
            employeeData = this.analyzeAttendanceFailures(startDate, endDate, 'admin', []);
        } else if (reportType === 'performers') {
            employeeData = this.analyzeBestPerformers(startDate, endDate, 'admin', []);
        } else if (reportType === 'duration') {
            employeeData = this.analyzeOfficeDuration(startDate, endDate, 'admin', []);
        } else {
            return [];
        }

        // Group by BO
        const boGroups = {};

        employeeData.forEach(emp => {
            const boName = this.getBOFromSections([emp.section]);

            if (!boGroups[boName]) {
                boGroups[boName] = {
                    boName: boName,
                    employees: [],
                    totalEmployees: 0,
                    avgMetric: 0
                };
            }

            boGroups[boName].employees.push(emp);
            boGroups[boName].totalEmployees++;
        });

        // Calculate BO-level averages
        const results = Object.values(boGroups).map(bo => {
            if (reportType === 'failures') {
                const avgFailureRate = bo.employees.reduce((sum, emp) => sum + parseFloat(emp.failureRate), 0) / bo.totalEmployees;
                const totalAbsent = bo.employees.reduce((sum, emp) => sum + emp.absentDays, 0);
                return {
                    ...bo,
                    avgFailureRate: avgFailureRate.toFixed(1),
                    totalAbsentDays: totalAbsent,
                    avgMetric: avgFailureRate
                };
            } else if (reportType === 'performers') {
                const avgAttendanceRate = bo.employees.reduce((sum, emp) => sum + parseFloat(emp.attendanceRate), 0) / bo.totalEmployees;
                const totalPresent = bo.employees.reduce((sum, emp) => sum + emp.presentDays, 0);
                return {
                    ...bo,
                    avgAttendanceRate: avgAttendanceRate.toFixed(1),
                    totalPresentDays: totalPresent,
                    avgMetric: avgAttendanceRate
                };
            } else if (reportType === 'duration') {
                const avgDuration = bo.employees.reduce((sum, emp) => sum + emp.avgDurationMinutes, 0) / bo.totalEmployees;
                return {
                    ...bo,
                    avgDuration: this.formatDuration(avgDuration),
                    avgDurationMinutes: avgDuration,
                    avgMetric: avgDuration
                };
            }
        });

        // Sort by metric
        if (reportType === 'failures') {
            results.sort((a, b) => b.avgMetric - a.avgMetric); // Higher failure is worse
        } else {
            results.sort((a, b) => b.avgMetric - a.avgMetric); // Higher is better
        }

        return results;
    }
};
