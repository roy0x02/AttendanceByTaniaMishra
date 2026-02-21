// Clear Browser Storage Script
// Run this in the browser console if you encounter quota exceeded errors

console.log('=== Storage Cleanup Utility ===');

// Check current storage usage
if (typeof DocumentManager !== 'undefined') {
    const stats = DocumentManager.getStorageStats();
    console.log(`Current Storage Usage:`);
    console.log(`- Documents: ${stats.totalDocuments}`);
    console.log(`- Total Size: ${stats.totalSizeMB} MB`);
    console.log(`- Usage: ${stats.usagePercentage}% of estimated ${stats.estimatedLimit} limit`);

    console.log('\nTo clear all documents, run:');
    console.log('DocumentManager.clearAllDocuments()');
} else {
    console.log('DocumentManager not found. Clearing localStorage directly...');
    localStorage.removeItem('attendance_documents');
    console.log('✓ Documents cleared');
}

console.log('\n=== Storage Cleanup Complete ===');
