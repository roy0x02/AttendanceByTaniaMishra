// ========================================
// Authentication Manager Module
// Handles user authentication and session management
// ========================================

const AuthManager = {
    currentUser: null,

    // Initialize authentication system
    async init() {
        // Check session with backend
        try {
            const response = await ApiClient.auth.checkSession();
            if (response.loggedIn) {
                this.currentUser = response.user;
                return true;
            }
        } catch (error) {
            console.error('Session check failed:', error);
        }
        return false;
    },

    // Authenticate user
    async login(username, password) {
        try {
            const response = await ApiClient.auth.login(username, password);

            if (response.success) {
                this.currentUser = response.user;
                return { success: true, user: this.currentUser };
            }

            return { success: false, error: 'Login failed' };
        } catch (error) {
            return { success: false, error: error.message || 'Invalid username or password' };
        }
    },

    // Logout user
    async logout() {
        try {
            await ApiClient.auth.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        this.currentUser = null;
    },

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    },

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    },

    // Check user role
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    },

    // Check if user is admin or nodal
    isAdminOrNodal() {
        return this.hasRole('admin') || this.hasRole('nodal');
    },

    // Check if user is BO
    isBO() {
        return this.hasRole('bo');
    },

    // Get user's accessible sections
    getAccessibleSections() {
        if (!this.currentUser) return [];

        // Admin and nodal can access all sections
        if (this.isAdminOrNodal()) {
            return Object.values(CONFIG.groupMapping).flat();
        }

        // BO can access only their sections
        return this.currentUser.sections || [];
    },

    // Filter attendance data based on user permissions
    filterAttendanceByPermissions(attendanceRecords) {
        if (!this.currentUser) return [];

        // Admin and nodal see all records
        if (this.isAdminOrNodal()) {
            return attendanceRecords;
        }

        // BO sees their sections + unmapped employees (unmapped visible to all via filter)
        const accessibleSections = this.getAccessibleSections();
        return attendanceRecords.filter(record =>
            accessibleSections.includes(record.section) || record.isUnmapped
        );
    }
};
