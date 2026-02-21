// ========================================
// Analytics Module
// Handles analytics calculations and chart generation
// ========================================

const Analytics = {
    charts: {},

    // Initialize charts
    initCharts() {
        // Destroy existing charts if they exist to prevent canvas reuse errors
        if (this.charts.section) {
            this.charts.section.destroy();
            this.charts.section = null;
        }
        if (this.charts.trend) {
            this.charts.trend.destroy();
            this.charts.trend = null;
        }

        // Set Chart.js defaults
        Chart.defaults.color = '#cbd5e1';
        Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.1)';
        Chart.defaults.font.family = 'Inter';

        this.createSectionChart();
        this.createTrendChart();
    },

    // Create section-wise attendance chart - shows average percentage performance
    createSectionChart() {
        const ctx = document.getElementById('sectionChart');
        if (!ctx) return;

        this.charts.section = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Average Attendance %',
                    data: [],
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return 'Avg Attendance: ' + context.parsed.y.toFixed(1) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        },
                        ticks: {
                            callback: function (value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },

    // Create attendance distribution pie chart
    createDistributionChart() {
        const ctx = document.getElementById('distributionChart');
        if (!ctx) return;

        this.charts.distribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Marked Attendance', 'Not Marked Attendance'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ],
                    borderColor: [
                        '#10b981',
                        '#ef4444'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        });
    },

    // Create attendance trend line chart
    createTrendChart() {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Attendance %',
                    data: [],
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderColor: '#6366f1',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        },
                        ticks: {
                            callback: function (value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },

    // Update section chart with percentage data
    updateSectionChart(sectionStats) {
        if (!this.charts.section) return;

        const labels = sectionStats.map(s => s.section);
        const percentageData = sectionStats.map(s => parseFloat(s.percentage));

        this.charts.section.data.labels = labels;
        this.charts.section.data.datasets[0].data = percentageData;
        this.charts.section.update();
    },

    // Update distribution chart
    updateDistributionChart(present, absent) {
        if (!this.charts.distribution) return;

        this.charts.distribution.data.datasets[0].data = [present, absent];
        this.charts.distribution.update();
    },

    // Update trend chart with date range data
    updateTrendChart(dateRangeData) {
        if (!this.charts.trend) return;

        const labels = dateRangeData.map(d => d.dateFormatted || d.date);
        const percentages = dateRangeData.map(d => d.percentage);

        this.charts.trend.data.labels = labels;
        this.charts.trend.data.datasets[0].data = percentages;
        this.charts.trend.update();
    },

    // Calculate top performers
    getTopPerformers(dateRange = 7) {
        // This would calculate based on multiple days
        // For now, using current date data
        const currentDate = document.getElementById('dateFilter')?.value || CONFIG.settings.defaultDate;
        const attendance = DataProcessor.getAttendanceForDate(currentDate);

        // Group by employee and calculate attendance
        const employeeStats = {};

        attendance.forEach(record => {
            if (!employeeStats[record.name]) {
                employeeStats[record.name] = {
                    name: record.name,
                    designation: record.designation,
                    section: record.section,
                    present: 0,
                    total: 1
                };
            }

            if (record.status === 'Marked Attendance') {
                employeeStats[record.name].present++;
            }
        });

        // Calculate percentages and sort
        const performers = Object.values(employeeStats)
            .map(emp => ({
                ...emp,
                percentage: ((emp.present / emp.total) * 100).toFixed(1)
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 10);

        return performers;
    },

    // Calculate BO-wise statistics
    getBOStats(date) {
        const sectionStats = DataProcessor.getSectionWiseStats(date);

        // Group by BO based on section mapping
        const boStats = {};

        // For each BO, aggregate their sections
        Object.keys(CONFIG.credentials).forEach(username => {
            const user = CONFIG.credentials[username];
            if (user.role === 'bo' && user.sections) {
                const boSections = user.sections;
                const boData = {
                    name: user.name,
                    sections: boSections.join(', '),
                    present: 0,
                    absent: 0,
                    total: 0
                };

                boSections.forEach(section => {
                    const sectionStat = sectionStats.find(s => s.section === section);
                    if (sectionStat) {
                        boData.present += sectionStat.present;
                        boData.absent += sectionStat.absent;
                        boData.total += sectionStat.total;
                    }
                });

                if (boData.total > 0) {
                    boData.percentage = ((boData.present / boData.total) * 100).toFixed(1);
                    boStats[username] = boData;
                }
            }
        });

        return Object.values(boStats).sort((a, b) => b.percentage - a.percentage);
    },

    // Render top performers list
    renderTopPerformers(performers) {
        const container = document.getElementById('topPerformers');
        if (!container) return;

        if (performers.length === 0) {
            container.innerHTML = '<p class="text-muted">No data available</p>';
            return;
        }

        container.innerHTML = performers.map(performer => `
            <div class="performer-item">
                <div class="performer-info">
                    <div class="performer-name">${performer.name}</div>
                    <div class="performer-designation">${performer.designation} • ${performer.section}</div>
                </div>
                <div class="performer-percentage">${performer.percentage}%</div>
            </div>
        `).join('');
    },

    // Render worst performers list (most absences)
    renderWorstPerformers(worstPerformers) {
        const container = document.getElementById('worstPerformers');
        if (!container) return;

        if (worstPerformers.length === 0) {
            container.innerHTML = '<p class="text-muted">No data available</p>';
            return;
        }

        container.innerHTML = worstPerformers.map(performer => `
            <div class="performer-item worst-performer">
                <div class="performer-info">
                    <div class="performer-name">${performer.name}</div>
                    <div class="performer-designation">${performer.designation} • ${performer.section}</div>
                    <div class="performer-stats">
                        <span class="absent-count">Absent: ${performer.absent} days</span>
                    </div>
                </div>
                <div class="performer-percentage">${performer.percentage}%</div>
            </div>
        `).join('');
    },

    // Render BO statistics
    renderBOStats(boStats) {
        const container = document.getElementById('boStats');
        if (!container) return;

        if (boStats.length === 0) {
            container.innerHTML = '<p class="text-muted">No data available</p>';
            return;
        }

        container.innerHTML = boStats.map(bo => `
            <div class="bo-stat-item">
                <div class="bo-info">
                    <div class="bo-name">${bo.name}</div>
                    <div class="bo-section">${bo.sections}</div>
                </div>
                <div class="bo-percentage">${bo.percentage}%</div>
            </div>
        `).join('');
    },

    // Render sections with worst attendance
    renderSectionWorstAttendance(sections) {
        const container = document.getElementById('sectionsWorstAttendance');
        if (!container) return;

        if (sections.length === 0) {
            container.innerHTML = '<p class="text-muted">No data available</p>';
            return;
        }

        const topWorst = sections.slice(0, 10);

        container.innerHTML = topWorst.map((section, index) => `
            <div class="section-stat-item">
                <div class="section-rank">${index + 1}</div>
                <div class="section-info">
                    <div class="section-name">${section.section}</div>
                    <div class="section-stats">
                        Avg: ${section.percentage}% ${section.daysCount ? '(' + section.daysCount + ' days)' : ''}
                    </div>
                </div>
                <div class="section-percentage">${section.percentage}%</div>
            </div>
        `).join('');
    },

    // Render sections with best attendance
    renderSectionBestAttendance(sections) {
        const container = document.getElementById('sectionsBestAttendance');
        if (!container) return;

        if (sections.length === 0) {
            container.innerHTML = '<p class="text-muted">No data available</p>';
            return;
        }

        const topBest = sections.slice(0, 10);

        container.innerHTML = topBest.map((section, index) => `
            <div class="section-stat-item best-section">
                <div class="section-rank">${index + 1}</div>
                <div class="section-info">
                    <div class="section-name">${section.section}</div>
                    <div class="section-stats">
                        Avg: ${section.percentage}% ${section.daysCount ? '(' + section.daysCount + ' days)' : ''}
                    </div>
                </div>
                <div class="section-percentage">${section.percentage}%</div>
            </div>
        `).join('');
    },

    // Update all analytics with date range support
    updateAnalytics(startDate, endDate) {
        // Default to current date if no range provided
        if (!startDate || !endDate) {
            const currentDate = document.getElementById('dateFilter')?.value || CONFIG.settings.defaultDate;
            startDate = currentDate;
            endDate = currentDate;
        }

        console.log(`Updating analytics for date range: ${startDate} to ${endDate}`);

        // Get date range data
        const sectionStats = DataProcessor.getSectionWiseStatsForRange(startDate, endDate);
        const attendance = DataProcessor.getAttendanceForDateRange(startDate, endDate);
        const stats = DataProcessor.calculateStats(attendance);

        // Update charts
        this.updateSectionChart(sectionStats);

        // Update trend chart with date range data
        const trendData = DataProcessor.getTrendDataForRange(startDate, endDate);
        this.updateTrendChart(trendData);

        // Get performers and section analytics
        const topPerformers = this.getTopPerformersForRange(startDate, endDate);
        const worstPerformers = DataProcessor.getWorstPerformers(startDate, endDate, 10);
        const sectionsWorst = DataProcessor.getSectionsWithMostAbsences(startDate, endDate);
        const sectionsBest = DataProcessor.getSectionsWithBestAttendance(startDate, endDate);
        const boStats = this.getBOStatsForRange(startDate, endDate);

        // Render performers and stats
        this.renderTopPerformers(topPerformers);
        this.renderWorstPerformers(worstPerformers);
        this.renderSectionWorstAttendance(sectionsWorst);
        this.renderSectionBestAttendance(sectionsBest);
        this.renderBOStats(boStats);
    },

    // Calculate top performers for date range
    getTopPerformersForRange(startDate, endDate) {
        const employeeStats = DataProcessor.getEmployeeAttendanceStats(startDate, endDate);

        return Object.values(employeeStats)
            .filter(emp => emp.total > 0)
            .sort((a, b) => {
                // Sort by percentage (descending), then by present count
                if (parseFloat(b.percentage) !== parseFloat(a.percentage)) {
                    return parseFloat(b.percentage) - parseFloat(a.percentage);
                }
                return b.present - a.present;
            })
            .slice(0, 10);
    },

    // Calculate BO stats for date range
    getBOStatsForRange(startDate, endDate) {
        const sectionStats = DataProcessor.getSectionWiseStatsForRange(startDate, endDate);
        const boStats = {};

        // For each BO, aggregate their sections
        Object.keys(CONFIG.credentials).forEach(username => {
            const user = CONFIG.credentials[username];
            if (user.role === 'bo' && user.sections) {
                const boSections = user.sections;
                const boData = {
                    name: user.name,
                    sections: boSections.join(', '),
                    present: 0,
                    absent: 0,
                    total: 0
                };

                boSections.forEach(section => {
                    const sectionStat = sectionStats.find(s => s.section === section);
                    if (sectionStat) {
                        boData.present += sectionStat.present;
                        boData.absent += sectionStat.absent;
                        boData.total += sectionStat.total;
                    }
                });

                if (boData.total > 0) {
                    boData.percentage = ((boData.present / boData.total) * 100).toFixed(1);
                    boStats[username] = boData;
                }
            }
        });

        return Object.values(boStats).sort((a, b) => b.percentage - a.percentage);
    }
};
