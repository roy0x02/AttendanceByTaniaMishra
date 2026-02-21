// ========================================
// Storage Manager Module
// Handles IndexedDB operations for attendance data
// Provides fallback to localStorage for small data
// ========================================

const StorageManager = {
    dbName: 'AttendanceDB',
    version: 1,
    storeName: 'attendance',
    db: null,

    // Initialize IndexedDB
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('IndexedDB failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✓ IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'date' });
                    console.log('✓ Created attendance object store');
                }
            };
        });
    },

    // Ensure DB is initialized
    async ensureDB() {
        if (!this.db) {
            await this.init();
        }
        return this.db;
    },

    // Save attendance data for a specific date
    async saveAttendance(date, records) {
        try {
            const db = await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const objectStore = transaction.objectStore(this.storeName);

                const request = objectStore.put({
                    date: date,
                    records: records,
                    timestamp: new Date().toISOString()
                });

                request.onsuccess = () => {
                    console.log(`✓ Saved attendance for ${date} to IndexedDB`);
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('Failed to save attendance:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in saveAttendance:', error);
            throw error;
        }
    },

    // Get attendance data for a specific date
    async getAttendance(date) {
        try {
            const db = await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.get(date);

                request.onsuccess = () => {
                    const result = request.result;
                    if (result && result.records) {
                        resolve(result.records);
                    } else {
                        resolve(null);
                    }
                };

                request.onerror = () => {
                    console.error('Failed to get attendance:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in getAttendance:', error);
            return null;
        }
    },

    // Get all attendance data
    async getAllAttendance() {
        try {
            const db = await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.getAll();

                request.onsuccess = () => {
                    const results = request.result || [];
                    const attendanceByDate = {};

                    results.forEach(item => {
                        if (item && item.date && item.records) {
                            attendanceByDate[item.date] = item.records;
                        }
                    });

                    console.log(`✓ Loaded ${results.length} dates from IndexedDB`);
                    resolve(attendanceByDate);
                };

                request.onerror = () => {
                    console.error('Failed to get all attendance:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in getAllAttendance:', error);
            return {};
        }
    },

    // Delete attendance data for a specific date
    async deleteAttendance(date) {
        try {
            const db = await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.delete(date);

                request.onsuccess = () => {
                    console.log(`✓ Deleted attendance for ${date}`);
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('Failed to delete attendance:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in deleteAttendance:', error);
            throw error;
        }
    },

    // Clear all attendance data
    async clearAll() {
        try {
            const db = await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.clear();

                request.onsuccess = () => {
                    console.log('✓ Cleared all attendance data from IndexedDB');
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('Failed to clear attendance:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in clearAll:', error);
            throw error;
        }
    },

    // Migrate data from localStorage to IndexedDB (one-time operation)
    async migrateFromLocalStorage() {
        try {
            // Check if CONFIG is defined
            if (typeof CONFIG === 'undefined' || !CONFIG.storageKeys || !CONFIG.storageKeys.attendanceData) {
                console.warn('CONFIG not defined, skipping migration');
                return { migrated: 0 };
            }

            const localStorageKey = CONFIG.storageKeys.attendanceData;
            const savedData = localStorage.getItem(localStorageKey);

            if (!savedData) {
                console.log('No localStorage data to migrate');
                return { migrated: 0 };
            }

            console.log('Starting migration from localStorage to IndexedDB...');
            const attendanceByDate = JSON.parse(savedData);
            const dates = Object.keys(attendanceByDate);

            if (dates.length === 0) {
                console.log('No attendance dates to migrate');
                return { migrated: 0 };
            }

            // Save each date to IndexedDB
            let migratedCount = 0;
            for (const date of dates) {
                try {
                    await this.saveAttendance(date, attendanceByDate[date]);
                    migratedCount++;
                } catch (error) {
                    console.error(`Failed to migrate date ${date}:`, error);
                }
            }

            // Clear localStorage after successful migration
            if (migratedCount > 0) {
                localStorage.removeItem(localStorageKey);
                console.log(`✓ Successfully migrated ${migratedCount} dates from localStorage to IndexedDB`);
                console.log('✓ Cleared attendance data from localStorage');
            }

            return { migrated: migratedCount };
        } catch (error) {
            console.error('Migration failed:', error);
            // Don't throw - allow application to continue even if migration fails
            return { migrated: 0, error: error.message };
        }
    },

    // Get storage statistics
    async getStats() {
        try {
            const db = await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const countRequest = objectStore.count();

                countRequest.onsuccess = () => {
                    resolve({
                        totalDates: countRequest.result,
                        storageType: 'IndexedDB'
                    });
                };

                countRequest.onerror = () => {
                    console.error('Failed to get stats:', countRequest.error);
                    reject(countRequest.error);
                };
            });
        } catch (error) {
            console.error('Error getting stats:', error);
            return { totalDates: 0, storageType: 'None' };
        }
    },

    // Check if a specific date exists in storage
    async hasDate(date) {
        try {
            const attendance = await this.getAttendance(date);
            return attendance !== null;
        } catch (error) {
            console.error('Error checking date existence:', error);
            return false;
        }
    },

    // Get all stored dates
    async getAllDates() {
        try {
            const db = await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.getAllKeys();

                request.onsuccess = () => {
                    resolve(request.result || []);
                };

                request.onerror = () => {
                    console.error('Failed to get all dates:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in getAllDates:', error);
            return [];
        }
    },

    // Export all data as JSON (for backup purposes)
    async exportData() {
        try {
            const allAttendance = await this.getAllAttendance();
            return {
                exportDate: new Date().toISOString(),
                version: this.version,
                data: allAttendance
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    },

    // Import data from JSON (for restore purposes)
    async importData(exportedData) {
        try {
            if (!exportedData || !exportedData.data) {
                throw new Error('Invalid import data format');
            }

            const attendanceByDate = exportedData.data;
            const dates = Object.keys(attendanceByDate);
            let importedCount = 0;

            for (const date of dates) {
                try {
                    await this.saveAttendance(date, attendanceByDate[date]);
                    importedCount++;
                } catch (error) {
                    console.error(`Failed to import date ${date}:`, error);
                }
            }

            console.log(`✓ Successfully imported ${importedCount} dates`);
            return { imported: importedCount };
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }
};
