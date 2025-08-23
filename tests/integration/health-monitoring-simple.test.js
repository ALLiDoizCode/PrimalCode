// Simple integration test for health monitoring system
describe('Health Monitoring System', () => {
    test('should validate implementation files exist', () => {
        const fs = require('fs');
        const path = require('path');
        
        const requiredFiles = [
            'shared/types/health.d.tl',
            'shared/utils/process-registry.tl',
            'ao-processes/health-monitor/src/main.lua'
        ];
        
        requiredFiles.forEach(file => {
            const filePath = path.join(__dirname, '../../', file);
            expect(fs.existsSync(filePath)).toBe(true);
        });
    });
    
    test('should have health monitoring handlers', () => {
        const fs = require('fs');
        const path = require('path');
        
        const mainFile = path.join(__dirname, '../../ao-processes/health-monitor/src/main.lua');
        const content = fs.readFileSync(mainFile, 'utf8');
        
        expect(content).toContain('health-check');
        expect(content).toContain('process-heartbeat');
        expect(content).toContain('get-system-status');
    });
});