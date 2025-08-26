/**
 * Handler Testing Interface - Enhanced debug interface for AO process handler testing
 * Migrated from HTML to React with 8bitcn gaming components
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/8bit/button'
import { Badge } from '@/components/ui/8bit/badge'
import { Input } from '@/components/ui/8bit/input'
import { DebugLayout, DebugPanel, DebugGrid, DebugStats } from '@/components/debug/debug-layout'
import { useHandlerTestingDebug, useDebugProcessDiscovery } from '@/lib/debug/debug-data-client'
import { HandlerTestData } from '@/lib/debug/debug-types'

interface TestSuite {
  id: string
  name: string
  description: string
  tests: HandlerTest[]
}

interface HandlerTest {
  id: string
  handler_name: string
  test_name: string
  message_input: any
  expected_output: any
  enabled: boolean
}

export default function HandlerTestingPage() {
  const [selectedTestSuiteId, setSelectedTestSuiteId] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedTest, setSelectedTest] = useState<string>('')
  const [testMessage, setTestMessage] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  // Discover available test suites
  const {
    processes: testSuites,
    loading: suitesLoading,
    refreshProcessList
  } = useDebugProcessDiscovery('test-suite')

  // Connect to handler testing WebSocket
  const {
    data: testData,
    connected,
    error,
    historicalData,
    isLoading,
    subscribeToProcess,
    unsubscribeFromProcess
  } = useHandlerTestingDebug(selectedTestSuiteId)

  const handleSuiteSelect = useCallback((suiteId: string) => {
    if (selectedTestSuiteId) {
      unsubscribeFromProcess(selectedTestSuiteId)
    }
    setSelectedTestSuiteId(suiteId)
    if (suiteId) {
      subscribeToProcess(suiteId)
    }
  }, [selectedTestSuiteId, subscribeToProcess, unsubscribeFromProcess])

  const handleRefresh = useCallback(() => {
    if (selectedTestSuiteId) {
      subscribeToProcess(selectedTestSuiteId)
    }
    refreshProcessList()
  }, [selectedTestSuiteId, subscribeToProcess, refreshProcessList])

  // Mock test suites for demonstration
  const mockTestSuites: TestSuite[] = [
    {
      id: 'world-handlers',
      name: 'World Process Handlers',
      description: 'Tests for world process message handlers',
      tests: [
        {
          id: 'move-test',
          handler_name: 'move',
          test_name: 'Valid Move Action',
          message_input: { Action: 'move', Direction: 'north', 'Agent-Id': 'agent_001' },
          expected_output: { success: true, new_position: { x: 5, y: 2 } },
          enabled: true
        },
        {
          id: 'encounter-test',
          handler_name: 'encounter-check',
          test_name: 'Encounter Check',
          message_input: { Action: 'encounter-check', 'Agent-Id': 'agent_001' },
          expected_output: { encounter_found: false },
          enabled: true
        }
      ]
    },
    {
      id: 'battle-handlers',
      name: 'Battle Process Handlers',
      description: 'Tests for battle process message handlers',
      tests: [
        {
          id: 'battle-action-test',
          handler_name: 'battle-action',
          test_name: 'Submit Battle Action',
          message_input: { Action: 'battle-action', Move: 'tackle', Target: 'opponent' },
          expected_output: { action_accepted: true, damage_dealt: 25 },
          enabled: true
        }
      ]
    }
  ]

  // Calculate testing statistics
  const testStats = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return []

    const totalTests = historicalData.length
    const passedTests = historicalData.filter(t => t.test_result === 'passed').length
    const failedTests = historicalData.filter(t => t.test_result === 'failed').length
    const avgExecutionTime = historicalData.reduce((sum, t) => sum + (t.execution_time_ms || 0), 0) / totalTests

    return [
      {
        label: 'Total Tests',
        value: totalTests,
        icon: '🧪',
        variant: 'default' as const
      },
      {
        label: 'Pass Rate',
        value: `${Math.round((passedTests / totalTests) * 100)}%`,
        icon: '✅',
        variant: passedTests / totalTests > 0.8 ? ('success' as const) : ('warning' as const)
      },
      {
        label: 'Failed Tests',
        value: failedTests,
        icon: '❌',
        variant: failedTests > 0 ? ('destructive' as const) : ('success' as const)
      },
      {
        label: 'Avg Time',
        value: `${Math.round(avgExecutionTime)}ms`,
        icon: '⏱️',
        variant: 'default' as const
      }
    ]
  }, [historicalData])

  // Handle running a test
  const handleRunTest = useCallback(async (test: HandlerTest) => {
    setIsRunning(true)
    setSelectedTest(test.id)
    
    try {
      // In a real implementation, this would send the test to the WebSocket
      console.log('Running test:', test)
      
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error('Test execution failed:', error)
    } finally {
      setIsRunning(false)
    }
  }, [])

  // Handle custom test execution
  const handleRunCustomTest = useCallback(async () => {
    if (!testMessage.trim()) return
    
    setIsRunning(true)
    try {
      const message = JSON.parse(testMessage)
      // Send custom test message via WebSocket
      console.log('Running custom test:', message)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error('Custom test execution failed:', error)
    } finally {
      setIsRunning(false)
    }
  }, [testMessage])

  return (
    <DebugLayout
      title="🧪 Handler Testing Interface"
      subtitle="AO process handler testing and validation"
      connectionStatus={connected ? 'connected' : 'disconnected'}
      onRefresh={handleRefresh}
      autoRefreshEnabled={autoRefresh}
      onToggleAutoRefresh={setAutoRefresh}
      breadcrumbs={[{ label: 'Handler Testing' }]}
    >
      <div className="space-y-6">
        {/* Test Suite Selection */}
        <DebugPanel title="Test Suite Selection" icon="🎯">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Test Suite</label>
              <select
                value={selectedTestSuiteId}
                onChange={(e) => handleSuiteSelect(e.target.value)}
                className="w-full p-3 border border-input bg-background rounded-md"
                disabled={suitesLoading}
              >
                <option value="">Select a test suite...</option>
                {mockTestSuites.map((suite) => (
                  <option key={suite.id} value={suite.id}>
                    {suite.name} ({suite.tests.length} tests)
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={refreshProcessList}
              variant="outline"
              disabled={suitesLoading}
            >
              {suitesLoading ? '⏳' : '🔄'} Refresh
            </Button>
          </div>
        </DebugPanel>

        {/* Testing Overview Stats */}
        {testStats.length > 0 && (
          <DebugStats stats={testStats} />
        )}

        {/* Main Testing Interface */}
        {selectedTestSuiteId && (
          <div className="space-y-6">
            {/* Test Suite Details */}
            <DebugPanel title="Test Suite Details" icon="📋">
              {(() => {
                const suite = mockTestSuites.find(s => s.id === selectedTestSuiteId)
                if (!suite) return <div>Test suite not found</div>
                
                return (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">{suite.name}</h3>
                      <p className="text-muted-foreground">{suite.description}</p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {suite.tests.length} tests available, {suite.tests.filter(t => t.enabled).length} enabled
                      </span>
                      <Button
                        onClick={() => {
                          // Run all enabled tests
                          suite.tests.filter(t => t.enabled).forEach(test => {
                            handleRunTest(test)
                          })
                        }}
                        disabled={isRunning}
                      >
                        {isRunning ? '⏳ Running...' : '🚀 Run All Tests'}
                      </Button>
                    </div>
                  </div>
                )
              })()}
            </DebugPanel>

            <DebugGrid columns={2}>
              {/* Available Tests */}
              <DebugPanel title="Available Tests" icon="📝">
                {(() => {
                  const suite = mockTestSuites.find(s => s.id === selectedTestSuiteId)
                  if (!suite) return null
                  
                  return (
                    <TestListView 
                      tests={suite.tests} 
                      onRunTest={handleRunTest}
                      isRunning={isRunning}
                      selectedTest={selectedTest}
                    />
                  )
                })()}
              </DebugPanel>

              {/* Custom Test Input */}
              <DebugPanel title="Custom Test" icon="⚡">
                <CustomTestView
                  testMessage={testMessage}
                  setTestMessage={setTestMessage}
                  onRunTest={handleRunCustomTest}
                  isRunning={isRunning}
                />
              </DebugPanel>

              {/* Test Results */}
              <DebugPanel 
                title="Test Results" 
                icon="📊"
                className="lg:col-span-2"
              >
                {testData && (
                  <TestResultsView testData={testData} />
                )}
                {historicalData && historicalData.length > 0 && (
                  <TestHistoryView history={historicalData.slice(0, 10)} />
                )}
              </DebugPanel>
            </DebugGrid>
          </div>
        )}

        {/* No Suite Selected State */}
        {!selectedTestSuiteId && (
          <DebugPanel title="Getting Started" icon="🎮">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🧪</div>
              <h3 className="text-lg font-semibold mb-2">Select a Test Suite</h3>
              <p className="text-muted-foreground mb-6">
                Choose a test suite from the dropdown above to start testing AO process handlers.
              </p>
              <div className="flex justify-center">
                <Button onClick={refreshProcessList} disabled={suitesLoading}>
                  {suitesLoading ? '⏳ Loading...' : '🔍 Find Test Suites'}
                </Button>
              </div>
            </div>
          </DebugPanel>
        )}
      </div>
    </DebugLayout>
  )
}

/**
 * Test List View Component
 */
function TestListView({ 
  tests, 
  onRunTest, 
  isRunning, 
  selectedTest 
}: { 
  tests: HandlerTest[]
  onRunTest: (test: HandlerTest) => void
  isRunning: boolean
  selectedTest: string
}) {
  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {tests.map((test) => (
        <div
          key={test.id}
          className={`p-4 border rounded-lg ${
            selectedTest === test.id ? 'border-primary bg-primary/10' : 'hover:bg-card/50'
          } transition-colors`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-primary">{test.test_name}</h4>
              <Badge variant="outline" className="text-xs">
                {test.handler_name}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {!test.enabled && (
                <Badge variant="secondary" className="text-xs">
                  Disabled
                </Badge>
              )}
              <Button
                size="sm"
                onClick={() => onRunTest(test)}
                disabled={!test.enabled || isRunning}
              >
                {isRunning && selectedTest === test.id ? '⏳' : '▶️'} Run
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <div className="mb-1">
              <strong>Input:</strong> {JSON.stringify(test.message_input, null, 2).slice(0, 100)}...
            </div>
            <div>
              <strong>Expected:</strong> {JSON.stringify(test.expected_output, null, 2).slice(0, 100)}...
            </div>
          </div>
        </div>
      ))}
      
      {tests.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tests available in this suite</p>
        </div>
      )}
    </div>
  )
}

/**
 * Custom Test View Component
 */
function CustomTestView({
  testMessage,
  setTestMessage,
  onRunTest,
  isRunning
}: {
  testMessage: string
  setTestMessage: (message: string) => void
  onRunTest: () => void
  isRunning: boolean
}) {
  const [isValidJSON, setIsValidJSON] = useState(true)

  const handleMessageChange = (value: string) => {
    setTestMessage(value)
    
    if (value.trim()) {
      try {
        JSON.parse(value)
        setIsValidJSON(true)
      } catch {
        setIsValidJSON(false)
      }
    } else {
      setIsValidJSON(true)
    }
  }

  const insertTemplate = (template: any) => {
    setTestMessage(JSON.stringify(template, null, 2))
    setIsValidJSON(true)
  }

  const messageTemplates = [
    {
      name: 'Move Action',
      template: {
        Action: 'move',
        Direction: 'north',
        'Agent-Id': 'agent_001'
      }
    },
    {
      name: 'Battle Action',
      template: {
        Action: 'battle-action',
        Move: 'tackle',
        Target: 'opponent',
        'Battle-Id': 'battle_001'
      }
    },
    {
      name: 'Health Check',
      template: {
        Action: 'health-check'
      }
    }
  ]

  return (
    <div className="space-y-4">
      {/* Message Templates */}
      <div>
        <label className="block text-sm font-medium mb-2">Quick Templates</label>
        <div className="flex flex-wrap gap-2">
          {messageTemplates.map((template) => (
            <Button
              key={template.name}
              variant="outline"
              size="sm"
              onClick={() => insertTemplate(template.template)}
            >
              {template.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Message Input */}
      <div>
        <label className="block text-sm font-medium mb-2">Custom Message JSON</label>
        <textarea
          value={testMessage}
          onChange={(e) => handleMessageChange(e.target.value)}
          placeholder="Enter your test message as JSON..."
          className={`w-full p-3 border rounded-md bg-background font-mono text-sm h-32 ${
            !isValidJSON ? 'border-red-500' : 'border-input'
          }`}
        />
        {!isValidJSON && (
          <p className="text-red-500 text-sm mt-1">Invalid JSON format</p>
        )}
      </div>

      {/* Run Button */}
      <Button
        onClick={onRunTest}
        disabled={!testMessage.trim() || !isValidJSON || isRunning}
        className="w-full"
      >
        {isRunning ? '⏳ Running Custom Test...' : '🚀 Run Custom Test'}
      </Button>
    </div>
  )
}

/**
 * Test Results View Component
 */
function TestResultsView({ testData }: { testData: HandlerTestData }) {
  const getResultVariant = (result: string) => {
    switch (result) {
      case 'passed': return 'default'
      case 'failed': return 'destructive'
      case 'pending': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-card border rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-primary">
              {testData.handler_name} Test
            </h3>
            <Badge variant={getResultVariant(testData.test_result || 'pending')}>
              {(testData.test_result || 'pending').toUpperCase()}
            </Badge>
          </div>
          {testData.execution_time_ms && (
            <span className="text-sm text-muted-foreground">
              {testData.execution_time_ms}ms
            </span>
          )}
        </div>

        <div className="grid gap-4">
          {/* Input */}
          <div>
            <h4 className="font-medium mb-2">Input Message</h4>
            <pre className="p-3 bg-secondary rounded text-sm overflow-x-auto">
              {JSON.stringify(testData.message_input, null, 2)}
            </pre>
          </div>

          {/* Expected Output */}
          <div>
            <h4 className="font-medium mb-2">Expected Output</h4>
            <pre className="p-3 bg-secondary rounded text-sm overflow-x-auto">
              {JSON.stringify(testData.expected_output, null, 2)}
            </pre>
          </div>

          {/* Actual Output */}
          {testData.actual_output && (
            <div>
              <h4 className="font-medium mb-2">Actual Output</h4>
              <pre className="p-3 bg-secondary rounded text-sm overflow-x-auto">
                {JSON.stringify(testData.actual_output, null, 2)}
              </pre>
            </div>
          )}

          {/* Error Message */}
          {testData.error_message && (
            <div>
              <h4 className="font-medium mb-2 text-red-500">Error</h4>
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {testData.error_message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Test History View Component
 */
function TestHistoryView({ history }: { history: HandlerTestData[] }) {
  const getResultColor = (result: string) => {
    switch (result) {
      case 'passed': return 'text-green-500'
      case 'failed': return 'text-red-500'
      case 'pending': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="mt-6">
      <h4 className="font-medium mb-3">Recent Test History</h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {history.map((test, index) => (
          <div
            key={`${test.test_id}-${index}`}
            className="flex items-center justify-between p-2 border rounded text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{test.handler_name}</span>
              <span className={`font-medium ${getResultColor(test.test_result || 'pending')}`}>
                {(test.test_result || 'pending').toUpperCase()}
              </span>
            </div>
            <div className="text-muted-foreground">
              {test.execution_time_ms}ms • {new Date(test.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {history.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <p>No test history available</p>
          </div>
        )}
      </div>
    </div>
  )
}