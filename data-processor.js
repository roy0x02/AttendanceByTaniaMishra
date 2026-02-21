// ========================================
// Data Processor Module
// Handles Excel file parsing and data transformation
// ========================================

const DataProcessor = {
    // Master employee data
    employees: [],

    // Attendance records by date
    attendanceByDate: {},

    // Section to employees mapping
    employeesBySection: {},

    // Initialize with existing Excel files
    async init() {
        try {
            // Initialize IndexedDB storage
            await StorageManager.init();

            // Migrate from localStorage to IndexedDB (one-time operation)
            await StorageManager.migrateFromLocalStorage();

            // Load employee master data from localStorage if available
            const savedData = localStorage.getItem(CONFIG.storageKeys.employeeData);
            if (savedData) {
                const data = JSON.parse(savedData);
                this.employees = data.employees || [];
                this.employeesBySection = data.employeesBySection || {};
            } else {
                // If no saved data, we'll load from the Excel files
                await this.loadEmployeeMasterData();
            }

            // Load attendance data from IndexedDB
            this.attendanceByDate = await StorageManager.getAllAttendance();
            console.log(`Loaded attendance data for ${Object.keys(this.attendanceByDate).length} dates`);

            // Tag records with isUnmapped flag (for records loaded from storage)
            this._tagUnmappedRecords();

            return true;
        } catch (error) {
            console.error('Error initializing data processor:', error);
            return false;
        }
    },

    // Tag all records with isUnmapped based on whether their section is assigned to any BO
    _tagUnmappedRecords() {
        const allBOSections = new Set();
        if (typeof CONFIG !== 'undefined' && CONFIG.credentials) {
            Object.values(CONFIG.credentials).forEach(user => {
                if (user.role === 'bo' && user.sections) {
                    user.sections.forEach(s => allBOSections.add(s));
                }
            });
        }
        if (allBOSections.size === 0) return;

        Object.values(this.attendanceByDate).forEach(records => {
            records.forEach(record => {
                record.isUnmapped = !allBOSections.has(record.section);
            });
        });
    },

    // Parse Excel file using SheetJS
    async parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    resolve(workbook);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    },

    // Load employee master data from the provided Excel files
    async loadEmployeeMasterData() {
        // This function would typically load the actual Excel files
        // For now, we'll create a structure based on the analyzed data

        // Sample employee structure based on the Excel files
        const adminEmployees = [
            { name: 'Malay Deb', designation: 'Sr.Accountant', section: 'Admin-I', group: 'Admin' },
            { name: 'Sankar Kumar Haldar', designation: 'Accountant', section: 'Admin-I', group: 'Admin' },
            { name: 'Ashim Purkait', designation: 'Sr. Accountant', section: 'Admin-I', group: 'Admin' },
            { name: 'Sudipta Bhattacharjee', designation: 'Sr. Accountant', section: 'Admin-II', group: 'Admin' },
            { name: 'Kuntal Karmakar', designation: 'Sr. Accountant', section: 'Admin-II', group: 'Admin' },
        ];

        const fundEmployees = [
            { name: 'Pronay Chatterjee', designation: 'Sr. Accountant', section: 'Fund-I', group: 'Fund' },
            { name: 'Debabrata Raha', designation: 'Sr. Accountant', section: 'Fund-I', group: 'Fund' },
            { name: 'Pretam Manna', designation: 'Accountant', section: 'Fund-I', group: 'Fund' },
            { name: 'Birmal Kumar', designation: 'D.E.O. Gr. B', section: 'Fund-I', group: 'Fund' },
            { name: 'Chandan Das-I', designation: 'A.A.O.', section: 'Fund-II', group: 'Fund' },
            { name: 'Tilak Kumar Adhikary', designation: 'Asstt Supervisor', section: 'Fund-II', group: 'Fund' },
        ];

        const accountsEmployees = [
            { name: 'Sankar Roy', designation: 'AAO', section: 'AC-I', group: 'Accounts' },
            { name: 'Pronoy Kumar Maitra', designation: 'Sr.Accountant', section: 'AC-I', group: 'Accounts' },
            { name: 'Ashim Purkait', designation: 'Sr.Accountant', section: 'AC-I', group: 'Accounts' },
            { name: 'Goutam Sarkar', designation: 'Sr.Accountant', section: 'AC-II', group: 'Accounts' },
            { name: 'Santosh Sahoo', designation: 'Accountant', section: 'AC-II', group: 'Accounts' },
            { name: 'Babul Biswas', designation: 'AAO', section: 'AC-III', group: 'Accounts' },
        ];

        this.employees = [...adminEmployees, ...fundEmployees, ...accountsEmployees];

        // Build section mapping
        this.employeesBySection = {};
        this.employees.forEach(emp => {
            if (!this.employeesBySection[emp.section]) {
                this.employeesBySection[emp.section] = [];
            }
            this.employeesBySection[emp.section].push(emp);
        });

        // Save to localStorage
        this.saveEmployeeData();
    },

    // Process attendance file (Excel or CSV)
    async processAttendanceFile(file, date, isCSV = false) {
        try {
            let rawData = [];
            let mode = 'IMPLICIT'; // Default to implicit mode

            if (isCSV) {
                // Parse CSV file
                rawData = await this.parseCSVFile(file);
            } else {
                // Parse Excel file
                const workbook = await this.parseExcelFile(file);

                // For Excel, check if it has Present/Absent sheets (old format)
                const presentSheet = workbook.Sheets['Present'];
                const absentSheet = workbook.Sheets['Absent'];

                if (presentSheet && absentSheet) {
                    // Old Excel format with separate sheets - use explicit mode
                    mode = 'EXPLICIT';
                    const presentData = XLSX.utils.sheet_to_json(presentSheet);
                    const absentData = XLSX.utils.sheet_to_json(absentSheet);

                    // Mark all present data
                    presentData.forEach(row => {
                        row.Status = 'Marked Attendance';
                    });

                    // Mark all absent data
                    absentData.forEach(row => {
                        row.Status = 'Not Marked Attendance';
                    });

                    rawData = [...presentData, ...absentData];
                } else {
                    // Single sheet - take first sheet
                    const firstSheetName = workbook.SheetNames[0];
                    rawData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
                }
            }

            // Detect mode: Check if Status or Attendance column exists
            if (rawData.length > 0) {
                const firstRow = rawData[0];
                const headers = Object.keys(firstRow).map(h => h.toLowerCase().trim());

                if (headers.includes('status') || headers.includes('attendance')) {
                    mode = 'EXPLICIT';
                }
            }

            console.log(`Processing attendance in ${mode} mode`);

            // Process based on detected mode
            let attendanceRecords = [];
            let presentAttendanceIds = new Set();

            if (mode === 'EXPLICIT') {
                // EXPLICIT MODE: Use Status column
                attendanceRecords = await this.processExplicitMode(rawData, presentAttendanceIds);
            } else {
                // IMPLICIT MODE: All names in file are present
                attendanceRecords = await this.processImplicitMode(rawData, presentAttendanceIds);
            }

            // ====================================================================
            // AUTOMATIC ABSENT MARKING: 
            // Mark ALL mapped employees who are NOT in the uploaded file as ABSENT
            // ====================================================================
            let autoAbsentCount = 0;

            // Iterate through all employees in ATTENDANCE_ID_MAPPING
            for (const [attendanceId, employee] of Object.entries(ATTENDANCE_ID_MAPPING)) {
                // Skip if employee is already in the attendance records
                if (!presentAttendanceIds.has(attendanceId)) {
                    // This employee was not in the uploaded file - mark as absent
                    attendanceRecords.push({
                        slNo: attendanceRecords.length + 1,
                        attendanceId: attendanceId,
                        name: employee.name,
                        designation: employee.designation,
                        section: employee.section,
                        group: employee.group,
                        divisionUnits: '',
                        mappedSection: employee.section,
                        status: 'Not Marked Attendance',
                        inTime: '-',
                        outTime: '-',
                        duration: '-'
                    });
                    autoAbsentCount++;
                }
            }

            console.log(`Auto-marked ${autoAbsentCount} employees as absent (not in uploaded file)`);

            // ====================================================================
            // TAG UNMAPPED EMPLOYEES:
            // Build a set of all sections assigned to any BO, then mark records
            // whose section is NOT in that set as isUnmapped = true
            // ====================================================================
            const allBOSections = new Set();
            if (typeof CONFIG !== 'undefined' && CONFIG.credentials) {
                Object.values(CONFIG.credentials).forEach(user => {
                    if (user.role === 'bo' && user.sections) {
                        user.sections.forEach(s => allBOSections.add(s));
                    }
                });
            }

            let unmappedCount = 0;
            attendanceRecords.forEach(record => {
                record.isUnmapped = allBOSections.size > 0 && !allBOSections.has(record.section);
                if (record.isUnmapped) unmappedCount++;
            });
            console.log(`Tagged ${unmappedCount} records as unmapped (section not assigned to any BO)`);

            // Store attendance data by date
            this.attendanceByDate[date] = attendanceRecords;
            await StorageManager.saveAttendance(date, attendanceRecords);

            // Calculate final counts
            const finalPresent = attendanceRecords.filter(r => r.status === 'Marked Attendance').length;
            const finalAbsent = attendanceRecords.filter(r => r.status === 'Not Marked Attendance').length;

            return {
                success: true,
                date: date,
                mode: mode,
                totalRecords: attendanceRecords.length,
                present: finalPresent,
                absent: finalAbsent,
                autoMarkedAbsent: autoAbsentCount
            };

        } catch (error) {
            console.error('Error processing attendance file:', error);
            throw error;
        }
    },

    // Process file with explicit Status column
    async processExplicitMode(rawData, presentAttendanceIds) {
        const attendanceRecords = [];

        rawData.forEach((row, index) => {
            // PRIMARY: Match by Attendance Id
            const attendanceId = String(row['Attendance Id'] || row['Employee Id'] || row['ID'] || '').trim();

            if (!attendanceId || attendanceId === '-') {
                console.warn('Row missing Attendance Id, skipping:', row);
                return;
            }

            // Get employee details from mapping
            const employee = getEmployeeByAttendanceId(attendanceId);

            if (!employee) {
                console.warn(`Attendance Id ${attendanceId} not found in mapping - using fallback data from file`);
            }

            const divisionUnits = row[' Division/Units'] || row['Division/Units'] || row['Division'] || '';

            // FALLBACK: Extract section from Division/Units if employee not in mapping
            // Format: "Section name (office)" or just "Section name"
            let fallbackSection = 'Unknown';
            if (!employee && divisionUnits) {
                // Try to extract section name before parentheses
                const match = divisionUnits.match(/^([^(]+)/);
                if (match) {
                    fallbackSection = match[1].trim();
                }
            }

            // Get status from file
            let status = row['Status'] || row['Attendance'] || '';
            status = status.toString().toLowerCase().trim();

            // Normalize status values
            let normalizedStatus = 'Not Marked Attendance';
            if (status === 'present' || status === 'p' || status === '✓') {
                normalizedStatus = 'Marked Attendance';
            }

            attendanceRecords.push({
                slNo: index + 1,
                attendanceId: attendanceId,
                name: employee ? employee.name : (row['Name'] || row['Employee Name'] || 'Unknown'),
                designation: employee ? employee.designation : (row[' Employee Designation'] || row['Employee Designation'] || row['Designation'] || 'N/A'),
                section: employee ? employee.section : fallbackSection,
                group: employee ? employee.group : (this.extractGroup(divisionUnits) || 'Others'),
                divisionUnits: divisionUnits,
                mappedSection: employee ? employee.section : fallbackSection,
                status: normalizedStatus,
                inTime: normalizedStatus === 'Marked Attendance' ? this.formatTime(row['In Time']) : '-',
                outTime: normalizedStatus === 'Marked Attendance' ? this.formatTime(row['Out Time']) : '-',
                duration: normalizedStatus === 'Marked Attendance' ? this.formatDuration(row['Duration']) : '-'
            });

            presentAttendanceIds.add(attendanceId);
        });

        return attendanceRecords;
    },

    // Process file without Status column - check In Time/Out Time to determine presence
    async processImplicitMode(rawData, presentAttendanceIds) {
        const attendanceRecords = [];

        rawData.forEach((row, index) => {
            // PRIMARY: Match by Attendance Id
            const attendanceId = String(row['Attendance Id'] || row['Employee Id'] || row['ID'] || '').trim();

            if (!attendanceId || attendanceId === '-') {
                console.warn('Row missing Attendance Id, skipping:', row);
                return;
            }

            // Get employee details from mapping
            const employee = getEmployeeByAttendanceId(attendanceId);

            if (!employee) {
                console.warn(`Attendance Id ${attendanceId} not found in mapping - using fallback data from file`);
            }

            const divisionUnits = row[' Division/Units'] || row['Division/Units'] || row['Division'] || row['Section'] || '';

            // FALLBACK: Extract section from Division/Units if employee not in mapping
            // Format: "Section name (office)" or just "Section name"
            let fallbackSection = 'Unknown';
            if (!employee && divisionUnits) {
                // Try to extract section name before parentheses
                const match = divisionUnits.match(/^([^(]+)/);
                if (match) {
                    fallbackSection = match[1].trim();
                }
            }

            // Check if In Time or Out Time has a value to determine Present status
            const inTime = row['In Time'] || row['in time'] || '';
            const outTime = row['Out Time'] || row['out time'] || '';

            // Has time data = Marked Attendance, otherwise Not Marked Attendance
            const hasTimeData = this.hasValidTime(inTime) || this.hasValidTime(outTime);
            const status = hasTimeData ? 'Marked Attendance' : 'Not Marked Attendance';

            attendanceRecords.push({
                slNo: index + 1,
                attendanceId: attendanceId,
                name: employee ? employee.name : (row['Name'] || row['Employee Name'] || 'Unknown'),
                designation: employee ? employee.designation : (row[' Employee Designation'] || row['Employee Designation'] || row['Designation'] || 'N/A'),
                section: employee ? employee.section : fallbackSection,
                group: employee ? employee.group : (this.extractGroup(divisionUnits) || 'Others'),
                divisionUnits: divisionUnits,
                mappedSection: employee ? employee.section : null,
                status: status,
                inTime: status === 'Marked Attendance' ? this.formatTime(inTime) : '-',
                outTime: status === 'Marked Attendance' ? this.formatTime(outTime) : '-',
                duration: status === 'Marked Attendance' ? this.formatDuration(row['Duration']) : '-'
            });

            presentAttendanceIds.add(attendanceId);
        });

        return attendanceRecords;
    },

    // Helper: Check if time value is valid (not empty, not "-", not "0000-00-00 00:00:00")
    hasValidTime(timeValue) {
        if (!timeValue) return false;
        const timeStr = timeValue.toString().trim();
        if (timeStr === '' || timeStr === '-' || timeStr === '0000-00-00 00:00:00' || timeStr === ' ') {
            return false;
        }
        return true;
    },


    // Parse CSV file
    async parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;

                    // Simple CSV parsing (handles basic CSV format)
                    const lines = csvText.split('\n').filter(line => line.trim());
                    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

                    const data = [];
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                        const row = {};
                        headers.forEach((header, index) => {
                            row[header] = values[index] || '';
                        });
                        data.push(row);
                    }

                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    },

    // Helper: Clean employee name (remove ID in parentheses)
    cleanName(name) {
        if (!name) return '';
        // Remove content in parentheses like (WBKLE2241930)
        return name.replace(/\s*\([^)]*\)\s*/g, '').trim();
    },

    // Helper: Find employee by name
    findEmployeeByName(name) {
        return this.employees.find(emp =>
            emp.name.toLowerCase() === name.toLowerCase()
        );
    },

    // Helper: Extract group from Division/Units column
    // Format: "Pension Group (agaewb)" → "Pension"
    extractGroup(division) {
        if (!division) return null;
        const match = division.match(/(.*?)\s+Group/i);
        return match ? match[1].trim() : null;
    },

    // Helper: Infer section from division
    // For now, we can't reliably infer section from division text alone
    // We'll use 'Unknown' and rely on the section mapping from employee data
    inferSection(division) {
        if (!division) return 'Unknown';

        // Try to extract a meaningful section name from division
        // This is a fallback - ideally section comes from employee master data
        return 'Unknown';
    },

    // Helper: Infer group from division
    inferGroup(division) {
        if (!division) return 'Others';
        return this.extractGroup(division) || 'Others';
    },

    // Helper: Format time from Excel serial number
    formatTime(excelTime) {
        if (!excelTime || excelTime === '0000-00-00 00:00:00' || excelTime === ' ') {
            return '-';
        }

        // If it's already a string time, return it
        if (typeof excelTime === 'string' && excelTime.includes(':')) {
            return excelTime;
        }

        // If it's an Excel serial number
        if (typeof excelTime === 'number') {
            const totalSeconds = Math.round(excelTime * 24 * 60 * 60);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }

        return '-';
    },

    // Helper: Format duration
    formatDuration(duration) {
        if (!duration || duration === ' ') return '-';

        if (typeof duration === 'number') {
            const hours = Math.floor(duration * 24);
            const minutes = Math.floor((duration * 24 * 60) % 60);
            return `${hours}h ${minutes}m`;
        }

        return duration.toString();
    },

    // Get attendance for a specific date
    getAttendanceForDate(date) {
        return this.attendanceByDate[date] || [];
    },

    // Get attendance filtered by sections
    getAttendanceForSections(date, sections) {
        const allAttendance = this.getAttendanceForDate(date);
        if (!sections || sections.length === 0) return allAttendance;

        return allAttendance.filter(record =>
            sections.includes(record.section)
        );
    },

    // Calculate statistics
    calculateStats(attendanceRecords) {
        const present = attendanceRecords.filter(r => r.status === 'Marked Attendance').length;
        const absent = attendanceRecords.filter(r => r.status === 'Not Marked Attendance').length;
        const total = attendanceRecords.length;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

        return { present, absent, total, percentage };
    },

    // Get section-wise statistics
    getSectionWiseStats(date) {
        const attendance = this.getAttendanceForDate(date);
        const statsBySection = {};

        attendance.forEach(record => {
            if (!statsBySection[record.section]) {
                statsBySection[record.section] = {
                    section: record.section,
                    present: 0,
                    absent: 0,
                    total: 0
                };
            }

            statsBySection[record.section].total++;
            if (record.status === 'Marked Attendance') {
                statsBySection[record.section].present++;
            } else {
                statsBySection[record.section].absent++;
            }
        });

        // Calculate percentages
        Object.values(statsBySection).forEach(stat => {
            stat.percentage = ((stat.present / stat.total) * 100).toFixed(1);
        });

        return Object.values(statsBySection);
    },

    // ========================================
    // DATE RANGE ANALYTICS METHODS
    // ========================================

    // Get attendance data for a date range
    getAttendanceForDateRange(startDate, endDate) {
        const allRecords = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Iterate through each date in the range
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            const records = this.getAttendanceForDate(dateStr);
            if (records.length > 0) {
                allRecords.push(...records.map(r => ({ ...r, date: dateStr })));
            }
        }

        return allRecords;
    },

    // Calculate employee attendance statistics over date range
    getEmployeeAttendanceStats(startDate, endDate) {
        const records = this.getAttendanceForDateRange(startDate, endDate);
        const employeeStats = {};

        records.forEach(record => {
            if (!employeeStats[record.name]) {
                employeeStats[record.name] = {
                    name: record.name,
                    designation: record.designation,
                    section: record.section,
                    group: record.group || 'N/A',
                    present: 0,
                    absent: 0,
                    total: 0
                };
            }

            employeeStats[record.name].total++;
            if (record.status === 'Marked Attendance') {
                employeeStats[record.name].present++;
            } else {
                employeeStats[record.name].absent++;
            }
        });

        // Calculate percentages
        Object.values(employeeStats).forEach(stat => {
            stat.percentage = stat.total > 0
                ? ((stat.present / stat.total) * 100).toFixed(1)
                : 0;
        });

        return employeeStats;
    },

    // Get section-wise stats for date range - calculates average percentage day-wise
    getSectionWiseStatsForRange(startDate, endDate) {
        // Calculate daily percentages for each section, then average them
        const start = new Date(startDate);
        const end = new Date(endDate);
        const sectionDailyPercentages = {};

        // Iterate through each date in the range
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            const dailyRecords = this.getAttendanceForDate(dateStr);

            if (dailyRecords.length === 0) continue;

            // Calculate daily stats per section
            const dailySectionStats = {};
            dailyRecords.forEach(record => {
                if (!dailySectionStats[record.section]) {
                    dailySectionStats[record.section] = {
                        present: 0,
                        total: 0
                    };
                }

                dailySectionStats[record.section].total++;
                if (record.status === 'Marked Attendance') {
                    dailySectionStats[record.section].present++;
                }
            });

            // Store daily percentage for each section
            Object.entries(dailySectionStats).forEach(([section, stats]) => {
                if (!sectionDailyPercentages[section]) {
                    sectionDailyPercentages[section] = [];
                }

                const dailyPercentage = stats.total > 0
                    ? (stats.present / stats.total) * 100
                    : 0;

                sectionDailyPercentages[section].push(dailyPercentage);
            });
        }

        // Calculate average percentage for each section
        const sectionArray = Object.entries(sectionDailyPercentages).map(([section, percentages]) => {
            const avgPercentage = percentages.length > 0
                ? percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length
                : 0;

            // Count unique employees in this section
            const sectionEmployees = this.employeesBySection[section] || [];

            return {
                section: section,
                percentage: avgPercentage.toFixed(1),
                avgPercentage: avgPercentage.toFixed(1), // Store as separate field
                daysCount: percentages.length,
                employees: sectionEmployees.length,
                // Keep present/absent for reference but they're now less meaningful
                present: 0,
                absent: 0,
                total: 0
            };
        });

        return sectionArray.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
    },

    // Get worst performers (employees with most absences)
    getWorstPerformers(startDate, endDate, limit = 10) {
        const employeeStats = this.getEmployeeAttendanceStats(startDate, endDate);

        return Object.values(employeeStats)
            .filter(emp => emp.total > 0) // Only include employees with records
            .sort((a, b) => {
                // Sort by absence count (descending), then by percentage (ascending)
                if (b.absent !== a.absent) {
                    return b.absent - a.absent;
                }
                return parseFloat(a.percentage) - parseFloat(b.percentage);
            })
            .slice(0, limit);
    },

    // Get sections with most absences
    getSectionsWithMostAbsences(startDate, endDate) {
        const sectionStats = this.getSectionWiseStatsForRange(startDate, endDate);

        return sectionStats
            .sort((a, b) => {
                // Sort by total absences (descending)
                if (b.absent !== a.absent) {
                    return b.absent - a.absent;
                }
                // Then by percentage (ascending - lower is worse)
                return parseFloat(a.percentage) - parseFloat(b.percentage);
            });
    },

    // Get sections with best attendance
    getSectionsWithBestAttendance(startDate, endDate) {
        const sectionStats = this.getSectionWiseStatsForRange(startDate, endDate);

        return sectionStats
            .sort((a, b) => {
                // Sort by attendance percentage (descending - higher is better)
                if (parseFloat(b.percentage) !== parseFloat(a.percentage)) {
                    return parseFloat(b.percentage) - parseFloat(a.percentage);
                }
                // Then by total present count
                return b.present - a.present;
            });
    },

    // Get trend data for date range (daily attendance percentages)
    getTrendDataForRange(startDate, endDate) {
        const trendData = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            const records = this.getAttendanceForDate(dateStr);

            if (records.length > 0) {
                const stats = this.calculateStats(records);
                trendData.push({
                    date: dateStr,
                    dateFormatted: new Date(dateStr).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric'
                    }),
                    present: stats.present,
                    absent: stats.absent,
                    total: stats.total,
                    percentage: parseFloat(stats.percentage)
                });
            }
        }

        return trendData;
    },

    // Save employee data to localStorage
    saveEmployeeData() {
        localStorage.setItem(CONFIG.storageKeys.employeeData, JSON.stringify({
            employees: this.employees,
            employeesBySection: this.employeesBySection
        }));
    },

    // Save attendance data to IndexedDB
    async saveAttendanceData() {
        // Save all dates to IndexedDB
        for (const [date, records] of Object.entries(this.attendanceByDate)) {
            await StorageManager.saveAttendance(date, records);
        }
    },

    // Load specific Excel file (for initial setup)
    async loadExcelFromPath(filepath) {
        // This would be used to load the initial Excel files
        // In a real implementation, this would fetch the file
        console.log('Loading Excel file:', filepath);
    },

    // Get all attendance records across all dates (for testing)
    getAllAttendanceRecords() {
        const allRecords = [];
        Object.values(this.attendanceByDate).forEach(records => {
            allRecords.push(...records);
        });
        return allRecords;
    }
};
