// Test Runner for AO Process Unit Tests
// Discovers and runs all test files in the tests directory

const fs = require('fs');
const path = require('path');

class TestRunner {
    constructor() {
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = [];
        this.testFiles = [];
    }

    // Discover test files recursively
    discoverTests(dir = './tests/unit') {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                this.discoverTests(fullPath);
            } else if (item.endsWith('.test.js')) {
                this.testFiles.push(fullPath);
            }
        }
    }

    // Run a single test file
    async runTestFile(testFile) {
        console.log(`\n🔍 Running ${testFile}...`);
        
        try {
            const TestClass = require(path.resolve(testFile));
            const testClassName = Object.keys(TestClass)[0];
            const TestConstructor = TestClass[testClassName];
            
            if (!TestConstructor) {
                throw new Error(`No test class found in ${testFile}`);
            }
            
            const testInstance = new TestConstructor();
            
            if (typeof testInstance.runAllTests !== 'function') {
                throw new Error(`Test class ${testClassName} must have runAllTests method`);
            }
            
            const result = await testInstance.runAllTests();
            
            if (result) {
                this.passedTests++;
                console.log(`✅ ${testFile} - PASSED`);
            } else {
                this.failedTests.push(testFile);
                console.log(`❌ ${testFile} - FAILED`);
            }
            
            this.totalTests++;
            
        } catch (error) {
            this.failedTests.push(testFile);
            this.totalTests++;
            console.error(`💥 ${testFile} - ERROR:`, error.message);
        }
    }

    // Run all discovered tests
    async runAllTests() {
        console.log('🚀 Starting AO Process Test Suite...\n');
        
        this.discoverTests();
        
        if (this.testFiles.length === 0) {
            console.log('⚠️  No test files found');
            return true;
        }
        
        console.log(`📋 Discovered ${this.testFiles.length} test files:`);
        this.testFiles.forEach(file => console.log(`   - ${file}`));
        
        for (const testFile of this.testFiles) {
            await this.runTestFile(testFile);
        }
        
        this.printSummary();
        
        return this.failedTests.length === 0;
    }

    // Print test execution summary
    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST EXECUTION SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Test Files: ${this.totalTests}`);
        console.log(`Passed: ${this.passedTests}`);
        console.log(`Failed: ${this.failedTests.length}`);
        console.log(`Success Rate: ${this.totalTests > 0 ? Math.round((this.passedTests / this.totalTests) * 100) : 0}%`);
        
        if (this.failedTests.length > 0) {
            console.log('\n❌ Failed Tests:');
            this.failedTests.forEach(file => console.log(`   - ${file}`));
        }
        
        console.log('\n' + (this.failedTests.length === 0 ? '🎉 ALL TESTS PASSED!' : '💔 SOME TESTS FAILED'));
        console.log('='.repeat(50));
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test runner error:', error);
        process.exit(1);
    });
}

module.exports = { TestRunner };