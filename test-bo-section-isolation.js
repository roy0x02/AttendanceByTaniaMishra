// ========================================
// BO Section Isolation Test Script
// Tests that each BO only sees their assigned sections
// ========================================

// Test results storage
const testResults = {
    passed: [],
    failed: [],
    details: []
};

// Function to test a single BO account
async function testBO(username, expectedSections) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing BO: ${username}`);
    console.log(`Expected Sections: ${expectedSections.join(', ')}`);
    console.log('='.repeat(60));

    try {
        // Get user credentials
        const userCreds = CONFIG.credentials[username];
        if (!userCreds) {
            throw new Error(`User ${username} not found in configuration`);
        }

        // Login as this BO
        const loginResult = AuthManager.login(username, userCreds.password);
        if (!loginResult.success) {
            throw new Error(`Login failed: ${loginResult.error}`);
        }

        // Get current user
        const currentUser = AuthManager.getCurrentUser();
        console.log(`✓ Logged in as: ${currentUser.name}`);
        console.log(`  Role: ${currentUser.role}`);
        console.log(`  Assigned Sections: ${currentUser.sections.join(', ')}`);

        // Verify sections match expected
        const sectionsMatch = JSON.stringify(currentUser.sections.sort()) ===
            JSON.stringify(expectedSections.sort());

        if (!sectionsMatch) {
            throw new Error(
                `Section mismatch! Expected: ${expectedSections.join(', ')}, ` +
                `Got: ${currentUser.sections.join(', ')}`
            );
        }
        console.log(`✓ Sections configuration correct`);

        // Get all attendance data
        const allAttendance = DataProcessor.getAllAttendanceRecords();
        console.log(`  Total attendance records in system: ${allAttendance.length}`);

        // Filter by permissions
        const filteredAttendance = AuthManager.filterAttendanceByPermissions(allAttendance);
        console.log(`  Records visible to BO: ${filteredAttendance.length}`);

        // Verify all filtered records belong to assigned sections
        const sectionsInData = [...new Set(filteredAttendance.map(r => r.section))].sort();
        console.log(`  Sections in visible data: ${sectionsInData.join(', ')}`);

        // Check if BO is seeing ONLY their sections
        const invalidRecords = filteredAttendance.filter(
            record => !expectedSections.includes(record.section)
        );

        if (invalidRecords.length > 0) {
            const invalidSections = [...new Set(invalidRecords.map(r => r.section))];
            throw new Error(
                `BO can see ${invalidRecords.length} records from unauthorized sections: ` +
                invalidSections.join(', ')
            );
        }
        console.log(`✓ All visible records belong to assigned sections`);

        // Check if there are records from sections the BO should NOT see
        const allSections = [...new Set(allAttendance.map(r => r.section))];
        const unauthorizedSections = allSections.filter(s => !expectedSections.includes(s));
        const leakedRecords = filteredAttendance.filter(
            r => unauthorizedSections.includes(r.section)
        );

        if (leakedRecords.length > 0) {
            throw new Error(
                `Data leak detected! BO can see ${leakedRecords.length} records from ` +
                `unauthorized sections`
            );
        }
        console.log(`✓ No data leakage from other sections`);

        // Get unique people visible
        const visiblePeople = [...new Set(filteredAttendance.map(r => r.name))];
        console.log(`  Unique people visible: ${visiblePeople.length}`);

        // Test passed
        console.log(`\n✅ PASS: ${username} sees only their assigned sections`);

        testResults.passed.push(username);
        testResults.details.push({
            username,
            name: currentUser.name,
            expectedSections,
            actualSections: currentUser.sections,
            visibleRecords: filteredAttendance.length,
            visiblePeople: visiblePeople.length,
            status: 'PASS'
        });

        return true;

    } catch (error) {
        console.error(`\n❌ FAIL: ${username}`);
        console.error(`   Error: ${error.message}`);

        testResults.failed.push(username);
        testResults.details.push({
            username,
            expectedSections,
            error: error.message,
            status: 'FAIL'
        });

        return false;
    } finally {
        // Logout after each test
        AuthManager.logout();
    }
}

// Run all BO tests
async function runAllBOTests() {
    console.log('\n🔍 STARTING BO SECTION ISOLATION TESTS');
    console.log('='.repeat(60));
    console.log('Testing that each BO sees ONLY their assigned sections and people');
    console.log('='.repeat(60));

    // Initialize data processor
    await DataProcessor.init();

    // Define all BOs to test (from config.js)
    const bosToTest = [
        { username: 'bo1', sections: ['Admin-I'] },
        { username: 'bo2', sections: ['Admin-II'] },
        { username: 'bo3', sections: ['Fund-I'] },
        { username: 'bo4', sections: ['Fund-II'] },
        { username: 'bo5', sections: ['AC-I'] },
        { username: 'bo6', sections: ['AC-II'] },
        { username: 'bo7', sections: ['AC-III'] }
    ];

    console.log(`\nTotal BOs to test: ${bosToTest.length}\n`);

    // Test each BO
    for (const bo of bosToTest) {
        await testBO(bo.username, bo.sections);
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Print summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${bosToTest.length}`);
    console.log(`✅ Passed: ${testResults.passed.length}`);
    console.log(`❌ Failed: ${testResults.failed.length}`);

    if (testResults.failed.length > 0) {
        console.log('\nFailed BOs:');
        testResults.failed.forEach(username => {
            console.log(`  - ${username}`);
        });
    }

    console.log('\nDetailed Results:');
    console.table(testResults.details);

    // Return summary
    return {
        total: bosToTest.length,
        passed: testResults.passed.length,
        failed: testResults.failed.length,
        details: testResults.details
    };
}

// Export for use in console
if (typeof window !== 'undefined') {
    window.runBOTests = runAllBOTests;
    window.testSingleBO = testBO;
    console.log('\n✨ BO Testing Tools Loaded!');
    console.log('Run tests with: runBOTests()');
}
