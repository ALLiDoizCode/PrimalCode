// Test Agent for simulating external agent interactions
// Used to test AO processes by sending messages and validating responses

const { MockAO } = require('./mock-ao');

class TestAgent {
    constructor(agentId) {
        this.agentId = agentId || `test_agent_${Date.now()}`;
        this.ao = new MockAO();
        this.receivedMessages = [];
        this.expectations = [];
    }

    // Send a message to a target process
    sendMessage(target, action, tags = {}, data = '') {
        const message = {
            Target: target,
            From: this.agentId,
            Action: action,
            Tags: { Action: action, ...tags },
            Data: data,
            Timestamp: Date.now()
        };

        console.log(`Test Agent ${this.agentId} sending:`, JSON.stringify(message, null, 2));
        return message;
    }

    // Register expectation for response validation
    expectResponse(action, validator = null) {
        const expectation = {
            action,
            validator,
            fulfilled: false,
            receivedAt: null
        };
        
        this.expectations.push(expectation);
        return expectation;
    }

    // Simulate receiving a response message
    receiveMessage(message) {
        this.receivedMessages.push({
            ...message,
            receivedAt: Date.now()
        });

        console.log(`Test Agent ${this.agentId} received:`, JSON.stringify(message, null, 2));

        // Check expectations
        for (const expectation of this.expectations) {
            if (!expectation.fulfilled && message.Action === expectation.action) {
                expectation.fulfilled = true;
                expectation.receivedAt = Date.now();
                
                if (expectation.validator) {
                    const isValid = expectation.validator(message);
                    expectation.valid = isValid;
                    
                    if (isValid) {
                        console.log(`✓ Expectation fulfilled: ${expectation.action}`);
                    } else {
                        console.log(`✗ Expectation validation failed: ${expectation.action}`);
                    }
                } else {
                    expectation.valid = true;
                    console.log(`✓ Expectation fulfilled: ${expectation.action}`);
                }
                break;
            }
        }
    }

    // Get all received messages
    getReceivedMessages() {
        return [...this.receivedMessages];
    }

    // Get messages of specific action type
    getMessagesByAction(action) {
        return this.receivedMessages.filter(msg => msg.Action === action);
    }

    // Check if all expectations were fulfilled
    allExpectationsFulfilled() {
        return this.expectations.every(exp => exp.fulfilled && exp.valid !== false);
    }

    // Get unfulfilled expectations
    getUnfulfilledExpectations() {
        return this.expectations.filter(exp => !exp.fulfilled || exp.valid === false);
    }

    // Clear all received messages and expectations
    reset() {
        this.receivedMessages = [];
        this.expectations = [];
    }

    // Generate test report
    getTestReport() {
        const totalExpectations = this.expectations.length;
        const fulfilledExpectations = this.expectations.filter(exp => exp.fulfilled && exp.valid !== false).length;
        
        return {
            agentId: this.agentId,
            totalMessages: this.receivedMessages.length,
            totalExpectations,
            fulfilledExpectations,
            success: totalExpectations === fulfilledExpectations,
            unfulfilled: this.getUnfulfilledExpectations(),
            messages: this.receivedMessages
        };
    }
}

module.exports = { TestAgent };