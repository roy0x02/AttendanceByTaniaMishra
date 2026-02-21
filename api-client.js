// ========================================
// API Client
// Centralized HTTP client for backend API calls
// ========================================

const ApiClient = {
    // API base URL - automatically detects environment
    // For cloud deployment with separate backend server, set window.BACKEND_URL before loading this script
    // Example: <script>window.BACKEND_URL = 'https://your-backend.com/api';</script>
    baseUrl: (function () {
        // 1. Check if BACKEND_URL is explicitly set (for cloud deployment)
        if (window.BACKEND_URL) {
            return window.BACKEND_URL;
        }

        // 2. Localhost development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }

        // 3. Production - assume backend is on same domain at /api
        return '/api';
    })(),

    // ========================================
    // Helper: Make HTTP Request
    // ========================================
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const config = {
            credentials: 'include', // Include cookies for session
            headers: {
                ...options.headers
            },
            ...options
        };

        // Add JSON content type if body is JSON
        if (options.body && !(options.body instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, config);

            // Check if response is HTML (indicates backend not running or wrong endpoint)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                throw new Error(
                    'Backend server not accessible. The server returned HTML instead of JSON. ' +
                    'Please ensure the Node.js backend server is running. ' +
                    `Current API URL: ${this.baseUrl}`
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);

            // Provide helpful error messages for common issues
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error(
                    'Cannot connect to backend server. Please check:\n' +
                    '1. Backend server is running\n' +
                    '2. CORS is properly configured\n' +
                    `3. API URL is correct: ${this.baseUrl}`
                );
            }

            if (error instanceof SyntaxError && error.message.includes('JSON')) {
                throw new Error(
                    'Backend returned invalid response. This usually means:\n' +
                    '1. Backend server is not running\n' +
                    '2. Wrong API endpoint URL\n' +
                    `3. Check backend at: ${this.baseUrl}`
                );
            }

            throw error;
        }
    },

    // ========================================
    // Authentication APIs
    // ========================================
    auth: {
        async login(username, password) {
            return await ApiClient.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },

        async logout() {
            return await ApiClient.request('/auth/logout', {
                method: 'POST'
            });
        },

        async checkSession() {
            return await ApiClient.request('/auth/session');
        }
    },

    // ========================================
    // Attendance APIs
    // ========================================
    attendance: {
        async save(date, attendanceData) {
            return await ApiClient.request('/attendance/save', {
                method: 'POST',
                body: JSON.stringify({ date, attendanceData })
            });
        },

        async getByDate(date) {
            return await ApiClient.request(`/attendance/${date}`);
        },

        async getByDateRange(startDate, endDate) {
            return await ApiClient.request(`/attendance/range/${startDate}/${endDate}`);
        },

        async deleteByDate(date) {
            return await ApiClient.request(`/attendance/${date}`, {
                method: 'DELETE'
            });
        }
    },

    // ========================================
    // Filter APIs
    // ========================================
    filters: {
        async getByDate(date) {
            return await ApiClient.request(`/filters/${date}`);
        },

        async apply(date, attendanceId, filterReason, validFrom, validUntil) {
            return await ApiClient.request('/filters', {
                method: 'POST',
                body: JSON.stringify({ date, attendanceId, filterReason, validFrom, validUntil })
            });
        },

        async remove(date, attendanceId) {
            return await ApiClient.request(`/filters/${date}/${attendanceId}`, {
                method: 'DELETE'
            });
        },

        async getReasons() {
            return await ApiClient.request('/filters/reasons/list');
        },

        async addReason(reason) {
            return await ApiClient.request('/filters/reasons/add', {
                method: 'POST',
                body: JSON.stringify({ reason })
            });
        }
    },

    // ========================================
    // Document APIs
    // ========================================
    documents: {
        async upload(date, attendanceId, file) {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('date', date);
            formData.append('attendanceId', attendanceId);

            return await ApiClient.request('/documents', {
                method: 'POST',
                body: formData
            });
        },

        async get(date, attendanceId) {
            // Returns blob URL for PDF
            const url = `${ApiClient.baseUrl}/documents/${date}/${attendanceId}`;
            return url;
        },

        async delete(date, attendanceId) {
            return await ApiClient.request(`/documents/${date}/${attendanceId}`, {
                method: 'DELETE'
            });
        },

        async check(date, attendanceId) {
            return await ApiClient.request(`/documents/check/${date}/${attendanceId}`);
        }
    }
};

// Test API connection on load and show configuration
console.log(`API Client configured with base URL: ${ApiClient.baseUrl}`);

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    fetch(`${ApiClient.baseUrl}/health`)
        .then(res => {
            if (res.headers.get('content-type')?.includes('text/html')) {
                console.error('✗ Backend server not running - received HTML instead of JSON');
                console.error('  Please start the backend server: cd server && node server.js');
                return;
            }
            return res.json();
        })
        .then(data => {
            if (data) {
                console.log('✓ API Server connected:', data);
            }
        })
        .catch(err => {
            console.error('✗ API Server not available:', err.message);
            console.error('  Make sure to start the backend server first!');
        });
}
