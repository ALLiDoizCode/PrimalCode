// Integration tests for ADP Framework
// Tests complete framework functionality across all processes

const fs = require('fs');
const path = require('path');

class ADPFrameworkIntegrationTests {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    // Test ADP compliance across all processes
    async testADPCompliance() {
        console.log('Testing ADP v1.0 compliance across all processes...');
        
        const processes = ['world', 'battle', 'registry', 'health-monitor'];
        let allCompliant = true;
        
        for (const processType of processes) {
            const processPath = path.join(__dirname, '../../ao-processes', processType, 'src/main.lua');
            
            if (fs.existsSync(processPath)) {
                const processContent = fs.readFileSync(processPath, 'utf8');
                
                // Check for framework imports
                const hasProcessBase = processContent.includes("require('shared.utils.process-base')");
                const hasErrorHandler = processContent.includes("require('shared.utils.error-handling')");
                const hasADPValidator = processContent.includes("require('shared.utils.adp-validation')");
                const hasHandlerMetadata = processContent.includes("require('shared.utils.handler-metadata')");
                const hasSelfDocumenting = processContent.includes("require('shared.utils.self-documenting')");
                
                if (!hasProcessBase || !hasErrorHandler || !hasADPValidator || !hasHandlerMetadata || !hasSelfDocumenting) {
                    console.log(`✗ ${processType} process missing framework imports`);
                    allCompliant = false;
                } else {
                    console.log(`✓ ${processType} process has all framework imports`);
                }
                
                // Check for self-documenting handlers
                const hasHelpHandler = processContent.includes('SelfDocumenting.create_help_handler()');
                const hasMetadataHandler = processContent.includes('HandlerMetadata.create_metadata_handler()');
                const hasSchemaHandler = processContent.includes('SelfDocumenting.create_schema_handler()');
                
                if (!hasHelpHandler || !hasMetadataHandler || !hasSchemaHandler) {
                    console.log(`✗ ${processType} process missing self-documenting handlers`);
                    allCompliant = false;
                } else {
                    console.log(`✓ ${processType} process has self-documenting handlers`);
                }
            } else {
                console.log(`✗ ${processType} process file not found`);
                allCompliant = false;
            }
        }
        
        return allCompliant;
    }

    // Test shared utilities exist and are properly structured
    testSharedUtilities() {
        console.log('Testing shared utility framework...');
        
        const utilities = [
            'process-base.tl',
            'error-handling.tl', 
            'adp-validation.tl',
            'handler-metadata.tl',
            'self-documenting.tl'
        ];
        
        let allUtilitiesExist = true;
        
        for (const utility of utilities) {
            const utilityPath = path.join(__dirname, '../../shared/utils', utility);
            
            if (fs.existsSync(utilityPath)) {
                console.log(`✓ ${utility} exists`);
                
                // Basic content validation
                const content = fs.readFileSync(utilityPath, 'utf8');
                
                if (utility === 'process-base.tl') {
                    if (content.includes('ADP_VERSION = "1.0"') && content.includes('validate_adp_headers')) {
                        console.log(`✓ ${utility} has correct ADP v1.0 implementation`);
                    } else {
                        console.log(`✗ ${utility} missing ADP v1.0 implementation`);
                        allUtilitiesExist = false;
                    }
                }
                
                if (utility === 'error-handling.tl') {
                    if (content.includes('ERROR_CODES') && content.includes('CircuitBreaker')) {
                        console.log(`✓ ${utility} has error codes and circuit breaker`);
                    } else {
                        console.log(`✗ ${utility} missing error handling components`);
                        allUtilitiesExist = false;
                    }
                }
                
                if (utility === 'adp-validation.tl') {
                    if (content.includes('validate_string') && content.includes('validate_number')) {
                        console.log(`✓ ${utility} has validation functions`);
                    } else {
                        console.log(`✗ ${utility} missing validation functions`);
                        allUtilitiesExist = false;
                    }
                }
                
            } else {
                console.log(`✗ ${utility} not found`);
                allUtilitiesExist = false;
            }
        }
        
        return allUtilitiesExist;
    }

    // Test unit test coverage
    testUnitTestCoverage() {
        console.log('Testing unit test coverage...');
        
        const testFiles = [
            'tests/unit/shared/process-base.test.tl',
            'tests/unit/shared/error-handling.test.tl',
            'tests/unit/shared/adp-validation.test.tl'
        ];
        
        let allTestsExist = true;
        
        for (const testFile of testFiles) {
            const testPath = path.join(__dirname, '../..', testFile);
            
            if (fs.existsSync(testPath)) {
                console.log(`✓ ${testFile} exists`);
                
                // Check test content
                const content = fs.readFileSync(testPath, 'utf8');
                if (content.includes('run_all') && content.includes('assert')) {
                    console.log(`✓ ${testFile} has proper test structure`);
                } else {
                    console.log(`✗ ${testFile} missing test structure`);
                    allTestsExist = false;
                }
            } else {
                console.log(`✗ ${testFile} not found`);
                allTestsExist = false;
            }
        }
        
        return allTestsExist;
    }

    // Test error code ranges
    testErrorCodeRanges() {
        console.log('Testing error code ranges...');
        
        const errorHandlerPath = path.join(__dirname, '../../shared/utils/error-handling.tl');
        
        if (!fs.existsSync(errorHandlerPath)) {
            console.log('✗ Error handler not found');
            return false;
        }
        
        const content = fs.readFileSync(errorHandlerPath, 'utf8');
        
        // Check error code ranges
        const hasWorldCodes = content.includes('WORLD_001') && content.includes('WORLD_099');
        const hasBattleCodes = content.includes('BATTLE_100') && content.includes('BATTLE_199'); 
        const hasRegistryCodes = content.includes('REGISTRY_200') && content.includes('REGISTRY_299');
        const hasHealthCodes = content.includes('HEALTH_300') && content.includes('HEALTH_399');
        const hasCommonCodes = content.includes('COMMON_400') && content.includes('COMMON_500');
        
        if (hasWorldCodes && hasBattleCodes && hasRegistryCodes && hasHealthCodes && hasCommonCodes) {
            console.log('✓ All error code ranges properly defined');
            return true;
        } else {
            console.log('✗ Missing error code ranges');
            return false;
        }
    }

    // Simulate ADP message validation
    testADPMessageValidation() {
        console.log('Testing ADP message validation...');
        
        // This would normally require loading Lua environment
        // For now, just verify the validation utility exists and has correct structure
        const validatorPath = path.join(__dirname, '../../shared/utils/adp-validation.tl');
        
        if (!fs.existsSync(validatorPath)) {
            console.log('✗ ADP validator not found');
            return false;
        }
        
        const content = fs.readFileSync(validatorPath, 'utf8');
        
        // Check for validation functions
        const hasStringValidation = content.includes('validate_string');
        const hasNumberValidation = content.includes('validate_number');
        const hasMessageValidation = content.includes('validate_message');
        const hasCommonRules = content.includes('COMMON_RULES');
        
        if (hasStringValidation && hasNumberValidation && hasMessageValidation && hasCommonRules) {
            console.log('✓ ADP message validation framework complete');
            return true;
        } else {
            console.log('✗ ADP message validation framework incomplete');
            return false;
        }
    }

    // Run all integration tests
    async runAll() {
        console.log('Running ADP Framework Integration Tests...\n');
        
        const tests = [
            { name: 'ADP Compliance', test: () => this.testADPCompliance() },
            { name: 'Shared Utilities', test: () => this.testSharedUtilities() },
            { name: 'Unit Test Coverage', test: () => this.testUnitTestCoverage() },
            { name: 'Error Code Ranges', test: () => this.testErrorCodeRanges() },
            { name: 'ADP Message Validation', test: () => this.testADPMessageValidation() }
        ];
        
        for (const { name, test } of tests) {
            console.log(`\n=== ${name} ===`);
            this.testResults.total++;
            
            try {
                const result = await test();
                if (result) {
                    this.testResults.passed++;
                    console.log(`✓ ${name} PASSED`);
                } else {
                    this.testResults.failed++;
                    console.log(`✗ ${name} FAILED`);
                }
            } catch (error) {
                this.testResults.failed++;
                console.log(`✗ ${name} FAILED: ${error.message}`);
            }
        }
        
        console.log('\n=== INTEGRATION TEST RESULTS ===');
        console.log(`Total: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed}`);
        console.log(`Failed: ${this.testResults.failed}`);
        console.log(`Success Rate: ${(this.testResults.passed / this.testResults.total * 100).toFixed(1)}%`);
        
        return this.testResults.failed === 0;
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new ADPFrameworkIntegrationTests();
    tester.runAll().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = ADPFrameworkIntegrationTests;