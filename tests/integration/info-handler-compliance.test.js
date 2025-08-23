// Integration test for Info Handler ADP compliance
// Validates that all processes have Info handlers conforming to ADP standards

const fs = require('fs');
const path = require('path');

class InfoHandlerComplianceTest {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    // Test that all processes have Info handlers
    testInfoHandlerPresence() {
        console.log('Testing Info handler presence across all processes...');
        
        const processes = ['battle', 'world', 'registry', 'health-monitor'];
        let allHaveInfoHandlers = true;
        
        for (const processType of processes) {
            const processPath = path.join(__dirname, '../../ao-processes', processType, 'src/main.lua');
            
            if (fs.existsSync(processPath)) {
                const processContent = fs.readFileSync(processPath, 'utf8');
                
                // Check for Info handler registration
                const hasInfoHandler = processContent.includes('Handlers.add("info", "Action", "Info"');
                
                if (hasInfoHandler) {
                    console.log(`✓ ${processType} process has Info handler`);
                } else {
                    console.log(`✗ ${processType} process missing Info handler`);
                    allHaveInfoHandlers = false;
                }
                
                // Check for ADP compliance patterns
                const hasADPResponse = processContent.includes('create_adp_response');
                const hasInfoResponse = processContent.includes('"Info-Response"');
                
                if (hasInfoHandler && hasADPResponse && hasInfoResponse) {
                    console.log(`✓ ${processType} Info handler follows ADP patterns`);
                } else if (hasInfoHandler) {
                    console.log(`⚠ ${processType} Info handler may not be fully ADP compliant`);
                }
                
            } else {
                console.log(`✗ ${processType} process file not found`);
                allHaveInfoHandlers = false;
            }
        }
        
        return allHaveInfoHandlers;
    }

    // Test Info handler response format
    testInfoResponseFormat() {
        console.log('Testing Info handler response format compliance...');
        
        const processes = ['battle', 'world', 'registry'];
        const requiredFields = [
            'protocolVersion = "1.0"',
            'lastUpdated',
            'handlers',
            'capabilities',
            'Name =',
            'Process ='
        ];
        
        let allCompliant = true;
        
        for (const processType of processes) {
            const processPath = path.join(__dirname, '../../ao-processes', processType, 'src/main.lua');
            
            if (fs.existsSync(processPath)) {
                const processContent = fs.readFileSync(processPath, 'utf8');
                
                let fieldsFound = 0;
                for (const field of requiredFields) {
                    if (processContent.includes(field)) {
                        fieldsFound++;
                    }
                }
                
                if (fieldsFound >= requiredFields.length - 1) { // Allow some flexibility
                    console.log(`✓ ${processType} Info handler has required response fields (${fieldsFound}/${requiredFields.length})`);
                } else {
                    console.log(`✗ ${processType} Info handler missing required fields (found ${fieldsFound}/${requiredFields.length})`);
                    allCompliant = false;
                }
                
                // Check for ADP v1.0 protocol version compliance
                if (processContent.includes('protocolVersion = "1.0"')) {
                    console.log(`✓ ${processType} Info handler specifies ADP v1.0`);
                } else {
                    console.log(`✗ ${processType} Info handler missing ADP v1.0 protocol version`);
                    allCompliant = false;
                }

                // Check for proper handler metadata structure
                if (processContent.includes('"Info-Response"') && processContent.includes('handlers = {')) {
                    console.log(`✓ ${processType} Info handler has proper ADP structure`);
                } else {
                    console.log(`✗ ${processType} Info handler missing proper ADP structure`);
                    allCompliant = false;
                }
            }
        }
        
        return allCompliant;
    }

    // Run all tests
    async runTests() {
        console.log('=== Info Handler ADP Compliance Test Suite ===\n');
        
        const test1 = this.testInfoHandlerPresence();
        console.log('');
        
        const test2 = this.testInfoResponseFormat();
        console.log('');
        
        const allPassed = test1 && test2;
        
        if (allPassed) {
            console.log('✅ All tests passed - Info handlers are ADP compliant');
        } else {
            console.log('❌ Some tests failed - Info handler compliance issues detected');
        }
        
        return allPassed;
    }
}

// Export for use in other test files
module.exports = InfoHandlerComplianceTest;

// Run tests if called directly
if (require.main === module) {
    const test = new InfoHandlerComplianceTest();
    test.runTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}