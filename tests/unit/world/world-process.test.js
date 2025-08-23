// Unit tests for World Management Process
// Tests basic world functionality using mock AO environment

const { TestAgent } = require('../../mock-agents/test-agent');
const { MockAO } = require('../../mock-agents/mock-ao');

class WorldProcessTest {
    constructor() {
        this.testAgent = new TestAgent('test_world_client');
        this.mockWorld = new MockAO();
        this.setupWorldHandlers();
    }

    // Setup mock world process handlers (simplified simulation)
    setupWorldHandlers() {
        // Mock state
        this.worldState = {
            world_id: "",
            agents: {},
            environment: {
                weather: "sunny",
                time_of_day: "day", 
                season: "spring"
            },
            locations: {},
            events: []
        };

        // Init handler
        this.mockWorld.addHandler("init", "Action", "Init", (msg) => {
            this.worldState.world_id = msg.Tags.WorldId || `world_${msg.Timestamp}`;
            
            this.mockWorld.send({
                Target: msg.From,
                Action: "Init-Response",
                WorldId: this.worldState.world_id,
                Data: JSON.stringify({
                    status: "initialized",
                    world_id: this.worldState.world_id,
                    timestamp: msg.Timestamp
                })
            });
        });

        // Register agent handler
        this.mockWorld.addHandler("register-agent", "Action", "Register-Agent", (msg) => {
            const agentId = msg.From;
            
            this.worldState.agents[agentId] = {
                id: agentId,
                location: msg.Tags.Location || "spawn_point",
                status: "active",
                joined_at: msg.Timestamp
            };

            this.mockWorld.send({
                Target: msg.From,
                Action: "Registration-Response",
                AgentId: agentId,
                Data: JSON.stringify({
                    status: "registered",
                    location: this.worldState.agents[agentId].location,
                    world_id: this.worldState.world_id
                })
            });
        });

        // World state query handler
        this.mockWorld.addHandler("get-world-state", "Action", "Get-World-State", (msg) => {
            this.mockWorld.send({
                Target: msg.From,
                Action: "World-State-Response",
                Data: JSON.stringify({
                    world_id: this.worldState.world_id,
                    environment: this.worldState.environment,
                    agent_count: Object.keys(this.worldState.agents).length,
                    locations: this.worldState.locations
                })
            });
        });

        // Health check handler
        this.mockWorld.addHandler("health-check", "Action", "Health-Check", (msg) => {
            this.mockWorld.send({
                Target: msg.From,
                Action: "Health-Response",
                Data: JSON.stringify({
                    status: "healthy",
                    world_id: this.worldState.world_id,
                    uptime: msg.Timestamp,
                    agents_active: Object.keys(this.worldState.agents).length
                })
            });
        });

        // Connect mock world responses to test agent
        this.mockWorld.onMessage = (message) => {
            this.testAgent.receiveMessage(message);
        };
    }

    async testWorldInitialization() {
        console.log('\n=== Testing World Initialization ===');
        
        // Set expectation
        this.testAgent.expectResponse("Init-Response", (msg) => {
            const data = JSON.parse(msg.Data);
            return data.status === "initialized" && data.world_id === "test_world_123";
        });

        // Send init message
        const initMessage = this.testAgent.sendMessage(
            'world_process',
            'Init',
            { WorldId: 'test_world_123' }
        );
        
        this.mockWorld.processMessage(initMessage);

        // Verify results
        const report = this.testAgent.getTestReport();
        console.log(`World initialization test: ${report.success ? 'PASSED' : 'FAILED'}`);
        
        return report.success;
    }

    async testAgentRegistration() {
        console.log('\n=== Testing Agent Registration ===');
        
        this.testAgent.reset();
        
        // Set expectation
        this.testAgent.expectResponse("Registration-Response", (msg) => {
            const data = JSON.parse(msg.Data);
            return data.status === "registered" && data.location === "forest_entrance";
        });

        // Send registration message
        const regMessage = this.testAgent.sendMessage(
            'world_process',
            'Register-Agent',
            { Location: 'forest_entrance' }
        );
        
        this.mockWorld.processMessage(regMessage);

        // Verify results
        const report = this.testAgent.getTestReport();
        console.log(`Agent registration test: ${report.success ? 'PASSED' : 'FAILED'}`);
        
        return report.success;
    }

    async testWorldStateQuery() {
        console.log('\n=== Testing World State Query ===');
        
        this.testAgent.reset();
        
        // Set expectation
        this.testAgent.expectResponse("World-State-Response", (msg) => {
            const data = JSON.parse(msg.Data);
            return data.environment && data.environment.weather === "sunny";
        });

        // Send state query
        const stateMessage = this.testAgent.sendMessage(
            'world_process',
            'Get-World-State'
        );
        
        this.mockWorld.processMessage(stateMessage);

        // Verify results
        const report = this.testAgent.getTestReport();
        console.log(`World state query test: ${report.success ? 'PASSED' : 'FAILED'}`);
        
        return report.success;
    }

    async testHealthCheck() {
        console.log('\n=== Testing Health Check ===');
        
        this.testAgent.reset();
        
        // Set expectation
        this.testAgent.expectResponse("Health-Response", (msg) => {
            const data = JSON.parse(msg.Data);
            return data.status === "healthy" && data.world_id;
        });

        // Send health check
        const healthMessage = this.testAgent.sendMessage(
            'world_process',
            'Health-Check'
        );
        
        this.mockWorld.processMessage(healthMessage);

        // Verify results
        const report = this.testAgent.getTestReport();
        console.log(`Health check test: ${report.success ? 'PASSED' : 'FAILED'}`);
        
        return report.success;
    }

    async runAllTests() {
        console.log('Starting World Process Tests...\n');
        
        const results = [];
        
        results.push(await this.testWorldInitialization());
        results.push(await this.testAgentRegistration());
        results.push(await this.testWorldStateQuery());
        results.push(await this.testHealthCheck());
        
        const passedTests = results.filter(r => r).length;
        const totalTests = results.length;
        
        console.log(`\n=== World Process Test Summary ===`);
        console.log(`Passed: ${passedTests}/${totalTests}`);
        console.log(`Status: ${passedTests === totalTests ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
        
        return passedTests === totalTests;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new WorldProcessTest();
    tester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { WorldProcessTest };