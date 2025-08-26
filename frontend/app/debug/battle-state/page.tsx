/**
 * Battle State Viewer - Enhanced debug interface for real-time battle monitoring
 * Migrated from HTML to React with 8bitcn gaming components
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/8bit/button'
import { Badge } from '@/components/ui/8bit/badge'
import { Input } from '@/components/ui/8bit/input'
import { DebugLayout, DebugPanel, DebugGrid, DebugStats } from '@/components/debug/debug-layout'
import { useBattleStateDebug, useDebugProcessDiscovery } from '@/lib/debug/debug-data-client'
import { BattleStateDebugData, TuxemonDebugData, BattleAction } from '@/lib/debug/debug-types'

export default function BattleStateViewerPage() {
  const [selectedBattleId, setSelectedBattleId] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Discover available battle processes
  const {
    processes: battleProcesses,
    loading: processesLoading,
    refreshProcessList
  } = useDebugProcessDiscovery('battle')

  // Connect to battle state WebSocket
  const {
    data: battleData,
    connected,
    error,
    historicalData,
    isLoading,
    subscribeToProcess,
    unsubscribeFromProcess
  } = useBattleStateDebug(selectedBattleId)

  const handleBattleSelect = useCallback((battleId: string) => {
    if (selectedBattleId) {
      unsubscribeFromProcess(selectedBattleId)
    }
    setSelectedBattleId(battleId)
    if (battleId) {
      subscribeToProcess(battleId)
    }
  }, [selectedBattleId, subscribeToProcess, unsubscribeFromProcess])

  const handleRefresh = useCallback(() => {
    if (selectedBattleId) {
      subscribeToProcess(selectedBattleId)
    }
    refreshProcessList()
  }, [selectedBattleId, subscribeToProcess, refreshProcessList])

  const handleToggleAutoRefresh = useCallback((enabled: boolean) => {
    setAutoRefresh(enabled)
    // Auto-refresh logic handled by WebSocket connection
  }, [])

  // Calculate battle statistics
  const battleStats = battleData ? [
    {
      label: 'Battle ID',
      value: battleData.battle_id,
      icon: '⚔️',
      variant: 'default' as const
    },
    {
      label: 'Current Turn',
      value: battleData.current_turn,
      icon: '🔄',
      variant: 'default' as const
    },
    {
      label: 'Battle State',
      value: battleData.battle_state.toUpperCase(),
      icon: battleData.battle_state === 'active' ? '🟢' : battleData.battle_state === 'resolved' ? '🏁' : '🟡',
      variant: battleData.battle_state === 'active' ? ('success' as const) : ('default' as const)
    },
    {
      label: 'Turn Time',
      value: `${battleData.performance_metrics.turn_resolution_time_ms}ms`,
      icon: '⏱️',
      variant: 'default' as const
    }
  ] : []

  return (
    <DebugLayout
      title="⚔️ Battle State Viewer"
      subtitle="Real-time battle state monitoring with enhanced gaming UI"
      connectionStatus={connected ? 'connected' : 'disconnected'}
      onRefresh={handleRefresh}
      autoRefreshEnabled={autoRefresh}
      onToggleAutoRefresh={handleToggleAutoRefresh}
      breadcrumbs={[{ label: 'Battle State' }]}
    >
      <div className="space-y-6">
        {/* Battle Selection */}
        <DebugPanel title="Battle Selection" icon="🎯">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Battle Process</label>
              <select
                value={selectedBattleId}
                onChange={(e) => handleBattleSelect(e.target.value)}
                className="w-full p-3 border border-input bg-background rounded-md"
                disabled={processesLoading}
              >
                <option value="">Select a battle...</option>
                {battleProcesses.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.name} ({process.metadata?.status || 'Unknown'})
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

        {/* Battle Overview Stats */}
        {battleData && (
          <DebugStats stats={battleStats} />
        )}

        {/* Main Battle Interface */}
        {selectedBattleId && (
          <DebugGrid columns={2}>
            {/* Battle Arena */}
            <DebugPanel
              title="Battle Arena"
              icon="🏟️"
              loading={isLoading}
              error={error}
              className="lg:col-span-2"
            >
              {battleData && (
                <BattleArenaView battleData={battleData} />
              )}
            </DebugPanel>

            {/* Battle Log */}
            <DebugPanel
              title="Battle Log"
              icon="📜"
              loading={isLoading}
              error={error}
            >
              {battleData && (
                <BattleLogView actions={battleData.turn_history} />
              )}
            </DebugPanel>

            {/* Battle Statistics */}
            <DebugPanel
              title="Performance Metrics"
              icon="📊"
              loading={isLoading}
              error={error}
            >
              {battleData && (
                <BattleMetricsView battleData={battleData} />
              )}
            </DebugPanel>
          </DebugGrid>
        )}

        {/* No Battle Selected State */}
        {!selectedBattleId && (
          <DebugPanel title="Getting Started" icon="🎮">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚔️</div>
              <h3 className="text-lg font-semibold mb-2">Select a Battle Process</h3>
              <p className="text-muted-foreground mb-6">
                Choose a battle process from the dropdown above to start monitoring real-time battle state.
              </p>
              <div className="flex justify-center">
                <Button onClick={refreshProcessList} disabled={processesLoading}>
                  {processesLoading ? '⏳ Loading...' : '🔍 Find Battles'}
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
 * Battle Arena Component - Visual representation of active battle
 */
function BattleArenaView({ battleData }: { battleData: BattleStateDebugData }) {
  return (
    <div className="space-y-6">
      {/* Battle Phase Indicator */}
      <div className="text-center">
        <Badge
          variant={
            battleData.battle_state === 'active' ? 'default' :
            battleData.battle_state === 'resolved' ? 'secondary' : 'outline'
          }
          className="text-lg px-6 py-2"
        >
          {battleData.battle_state.toUpperCase()} - Turn {battleData.current_turn}
        </Badge>
      </div>

      {/* Participants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {battleData.participants.map((participant, index) => (
          <ParticipantCard
            key={participant.agent_id}
            participant={participant}
            isActive={battleData.current_turn === index}
            position={index === 0 ? 'left' : 'right'}
          />
        ))}
      </div>

      {/* VS Indicator */}
      <div className="flex justify-center">
        <div className="bg-destructive text-destructive-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold border-4 border-destructive">
          VS
        </div>
      </div>
    </div>
  )
}

/**
 * Participant Card Component - Shows agent and their team
 */
function ParticipantCard({
  participant,
  isActive,
  position
}: {
  participant: any
  isActive: boolean
  position: 'left' | 'right'
}) {
  return (
    <div className={`p-6 border rounded-lg ${isActive ? 'border-primary bg-primary/10' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary">
          {participant.agent_id}
        </h3>
        <Badge variant={isActive ? 'default' : 'outline'}>
          {participant.status.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-3">
        {participant.team.map((tuxemon: TuxemonDebugData) => (
          <TuxemonCard key={tuxemon.id} tuxemon={tuxemon} />
        ))}
      </div>
    </div>
  )
}

/**
 * Tuxemon Card Component - Individual Tuxemon status
 */
function TuxemonCard({ tuxemon }: { tuxemon: TuxemonDebugData }) {
  const healthPercent = (tuxemon.hp_current / tuxemon.hp_max) * 100
  const healthColor = 
    healthPercent > 60 ? 'bg-green-500' :
    healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className={`p-3 border rounded-md ${tuxemon.is_active ? 'border-primary bg-primary/5' : 'border-border'} ${tuxemon.hp_current === 0 ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-primary">{tuxemon.species}</span>
        <Badge variant="outline" className="text-xs">
          Lv.{tuxemon.level}
        </Badge>
      </div>

      {/* Health Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span>HP</span>
          <span>{tuxemon.hp_current}/{tuxemon.hp_max}</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className={`${healthColor} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>

      {/* Status Effects */}
      {tuxemon.status_effects.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {tuxemon.status_effects.map((effect, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {effect}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
        <div>ATK: {tuxemon.attack}</div>
        <div>DEF: {tuxemon.defense}</div>
        <div>SPD: {tuxemon.speed}</div>
      </div>
    </div>
  )
}

/**
 * Battle Log Component - Shows recent battle actions
 */
function BattleLogView({ actions }: { actions: BattleAction[] }) {
  const getActionColor = (type: string) => {
    switch (type) {
      case 'damage': return 'border-l-red-500'
      case 'heal': return 'border-l-green-500' 
      case 'status': return 'border-l-purple-500'
      case 'system': return 'border-l-blue-500'
      default: return 'border-l-gray-500'
    }
  }

  const recentActions = actions.slice(-20).reverse() // Show last 20, most recent first

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {recentActions.map((action, index) => (
        <div
          key={`${action.turn}-${index}`}
          className={`p-3 bg-card border-l-4 rounded-r-md ${getActionColor(action.type)}`}
        >
          <div className="flex justify-between items-start mb-1">
            <Badge variant="outline" className="text-xs">
              Turn {action.turn}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(action.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm">{action.message}</p>
        </div>
      ))}
      
      {recentActions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No battle actions yet</p>
        </div>
      )}
    </div>
  )
}

/**
 * Battle Metrics Component - Performance and timing data
 */
function BattleMetricsView({ battleData }: { battleData: BattleStateDebugData }) {
  const metrics = [
    {
      label: 'Turn Resolution',
      value: `${battleData.performance_metrics.turn_resolution_time_ms}ms`,
      description: 'Average time per turn'
    },
    {
      label: 'Total Duration', 
      value: `${Math.round(battleData.performance_metrics.total_battle_duration_ms / 1000)}s`,
      description: 'Battle duration'
    },
    {
      label: 'Actions Logged',
      value: battleData.turn_history.length,
      description: 'Total battle actions'
    },
    {
      label: 'Active Participants',
      value: battleData.participants.filter(p => p.status === 'battling').length,
      description: 'Currently battling'
    }
  ]

  return (
    <div className="space-y-4">
      {metrics.map((metric, index) => (
        <div key={index} className="flex justify-between items-center p-3 bg-card border rounded-md">
          <div>
            <div className="font-medium">{metric.label}</div>
            <div className="text-sm text-muted-foreground">{metric.description}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary">{metric.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}