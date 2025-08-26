/**
 * Session Monitor - Enhanced debug interface for agent session tracking
 * Migrated from HTML to React with 8bitcn gaming components
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/8bit/button'
import { Badge } from '@/components/ui/8bit/badge'
import { Input } from '@/components/ui/8bit/input'
import { DebugLayout, DebugPanel, DebugGrid, DebugStats } from '@/components/debug/debug-layout'
import { useSessionMonitorDebug, useDebugProcessDiscovery, useDebugFiltering } from '@/lib/debug/debug-data-client'
import { SessionDebugData, SessionCheckpoint } from '@/lib/debug/debug-types'

export default function SessionMonitorPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('')

  // Discover available session processes
  const {
    processes: sessionProcesses,
    loading: processesLoading,
    refreshProcessList
  } = useDebugProcessDiscovery('session')

  // Connect to session monitor WebSocket
  const {
    data: sessionData,
    connected,
    error,
    historicalData,
    isLoading,
    subscribeToProcess,
    unsubscribeFromProcess
  } = useSessionMonitorDebug(selectedSessionId)

  const handleSessionSelect = useCallback((sessionId: string) => {
    if (selectedSessionId) {
      unsubscribeFromProcess(selectedSessionId)
    }
    setSelectedSessionId(sessionId)
    if (sessionId) {
      subscribeToProcess(sessionId)
    }
  }, [selectedSessionId, subscribeToProcess, unsubscribeFromProcess])

  const handleRefresh = useCallback(() => {
    if (selectedSessionId) {
      subscribeToProcess(selectedSessionId)
    }
    refreshProcessList()
  }, [selectedSessionId, subscribeToProcess, refreshProcessList])

  // Calculate session statistics
  const sessionStats = sessionData ? [
    {
      label: 'Session ID',
      value: sessionData.session_id.slice(-8),
      icon: '🆔',
      variant: 'default' as const
    },
    {
      label: 'Session State',
      value: sessionData.session_state.toUpperCase(),
      icon: sessionData.session_state === 'active' ? '🟢' : sessionData.session_state === 'recovering' ? '🟡' : '⚪',
      variant: sessionData.session_state === 'active' ? ('success' as const) : ('default' as const)
    },
    {
      label: 'Duration',
      value: `${Math.round(sessionData.session_duration_ms / 1000)}s`,
      icon: '⏱️',
      variant: 'default' as const
    },
    {
      label: 'Recovery Attempts',
      value: sessionData.recovery_attempts,
      icon: '🔄',
      variant: sessionData.recovery_attempts > 0 ? ('warning' as const) : ('success' as const)
    }
  ] : []

  // Format time since last heartbeat
  const formatTimeSince = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  }

  return (
    <DebugLayout
      title="👥 Session Monitor"
      subtitle="Agent session tracking and persistence monitoring"
      connectionStatus={connected ? 'connected' : 'disconnected'}
      onRefresh={handleRefresh}
      autoRefreshEnabled={autoRefresh}
      onToggleAutoRefresh={setAutoRefresh}
      breadcrumbs={[{ label: 'Session Monitor' }]}
    >
      <div className="space-y-6">
        {/* Session Selection */}
        <DebugPanel title="Session Selection" icon="🎯">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Session Process</label>
              <select
                value={selectedSessionId}
                onChange={(e) => handleSessionSelect(e.target.value)}
                className="w-full p-3 border border-input bg-background rounded-md"
                disabled={processesLoading}
              >
                <option value="">Select a session...</option>
                {sessionProcesses.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.name} ({process.metadata?.agent_id || 'Unknown Agent'})
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={refreshProcessList}
              variant="outline"
              disabled={processesLoading}
            >
              {processesLoading ? '⏳' : '🔄'} Refresh
            </Button>
          </div>
        </DebugPanel>

        {/* Session Overview Stats */}
        {sessionData && (
          <DebugStats stats={sessionStats} />
        )}

        {/* Main Session Interface */}
        {selectedSessionId && (
          <DebugGrid columns={2}>
            {/* Session Status */}
            <DebugPanel
              title="Session Status"
              icon="📊"
              loading={isLoading}
              error={error}
            >
              {sessionData && (
                <SessionStatusView sessionData={sessionData} />
              )}
            </DebugPanel>

            {/* Session Checkpoint */}
            <DebugPanel
              title="Latest Checkpoint"
              icon="💾"
              loading={isLoading}
              error={error}
            >
              {sessionData && (
                <SessionCheckpointView checkpoint={sessionData.checkpoint_data} />
              )}
            </DebugPanel>

            {/* Performance Metrics */}
            <DebugPanel
              title="Performance Metrics"
              icon="⚡"
              loading={isLoading}
              error={error}
            >
              {sessionData && (
                <SessionPerformanceView metrics={sessionData.performance_metrics} />
              )}
            </DebugPanel>

            {/* Session History */}
            <DebugPanel
              title="Session History"
              icon="📜"
              loading={isLoading}
              error={error}
            >
              {historicalData && (
                <SessionHistoryView history={historicalData} />
              )}
            </DebugPanel>
          </DebugGrid>
        )}

        {/* No Session Selected State */}
        {!selectedSessionId && (
          <DebugPanel title="Getting Started" icon="🎮">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">Select a Session Process</h3>
              <p className="text-muted-foreground mb-6">
                Choose a session process from the dropdown above to start monitoring agent session state and persistence.
              </p>
              <div className="flex justify-center">
                <Button onClick={refreshProcessList} disabled={processesLoading}>
                  {processesLoading ? '⏳ Loading...' : '🔍 Find Sessions'}
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
 * Session Status View Component
 */
function SessionStatusView({ sessionData }: { sessionData: SessionDebugData }) {
  const getStateVariant = (state: string) => {
    switch (state) {
      case 'active': return 'default'
      case 'idle': return 'secondary'
      case 'recovering': return 'destructive'
      default: return 'outline'
    }
  }

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ${minutes % 60}m`
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }

  const formatTimeSince = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  }

  const statusItems = [
    {
      label: 'Agent ID',
      value: sessionData.agent_id,
      description: 'Associated agent identifier'
    },
    {
      label: 'Session State',
      value: (
        <Badge variant={getStateVariant(sessionData.session_state)}>
          {sessionData.session_state.toUpperCase()}
        </Badge>
      ),
      description: 'Current session status'
    },
    {
      label: 'Session Duration',
      value: formatDuration(sessionData.session_duration_ms),
      description: 'Total session time'
    },
    {
      label: 'Last Heartbeat',
      value: formatTimeSince(sessionData.last_heartbeat),
      description: 'Last communication received'
    },
    {
      label: 'Recovery Attempts',
      value: sessionData.recovery_attempts,
      description: 'Number of recovery attempts'
    }
  ]

  return (
    <div className="space-y-4">
      {statusItems.map((item, index) => (
        <div key={index} className="flex justify-between items-center p-3 bg-card border rounded-md">
          <div>
            <div className="font-medium">{item.label}</div>
            <div className="text-sm text-muted-foreground">{item.description}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-primary">{item.value}</div>
          </div>
        </div>
      ))}

      {/* Health Indicators */}
      <div className="mt-6">
        <h4 className="font-medium mb-3">Session Health</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border rounded-lg text-center">
            <div className={`text-2xl mb-1 ${
              sessionData.session_state === 'active' ? 'text-green-500' : 
              sessionData.session_state === 'recovering' ? 'text-yellow-500' : 'text-gray-500'
            }`}>
              {sessionData.session_state === 'active' ? '🟢' : 
               sessionData.session_state === 'recovering' ? '🟡' : '⚪'}
            </div>
            <div className="text-xs text-muted-foreground">Connection</div>
          </div>
          <div className="p-3 border rounded-lg text-center">
            <div className={`text-2xl mb-1 ${
              sessionData.recovery_attempts === 0 ? 'text-green-500' : 
              sessionData.recovery_attempts < 3 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {sessionData.recovery_attempts === 0 ? '✅' : 
               sessionData.recovery_attempts < 3 ? '⚠️' : '❌'}
            </div>
            <div className="text-xs text-muted-foreground">Stability</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Session Checkpoint View Component
 */
function SessionCheckpointView({ checkpoint }: { checkpoint: SessionCheckpoint }) {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-card border rounded-md">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-primary">Checkpoint Data</h4>
          <Badge variant="outline">
            {formatTimestamp(checkpoint.timestamp)}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">World State Hash:</span>
            <span className="font-mono text-xs">
              {checkpoint.world_state_hash.slice(0, 16)}...
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Agent Position:</span>
            <span>
              ({checkpoint.agent_position.x}, {checkpoint.agent_position.y})
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Inventory Items:</span>
            <span>{Object.keys(checkpoint.inventory_snapshot).length}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Team Members:</span>
            <span>{checkpoint.tuxemon_team_snapshot.length}</span>
          </div>
        </div>
      </div>

      {/* Team Snapshot */}
      {checkpoint.tuxemon_team_snapshot.length > 0 && (
        <div>
          <h5 className="font-medium mb-2">Team Snapshot</h5>
          <div className="space-y-2">
            {checkpoint.tuxemon_team_snapshot.slice(0, 3).map((tuxemon, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-card border rounded text-sm">
                <span>{tuxemon.species} Lv.{tuxemon.level}</span>
                <span className="text-muted-foreground">
                  {tuxemon.hp_current}/{tuxemon.hp_max} HP
                </span>
              </div>
            ))}
            {checkpoint.tuxemon_team_snapshot.length > 3 && (
              <div className="text-center text-sm text-muted-foreground">
                +{checkpoint.tuxemon_team_snapshot.length - 3} more members
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inventory Snapshot */}
      {Object.keys(checkpoint.inventory_snapshot).length > 0 && (
        <div>
          <h5 className="font-medium mb-2">Inventory Snapshot</h5>
          <div className="space-y-1">
            {Object.entries(checkpoint.inventory_snapshot).slice(0, 3).map(([itemId, item]) => (
              <div key={itemId} className="flex justify-between items-center p-2 bg-card border rounded text-sm">
                <span>{item.type}</span>
                <Badge variant="outline" className="text-xs">
                  x{item.quantity}
                </Badge>
              </div>
            ))}
            {Object.keys(checkpoint.inventory_snapshot).length > 3 && (
              <div className="text-center text-sm text-muted-foreground">
                +{Object.keys(checkpoint.inventory_snapshot).length - 3} more items
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Session Performance View Component
 */
function SessionPerformanceView({ metrics }: { metrics: any }) {
  const performanceMetrics = [
    {
      label: 'Message Processing',
      value: `${metrics.message_processing_time_ms}ms`,
      description: 'Average message processing time',
      status: metrics.message_processing_time_ms < 100 ? 'good' : 
              metrics.message_processing_time_ms < 500 ? 'warning' : 'error'
    },
    {
      label: 'State Sync Time',
      value: `${metrics.state_sync_time_ms}ms`,
      description: 'Time to synchronize state',
      status: metrics.state_sync_time_ms < 50 ? 'good' : 
              metrics.state_sync_time_ms < 200 ? 'warning' : 'error'
    },
    {
      label: 'Error Count',
      value: metrics.error_count,
      description: 'Total session errors',
      status: metrics.error_count === 0 ? 'good' : 
              metrics.error_count < 5 ? 'warning' : 'error'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-primary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return '📊'
    }
  }

  return (
    <div className="space-y-4">
      {performanceMetrics.map((metric, index) => (
        <div key={index} className="p-3 bg-card border rounded-md">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="font-medium">{metric.label}</div>
              <div className="text-sm text-muted-foreground">{metric.description}</div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold flex items-center gap-1 ${getStatusColor(metric.status)}`}>
                <span>{getStatusIcon(metric.status)}</span>
                {metric.value}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Session History View Component
 */
function SessionHistoryView({ history }: { history: SessionDebugData[] }) {
  const recentHistory = history.slice(0, 10) // Show last 10 entries

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'active': return '🟢'
      case 'idle': return '⚪'
      case 'recovering': return '🟡'
      default: return '❓'
    }
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {recentHistory.map((session, index) => (
        <div
          key={index}
          className="p-3 border rounded-lg text-sm"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-2">
              {getStateIcon(session.session_state)}
              {session.session_state.toUpperCase()}
            </span>
            <span className="text-muted-foreground">
              {formatTimestamp(session.last_heartbeat)}
            </span>
          </div>
          
          <div className="text-muted-foreground">
            Duration: {Math.round(session.session_duration_ms / 1000)}s
            {session.recovery_attempts > 0 && (
              <span className="text-yellow-500 ml-2">
                • {session.recovery_attempts} recoveries
              </span>
            )}
          </div>
        </div>
      ))}
      
      {recentHistory.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No session history available</p>
        </div>
      )}
    </div>
  )
}