/**
 * Registry State Viewer - Enhanced debug interface for agent registry monitoring
 * Migrated from HTML to React with 8bitcn gaming components
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/8bit/button'
import { Badge } from '@/components/ui/8bit/badge'
import { Input } from '@/components/ui/8bit/input'
import { DebugLayout, DebugPanel, DebugGrid, DebugStats } from '@/components/debug/debug-layout'
import { useRegistryStateDebug, useDebugProcessDiscovery, useDebugFiltering } from '@/lib/debug/debug-data-client'
import { RegistryStateDebugData, AgentRegistryStatus, MatchmakingEntry, ActiveBattleInfo } from '@/lib/debug/debug-types'

export default function RegistryStateViewerPage() {
  const [selectedRegistryId, setSelectedRegistryId] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Discover available registry processes
  const {
    processes: registryProcesses,
    loading: processesLoading,
    refreshProcessList
  } = useDebugProcessDiscovery('registry')

  // Connect to registry state WebSocket
  const {
    data: registryData,
    connected,
    error,
    historicalData,
    isLoading,
    subscribeToProcess,
    unsubscribeFromProcess
  } = useRegistryStateDebug(selectedRegistryId)

  const handleRegistrySelect = useCallback((registryId: string) => {
    if (selectedRegistryId) {
      unsubscribeFromProcess(selectedRegistryId)
    }
    setSelectedRegistryId(registryId)
    if (registryId) {
      subscribeToProcess(registryId)
    }
  }, [selectedRegistryId, subscribeToProcess, unsubscribeFromProcess])

  const handleRefresh = useCallback(() => {
    if (selectedRegistryId) {
      subscribeToProcess(selectedRegistryId)
    }
    refreshProcessList()
  }, [selectedRegistryId, subscribeToProcess, refreshProcessList])

  // Convert agents object to array for filtering
  const agentsList = useMemo(() => {
    if (!registryData?.agents) return []
    return Object.entries(registryData.agents).map(([id, data]) => ({
      id,
      ...data
    }))
  }, [registryData?.agents])

  // Apply filtering to agents list
  const {
    filteredData: filteredAgents,
    updateFilter,
    clearFilters
  } = useDebugFiltering(agentsList, { searchTerm, statusFilter })

  // Calculate registry statistics
  const registryStats = registryData ? [
    {
      label: 'Total Agents',
      value: Object.keys(registryData.agents).length,
      icon: '👥',
      variant: 'default' as const
    },
    {
      label: 'Active Agents',
      value: Object.values(registryData.agents).filter(a => ['online', 'in_world', 'battling'].includes(a.status)).length,
      icon: '🟢',
      variant: 'success' as const
    },
    {
      label: 'Queue Length',
      value: registryData.matchmaking_queue.length,
      icon: '⏳',
      variant: registryData.matchmaking_queue.length > 5 ? ('warning' as const) : ('default' as const)
    },
    {
      label: 'Active Battles',
      value: registryData.active_battles.length,
      icon: '⚔️',
      variant: 'default' as const
    }
  ] : []

  return (
    <DebugLayout
      title="📋 Registry State Viewer"
      subtitle="Agent registry monitoring and matchmaking visualization"
      connectionStatus={connected ? 'connected' : 'disconnected'}
      onRefresh={handleRefresh}
      autoRefreshEnabled={autoRefresh}
      onToggleAutoRefresh={setAutoRefresh}
      breadcrumbs={[{ label: 'Registry State' }]}
    >
      <div className="space-y-6">
        {/* Registry Selection */}
        <DebugPanel title="Registry Selection" icon="🎯">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Registry Process</label>
              <select
                value={selectedRegistryId}
                onChange={(e) => handleRegistrySelect(e.target.value)}
                className="w-full p-3 border border-input bg-background rounded-md"
                disabled={processesLoading}
              >
                <option value="">Select a registry...</option>
                {registryProcesses.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.name} ({process.metadata?.agent_count || 0} agents)
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

        {/* Registry Overview Stats */}
        {registryData && (
          <DebugStats stats={registryStats} />
        )}

        {/* Agent Status Distribution */}
        {registryData && (
          <DebugPanel title="Agent Status Distribution" icon="📊">
            <AgentStatusDistribution registryData={registryData} />
          </DebugPanel>
        )}

        {/* Main Registry Interface */}
        {selectedRegistryId && (
          <DebugGrid columns={2}>
            {/* Registered Agents */}
            <DebugPanel
              title="Registered Agents"
              icon="👥"
              loading={isLoading}
              error={error}
              actions={
                <div className="flex gap-2">
                  <Input
                    placeholder="Search agents..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      updateFilter('searchTerm', e.target.value)
                    }}
                    className="w-48"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      updateFilter('statusFilter', e.target.value)
                    }}
                    className="p-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="online">Online</option>
                    <option value="in_world">In World</option>
                    <option value="battling">Battling</option>
                    <option value="offline">Offline</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter('')
                      clearFilters()
                    }}
                  >
                    Clear
                  </Button>
                </div>
              }
            >
              {registryData && (
                <RegisteredAgentsList 
                  agents={filteredAgents} 
                  totalCount={agentsList.length}
                />
              )}
            </DebugPanel>

            {/* Matchmaking Queue */}
            <DebugPanel
              title="Matchmaking Queue"
              icon="⏳"
              loading={isLoading}
              error={error}
            >
              {registryData && (
                <MatchmakingQueueView queue={registryData.matchmaking_queue} />
              )}
            </DebugPanel>

            {/* Active Battles */}
            <DebugPanel
              title="Active Battles"
              icon="⚔️"
              loading={isLoading}
              error={error}
            >
              {registryData && (
                <ActiveBattlesView battles={registryData.active_battles} />
              )}
            </DebugPanel>

            {/* System Health */}
            <DebugPanel
              title="System Health"
              icon="💚"
              loading={isLoading}
              error={error}
            >
              {registryData && (
                <SystemHealthView health={registryData.system_health} />
              )}
            </DebugPanel>
          </DebugGrid>
        )}

        {/* No Registry Selected State */}
        {!selectedRegistryId && (
          <DebugPanel title="Getting Started" icon="🎮">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-2">Select a Registry Process</h3>
              <p className="text-muted-foreground mb-6">
                Choose a registry process from the dropdown above to start monitoring agent status and matchmaking.
              </p>
              <div className="flex justify-center">
                <Button onClick={refreshProcessList} disabled={processesLoading}>
                  {processesLoading ? '⏳ Loading...' : '🔍 Find Registries'}
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
 * Agent Status Distribution Component - Visual status breakdown
 */
function AgentStatusDistribution({ registryData }: { registryData: RegistryStateDebugData }) {
  const statusCounts = useMemo(() => {
    const counts = { online: 0, in_world: 0, battling: 0, offline: 0 }
    Object.values(registryData.agents).forEach(agent => {
      counts[agent.status] = (counts[agent.status] || 0) + 1
    })
    return counts
  }, [registryData.agents])

  const totalAgents = Object.keys(registryData.agents).length
  
  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex rounded-lg overflow-hidden h-8 border">
        {Object.entries(statusCounts).map(([status, count]) => {
          if (count === 0) return null
          const percentage = (count / totalAgents) * 100
          const bgColor = {
            online: 'bg-green-500',
            in_world: 'bg-blue-500', 
            battling: 'bg-orange-500',
            offline: 'bg-gray-500'
          }[status]
          
          return (
            <div
              key={status}
              className={`${bgColor} flex items-center justify-center text-white text-sm font-medium transition-all hover:brightness-110`}
              style={{ width: `${percentage}%` }}
              title={`${status}: ${count} agents (${percentage.toFixed(1)}%)`}
            >
              {count > 0 && count}
            </div>
          )
        })}
      </div>

      {/* Status Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              status === 'online' ? 'bg-green-500' :
              status === 'in_world' ? 'bg-blue-500' :
              status === 'battling' ? 'bg-orange-500' :
              'bg-gray-500'
            }`} />
            <span className="text-sm">
              {status.replace('_', ' ')}: {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Registered Agents List Component
 */
function RegisteredAgentsList({ 
  agents, 
  totalCount 
}: { 
  agents: (AgentRegistryStatus & { id: string })[]
  totalCount: number 
}) {
  const formatTimeSince = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'online': return 'default'
      case 'in_world': return 'secondary'
      case 'battling': return 'destructive'
      case 'offline': return 'outline'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-3">
      {agents.length !== totalCount && (
        <div className="text-sm text-muted-foreground">
          Showing {agents.length} of {totalCount} agents
        </div>
      )}
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="p-4 border rounded-lg hover:bg-card/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-primary">{agent.id}</h4>
              <Badge variant={getStatusVariant(agent.status)}>
                {agent.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>Last seen: {formatTimeSince(agent.last_seen)}</div>
              <div>Session: {formatTimeSince(agent.session_start)}</div>
              {agent.world_process && (
                <div>World: {agent.world_process}</div>
              )}
              {agent.battle_process && (
                <div>Battle: {agent.battle_process}</div>
              )}
              <div>Battles: {agent.total_battles}</div>
              <div>Win rate: {agent.win_rate}%</div>
            </div>
          </div>
        ))}
        
        {agents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No agents match the current filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Matchmaking Queue Component
 */
function MatchmakingQueueView({ queue }: { queue: MatchmakingEntry[] }) {
  const formatWaitTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  return (
    <div className="space-y-3">
      {queue.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Matchmaking queue is empty</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {queue.map((entry) => (
            <div
              key={entry.agent_id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <div className="font-medium text-primary">{entry.agent_id}</div>
                <div className="text-sm text-muted-foreground">
                  Waiting: {formatWaitTime(entry.wait_time)}
                </div>
              </div>
              <Badge variant="outline">
                #{entry.position}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Active Battles Component
 */
function ActiveBattlesView({ battles }: { battles: ActiveBattleInfo[] }) {
  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'setup': return 'secondary'
      case 'resolving': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-3">
      {battles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No active battles</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {battles.map((battle) => (
            <div key={battle.battle_id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-primary">{battle.battle_id}</h4>
                <Badge variant={getStatusVariant(battle.status)}>
                  {battle.status.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm">
                  <span className="font-medium">{battle.participants[0]}</span>
                  <span className="text-destructive mx-2">VS</span>
                  <span className="font-medium">{battle.participants[1]}</span>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Duration: {formatDuration(battle.duration)} • Turn {battle.turn_count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * System Health Component
 */
function SystemHealthView({ health }: { health: any }) {
  const formatUptime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ${hours % 24}h`
    return `${hours}h`
  }

  const healthMetrics = [
    {
      label: 'Uptime',
      value: formatUptime(health.uptime),
      variant: 'success' as const
    },
    {
      label: 'CPU Usage',
      value: `${health.cpu_usage}%`,
      variant: health.cpu_usage > 80 ? 'destructive' : 'default' as const
    },
    {
      label: 'Memory',
      value: `${health.memory_usage}MB`,
      variant: 'default' as const
    },
    {
      label: 'Requests/s',
      value: health.request_rate,
      variant: 'default' as const
    },
    {
      label: 'Error Rate',
      value: `${health.error_rate}%`,
      variant: health.error_rate > 5 ? 'destructive' : 'success' as const
    },
    {
      label: 'Response Time',
      value: `${health.avg_response_time}ms`,
      variant: health.avg_response_time > 100 ? 'warning' : 'success' as const
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {healthMetrics.map((metric) => (
        <div key={metric.label} className="p-3 bg-card border rounded-md">
          <div className="text-lg font-bold text-primary mb-1">
            {metric.value}
          </div>
          <div className="text-sm text-muted-foreground">
            {metric.label}
          </div>
        </div>
      ))}
    </div>
  )
}