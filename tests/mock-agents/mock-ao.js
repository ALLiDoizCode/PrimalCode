// Mock AO Environment for Testing
// Simulates the AO runtime environment for local testing of processes

class MockAO {
    constructor() {
        this.messages = [];
        this.handlers = new Map();
        this.state = {};
        this.processId = `mock_process_${Date.now()}`;
    }

    // Mock ao.send function
    send(message) {
        const fullMessage = {
            ...message,
            From: this.processId,
            Timestamp: Date.now(),
            ...message
        };
        
        this.messages.push(fullMessage);
        console.log('AO Send:', JSON.stringify(fullMessage, null, 2));
        
        // If this is a response to a test, call any registered response handlers
        if (this.onMessage) {
            this.onMessage(fullMessage);
        }
    }

    // Mock Handlers.add function
    addHandler(name, tagName, tagValue, handlerFunction) {
        this.handlers.set(name, {
            tagName,
            tagValue,
            handler: handlerFunction
        });
        console.log(`Handler registered: ${name} (${tagName}: ${tagValue})`);
    }

    // Simulate incoming message processing
    processMessage(message) {
        const fullMessage = {
            From: `external_${Date.now()}`,
            Timestamp: Date.now(),
            Tags: {},
            Data: '',
            ...message
        };

        console.log('Processing message:', JSON.stringify(fullMessage, null, 2));

        // Find matching handler
        for (const [name, {tagName, tagValue, handler}] of this.handlers) {
            if (fullMessage.Tags[tagName] === tagValue || 
                (tagName === 'Action' && fullMessage.Action === tagValue)) {
                console.log(`Executing handler: ${name}`);
                try {
                    handler(fullMessage);
                } catch (error) {
                    console.error(`Handler ${name} error:`, error);
                }
                break;
            }
        }
    }

    // Get all sent messages
    getMessages() {
        return [...this.messages];
    }

    // Clear message history
    clearMessages() {
        this.messages = [];
    }

    // Get registered handlers
    getHandlers() {
        return Array.from(this.handlers.keys());
    }
}

module.exports = { MockAO };