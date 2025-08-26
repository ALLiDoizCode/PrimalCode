/**
 * Encounter Tracker - Enhanced debug interface for wild Tuxemon encounter monitoring
 * Migrated from HTML to React with 8bitcn gaming components
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/8bit/button'
import { Badge } from '@/components/ui/8bit/badge'
import { Input } from '@/components/ui/8bit/input'
import { DebugLayout, DebugPanel, DebugGrid, DebugStats } from '@/components/debug/debug-layout'
import { useEncounterTrackerDebug, useDebugProcessDiscovery, useDebugFiltering } from '@/lib/debug/debug-data-client'
import { EncounterDebugData } from '@/lib/debug/debug-types'

export default function EncounterTrackerPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [encounterTypeFilter, setEncounterTypeFilter] = useState<string>('')
  const [resultFilter, setResultFilter] = useState<string>('')

  // Discover available agent processes
  const {
    processes: agentProcesses,
    loading: processesLoading,
    refreshProcessList
  } = useDebugProcessDiscovery('agent')

  // Connect to encounter tracker WebSocket
  const {
    data: encounterData,
    connected,
    error,
    historicalData,
    isLoading,
    subscribeToProcess,
    unsubscribeFromProcess
  } = useEncounterTrackerDebug(selectedAgentId)

  const handleAgentSelect = useCallback((agentId: string) => {
    if (selectedAgentId) {
      unsubscribeFromProcess(selectedAgentId)
    }
    setSelectedAgentId(agentId)
    if (agentId) {
      subscribeToProcess(agentId)
    }
  }, [selectedAgentId, subscribeToProcess, unsubscribeFromProcess])

  const handleRefresh = useCallback(() => {
    if (selectedAgentId) {
      subscribeToProcess(selectedAgentId)
    }
    refreshProcessList()
  }, [selectedAgentId, subscribeToProcess, refreshProcessList])

  // Apply filtering to historical data
  const {
    filteredData: filteredEncounters,
    updateFilter,
    clearFilters
  } = useDebugFiltering(historicalData, { encounterTypeFilter, resultFilter })

  // Calculate encounter statistics
  const encounterStats = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return []

    const totalEncounters = historicalData.length
    const successfulEncounters = historicalData.filter(e => ['success', 'capture'].includes(e.encounter_result)).length
    const wildEncounters = historicalData.filter(e => e.encounter_type === 'wild_tuxemon').length
    const itemDiscoveries = historicalData.filter(e => e.encounter_type === 'item_discovery').length
    
    return [
      {
        label: 'Total Encounters',
        value: totalEncounters,
        icon: '🎯',
        variant: 'default' as const
      },
      {
        label: 'Success Rate',
        value: `${Math.round((successfulEncounters / totalEncounters) * 100)}%`,
        icon: '✅',
        variant: 'success' as const
      },
      {
        label: 'Wild Tuxemon',
        value: wildEncounters,
        icon: '🐾',
        variant: 'default' as const
      },
      {
        label: 'Items Found',
        value: itemDiscoveries,
        icon: '💎',
        variant: 'default' as const
      }
    ]
  }, [historicalData])

  return (
    <DebugLayout
      title="🎯 Encounter Tracker"
      subtitle="Wild Tuxemon encounter monitoring and probability tracking"
      connectionStatus={connected ? 'connected' : 'disconnected'}
      onRefresh={handleRefresh}
      autoRefreshEnabled={autoRefresh}
      onToggleAutoRefresh={setAutoRefresh}
      breadcrumbs={[{ label: 'Encounter Tracker' }]}
    >
      <div className="space-y-6">
        {/* Agent Selection */}
        <DebugPanel title="Agent Selection" icon="🎯">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Agent to Track</label>
              <select
                value={selectedAgentId}
                onChange={(e) => handleAgentSelect(e.target.value)}
                className="w-full p-3 border border-input bg-background rounded-md"
                disabled={processesLoading}
              >
                <option value="">Select an agent...</option>
                {agentProcesses.map((process) => (
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

        {/* Encounter Overview Stats */}
        {encounterStats.length > 0 && (
          <DebugStats stats={encounterStats} />
        )}

        {/* Current Encounter */}
        {encounterData && (
          <DebugPanel
            title="Current Encounter"
            icon="🎯"
            loading={isLoading}
            error={error}
          >
            <CurrentEncounterView encounterData={encounterData} />
          </DebugPanel>
        )}

        {/* Main Encounter Interface */}
        {selectedAgentId && (
          <DebugGrid columns={2}>
            {/* Encounter History */}
            <DebugPanel
              title="Encounter History"
              icon="📜"
              loading={isLoading}
              error={error}
              actions={
                <div className="flex gap-2">
                  <select
                    value={encounterTypeFilter}
                    onChange={(e) => {
                      setEncounterTypeFilter(e.target.value)
                      updateFilter('encounterTypeFilter', e.target.value)
                    }}
                    className="p-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="wild_tuxemon">Wild Tuxemon</option>
                    <option value="item_discovery">Items</option>
                    <option value="special_event">Special Events</option>
                  </select>
                  <select
                    value={resultFilter}
                    onChange={(e) => {
                      setResultFilter(e.target.value)
                      updateFilter('resultFilter', e.target.value)
                    }}
                    className="p-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="">All Results</option>
                    <option value="success">Success</option>
                    <option value="escape">Escape</option>
                    <option value="capture">Capture</option>
                    <option value="failed">Failed</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEncounterTypeFilter('')
                      setResultFilter('')
                      clearFilters()
                    }}
                  >
                    Clear
                  </Button>
                </div>
              }
            >
              <EncounterHistoryView encounters={filteredEncounters} />
            </DebugPanel>

            {/* Probability Analysis */}
            <DebugPanel
              title="Probability Analysis"
              icon="📊"
              loading={isLoading}
              error={error}
            >
              {encounterData && (
                <ProbabilityAnalysisView encounterData={encounterData} />
              )}
            </DebugPanel>

            {/* Encounter Zone Analysis */}
            <DebugPanel
              title="Zone Analysis"
              icon="🏞️"
              loading={isLoading}
              error={error}
              className="lg:col-span-2"
            >
              {historicalData && (
                <EncounterZoneAnalysis encounters={historicalData} />
              )}
            </DebugPanel>
          </DebugGrid>
        )}

        {/* No Agent Selected State */}
        {!selectedAgentId && (
          <DebugPanel title="Getting Started" icon="🎮">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold mb-2">Select an Agent to Track</h3>
              <p className="text-muted-foreground mb-6">
                Choose an agent from the dropdown above to start monitoring their encounter patterns and success rates.
              </p>
              <div className="flex justify-center">
                <Button onClick={refreshProcessList} disabled={processesLoading}>
                  {processesLoading ? '⏳ Loading...' : '🔍 Find Agents'}
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
 * Current Encounter View Component
 */
function CurrentEncounterView({ encounterData }: { encounterData: EncounterDebugData }) {
  const getResultVariant = (result: string) => {
    switch (result) {
      case 'success':
      case 'capture': return 'default'
      case 'escape': return 'secondary'
      case 'failed': return 'destructive'
      default: return 'outline'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'wild_tuxemon': return '🐾'
      case 'item_discovery': return '💎'
      case 'special_event': return '✨'
      default: return '❓'
    }
  }

  return (
    <div className="space-y-4">
      {/* Encounter Overview */}
      <div className="p-4 bg-card border rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getTypeIcon(encounterData.encounter_type)}</span>
            <h3 className="text-lg font-semibold text-primary">
              {encounterData.encounter_type.replace('_', ' ').toUpperCase()}
            </h3>
          </div>
          <Badge variant={getResultVariant(encounterData.encounter_result)}>
            {encounterData.encounter_result.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Agent ID:</span>
            <div className="font-medium">{encounterData.agent_id}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Duration:</span>
            <div className="font-medium">{encounterData.encounter_duration_ms}ms</div>
          </div>
          <div>
            <span className="text-muted-foreground">Zone:</span>
            <div className="font-medium">
              ({encounterData.encounter_zone.x1},{encounterData.encounter_zone.y1}) → 
              ({encounterData.encounter_zone.x2},{encounterData.encounter_zone.y2})
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Zone Rate:</span>
            <div className="font-medium">
              {(encounterData.encounter_zone.encounter_rate * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Tuxemon Data */}
      {encounterData.tuxemon_data && (
        <div className="p-4 bg-card border rounded-lg">
          <h4 className="font-medium text-primary mb-3">🐾 Wild Tuxemon</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="text-muted-foreground text-sm">Species:</span>
              <div className="font-medium">{encounterData.tuxemon_data.species}</div>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Level:</span>
              <div className="font-medium">Lv.{encounterData.tuxemon_data.level}</div>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">HP:</span>
              <div className="font-medium">
                {encounterData.tuxemon_data.hp_current}/{encounterData.tuxemon_data.hp_max}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Status:</span>
              <div className="flex gap-1">
                {encounterData.tuxemon_data.status_effects.length > 0 ? (
                  encounterData.tuxemon_data.status_effects.map((effect, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {effect}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">None</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Data */}
      {encounterData.item_data && (
        <div className="p-4 bg-card border rounded-lg">
          <h4 className="font-medium text-primary mb-3">💎 Item Discovery</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="text-muted-foreground text-sm">Item Type:</span>
              <div className="font-medium">{encounterData.item_data.item_type}</div>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Quantity:</span>
              <div className="font-medium">x{encounterData.item_data.quantity}</div>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Position:</span>
              <div className="font-medium">
                ({encounterData.item_data.x}, {encounterData.item_data.y})
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Encounter History View Component
 */
function EncounterHistoryView({ encounters }: { encounters: EncounterDebugData[] }) {
  const getResultColor = (result: string) => {
    switch (result) {
      case 'success':
      case 'capture': return 'text-green-500'
      case 'escape': return 'text-yellow-500'
      case 'failed': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'wild_tuxemon': return '🐾'
      case 'item_discovery': return '💎'
      case 'special_event': return '✨'
      default: return '❓'
    }
  }

  const recentEncounters = encounters.slice(0, 20) // Show last 20 encounters

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {recentEncounters.map((encounter, index) => (
        <div
          key={`${encounter.encounter_id}-${index}`}
          className="p-3 border rounded-lg hover:bg-card/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span>{getTypeIcon(encounter.encounter_type)}</span>
              <span className="font-medium">
                {encounter.tuxemon_data?.species || encounter.item_data?.item_type || 'Special Event'}
              </span>
            </div>
            <span className={`text-sm font-medium ${getResultColor(encounter.encounter_result)}`}>
              {encounter.encounter_result.toUpperCase()}
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Zone: ({encounter.encounter_zone.x1},{encounter.encounter_zone.y1}) • 
            Duration: {encounter.encounter_duration_ms}ms • 
            Rate: {(encounter.encounter_zone.encounter_rate * 100).toFixed(1)}%
          </div>

          {encounter.tuxemon_data && (
            <div className="text-xs text-muted-foreground mt-1">
              Lv.{encounter.tuxemon_data.level} • 
              {encounter.tuxemon_data.hp_current}/{encounter.tuxemon_data.hp_max} HP
            </div>
          )}
        </div>
      ))}
      
      {recentEncounters.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No encounters match the current filters</p>
        </div>
      )}
    </div>
  )
}

/**
 * Probability Analysis View Component
 */
function ProbabilityAnalysisView({ encounterData }: { encounterData: EncounterDebugData }) {
  const probabilityData = encounterData.probability_calculations

  const analysisItems = [
    {
      label: 'Base Encounter Rate',
      value: `${(probabilityData.base_encounter_rate * 100).toFixed(1)}%`,
      description: 'Zone base probability'
    },
    {
      label: 'Modified Rate',
      value: `${(probabilityData.modified_rate * 100).toFixed(1)}%`,
      description: 'After modifiers applied'
    },
    {
      label: 'Random Seed',
      value: probabilityData.random_seed,
      description: 'Deterministic seed used'
    },
    {
      label: 'Random Value',
      value: probabilityData.random_value.toFixed(4),
      description: 'Generated random value'
    }
  ]

  // Determine if encounter should have occurred
  const shouldEncounter = probabilityData.random_value <= probabilityData.modified_rate
  const actualResult = ['success', 'capture'].includes(encounterData.encounter_result)

  return (
    <div className="space-y-4">
      {analysisItems.map((item, index) => (
        <div key={index} className="p-3 bg-card border rounded-md">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="font-medium">{item.label}</div>
              <div className="text-sm text-muted-foreground">{item.description}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{item.value}</div>
            </div>
          </div>
        </div>
      ))}

      {/* Probability Visualization */}
      <div className="p-4 bg-card border rounded-lg">
        <h5 className="font-medium mb-3">Probability Visualization</h5>
        
        {/* Probability Bar */}
        <div className="relative mb-4">
          <div className="w-full bg-secondary rounded-full h-4">
            <div
              className="bg-primary h-4 rounded-full transition-all duration-500"
              style={{ width: `${probabilityData.modified_rate * 100}%` }}
            />
          </div>
          <div
            className="absolute top-0 h-4 w-0.5 bg-red-500"
            style={{ left: `${probabilityData.random_value * 100}%` }}
            title={`Random value: ${probabilityData.random_value.toFixed(4)}`}
          />
        </div>

        {/* Result Analysis */}
        <div className="flex items-center justify-between text-sm">
          <span>Expected: {shouldEncounter ? '✅ Should encounter' : '❌ Should not encounter'}</span>
          <span>Actual: {actualResult ? '✅ Encountered' : '❌ No encounter'}</span>
        </div>
        
        {shouldEncounter !== actualResult && (
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm">
            ⚠️ Probability mismatch detected - check encounter logic
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Encounter Zone Analysis Component
 */
function EncounterZoneAnalysis({ encounters }: { encounters: EncounterDebugData[] }) {
  // Group encounters by zone coordinates
  const zoneStats = useMemo(() => {
    const zones = new Map<string, {
      coordinates: string
      encounters: EncounterDebugData[]
      successRate: number
      averageRate: number
    }>()

    encounters.forEach(encounter => {
      const zoneKey = `${encounter.encounter_zone.x1},${encounter.encounter_zone.y1}-${encounter.encounter_zone.x2},${encounter.encounter_zone.y2}`
      
      if (!zones.has(zoneKey)) {
        zones.set(zoneKey, {
          coordinates: zoneKey,
          encounters: [],
          successRate: 0,
          averageRate: 0
        })
      }
      
      zones.get(zoneKey)!.encounters.push(encounter)
    })

    // Calculate statistics for each zone
    zones.forEach(zone => {
      const successes = zone.encounters.filter(e => ['success', 'capture'].includes(e.encounter_result)).length
      zone.successRate = (successes / zone.encounters.length) * 100
      zone.averageRate = zone.encounters.reduce((sum, e) => sum + e.encounter_zone.encounter_rate, 0) / zone.encounters.length * 100
    })

    return Array.from(zones.values()).sort((a, b) => b.encounters.length - a.encounters.length)
  }, [encounters])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zoneStats.slice(0, 6).map((zone, index) => (
          <div key={index} className="p-4 bg-card border rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <h5 className="font-medium text-primary">Zone {zone.coordinates}</h5>
              <Badge variant="outline">
                {zone.encounters.length} encounters
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success Rate:</span>
                <span className={`font-medium ${
                  zone.successRate > 50 ? 'text-green-500' : 
                  zone.successRate > 25 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {zone.successRate.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zone Rate:</span>
                <span className="font-medium">{zone.averageRate.toFixed(1)}%</span>
              </div>

              <div className="w-full bg-secondary rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${Math.min(zone.successRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {zoneStats.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No zone data available</p>
        </div>
      )}
    </div>
  )
}