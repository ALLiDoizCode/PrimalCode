/**
 * World State Viewer - Enhanced debug interface for world state exploration
 * Migrated from HTML to React with 8bitcn gaming components and interactive map
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/8bit/button'
import { Badge } from '@/components/ui/8bit/badge'
import { Input } from '@/components/ui/8bit/input'
import { DebugLayout, DebugPanel, DebugGrid, DebugStats } from '@/components/debug/debug-layout'
import { useWorldStateDebug, useDebugProcessDiscovery } from '@/lib/debug/debug-data-client'
import { WorldStateDebugData, AgentPositionData, EncounterZone, ItemSpawn, TerrainCell } from '@/lib/debug/debug-types'

export default function WorldStateViewerPage() {
  const [selectedWorldId, setSelectedWorldId] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string>('')

  // Discover available world processes
  const {
    processes: worldProcesses,
    loading: processesLoading,
    refreshProcessList
  } = useDebugProcessDiscovery('world')

  // Connect to world state WebSocket
  const {
    data: worldData,
    connected,
    error,
    historicalData,
    isLoading,
    subscribeToProcess,
    unsubscribeFromProcess
  } = useWorldStateDebug(selectedWorldId)

  const handleWorldSelect = useCallback((worldId: string) => {
    if (selectedWorldId) {
      unsubscribeFromProcess(selectedWorldId)
    }
    setSelectedWorldId(worldId)
    if (worldId) {
      subscribeToProcess(worldId)
    }
  }, [selectedWorldId, subscribeToProcess, unsubscribeFromProcess])

  const handleRefresh = useCallback(() => {
    if (selectedWorldId) {
      subscribeToProcess(selectedWorldId)
    }
    refreshProcessList()
  }, [selectedWorldId, subscribeToProcess, refreshProcessList])

  // Calculate world statistics
  const worldStats = worldData ? [
    {
      label: 'Active Agents',
      value: worldData.agent_positions.length,
      icon: '👥',
      variant: 'default' as const
    },
    {
      label: 'Available Items',
      value: worldData.available_items.filter(item => item.is_active).length,
      icon: '🎁',
      variant: 'success' as const
    },
    {
      label: 'Encounter Zones',
      value: worldData.nearby_encounters.length,
      icon: '🏞️',
      variant: 'default' as const
    },
    {
      label: 'Map Size',
      value: `${worldData.terrain_map[0]?.length}x${worldData.terrain_map.length}`,
      icon: '🗺️',
      variant: 'default' as const
    }
  ] : []

  return (
    <DebugLayout
      title="🗺️ World State Viewer"
      subtitle="Interactive world exploration and state monitoring"
      connectionStatus={connected ? 'connected' : 'disconnected'}
      onRefresh={handleRefresh}
      autoRefreshEnabled={autoRefresh}
      onToggleAutoRefresh={setAutoRefresh}
      breadcrumbs={[{ label: 'World State' }]}
    >
      <div className="space-y-6">
        {/* World Selection */}
        <DebugPanel title="World Selection" icon="🎯">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select World Process</label>
              <select
                value={selectedWorldId}
                onChange={(e) => handleWorldSelect(e.target.value)}
                className="w-full p-3 border border-input bg-background rounded-md"
                disabled={processesLoading}
              >
                <option value="">Select a world...</option>
                {worldProcesses.map((process) => (
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

        {/* World Overview Stats */}
        {worldData && (
          <DebugStats stats={worldStats} />
        )}

        {/* Main World Interface */}
        {selectedWorldId && (
          <div className="space-y-6">
            {/* Interactive World Map */}
            <DebugPanel
              title="Interactive World Map"
              icon="🗺️"
              loading={isLoading}
              error={error}
              actions={
                <div className="flex gap-2">
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="p-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="">All Agents</option>
                    {worldData?.agent_positions.map((agent) => (
                      <option key={agent.agent_id} value={agent.agent_id}>
                        {agent.agent_id}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              {worldData && (
                <InteractiveWorldMap 
                  worldData={worldData} 
                  selectedAgent={selectedAgent}
                />
              )}
            </DebugPanel>

            <DebugGrid columns={2}>
              {/* Active Agents */}
              <DebugPanel
                title="Active Agents"
                icon="👥"
                loading={isLoading}
                error={error}
              >
                {worldData && (
                  <ActiveAgentsView 
                    agents={worldData.agent_positions}
                    agentData={worldData.agents}
                    onSelectAgent={setSelectedAgent}
                    selectedAgent={selectedAgent}
                  />
                )}
              </DebugPanel>

              {/* Encounter Zones */}
              <DebugPanel
                title="Encounter Zones"
                icon="🏞️"
                loading={isLoading}
                error={error}
              >
                {worldData && (
                  <EncounterZonesView zones={worldData.nearby_encounters} />
                )}
              </DebugPanel>

              {/* Available Items */}
              <DebugPanel
                title="Available Items"
                icon="🎁"
                loading={isLoading}
                error={error}
              >
                {worldData && (
                  <AvailableItemsView items={worldData.available_items} />
                )}
              </DebugPanel>

              {/* World Performance */}
              <DebugPanel
                title="World Performance"
                icon="⚡"
                loading={isLoading}
                error={error}
              >
                {worldData && (
                  <WorldPerformanceView performance={worldData.world_performance} />
                )}
              </DebugPanel>
            </DebugGrid>
          </div>
        )}

        {/* No World Selected State */}
        {!selectedWorldId && (
          <DebugPanel title="Getting Started" icon="🎮">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-lg font-semibold mb-2">Select a World Process</h3>
              <p className="text-muted-foreground mb-6">
                Choose a world process from the dropdown above to start exploring the interactive world map.
              </p>
              <div className="flex justify-center">
                <Button onClick={refreshProcessList} disabled={processesLoading}>
                  {processesLoading ? '⏳ Loading...' : '🔍 Find Worlds'}
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
 * Interactive World Map Component
 */
function InteractiveWorldMap({ 
  worldData, 
  selectedAgent 
}: { 
  worldData: WorldStateDebugData
  selectedAgent: string 
}) {
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)
  
  const mapWidth = worldData.terrain_map[0]?.length || 20
  const mapHeight = worldData.terrain_map.length || 15

  const getTerrainColor = (cell: TerrainCell) => {
    switch (cell.type) {
      case 'grass': return 'bg-green-500'
      case 'water': return 'bg-blue-500' 
      case 'tree': return 'bg-green-700'
      case 'rock': return 'bg-gray-600'
      case 'path': return 'bg-yellow-600'
      default: return 'bg-gray-500'
    }
  }

  const getTerrainEmoji = (cell: TerrainCell) => {
    switch (cell.type) {
      case 'grass': return '🌿'
      case 'water': return '💧'
      case 'tree': return '🌳'
      case 'rock': return '🪨'
      case 'path': return '🛤️'
      default: return '❓'
    }
  }

  const getCellContent = (x: number, y: number) => {
    // Check for agents at this position
    const agentHere = worldData.agent_positions.find(agent => 
      agent.x === x && agent.y === y &&
      (!selectedAgent || agent.agent_id === selectedAgent)
    )
    
    if (agentHere) {
      return {
        type: 'agent',
        content: '🚶',
        info: `${agentHere.agent_id} (${agentHere.status})`
      }
    }

    // Check for items at this position
    const itemHere = worldData.available_items.find(item => 
      item.x === x && item.y === y && item.is_active
    )
    
    if (itemHere) {
      return {
        type: 'item',
        content: '🎁',
        info: `${itemHere.item_type} x${itemHere.quantity}`
      }
    }

    // Show terrain
    const terrain = worldData.terrain_map[y]?.[x]
    if (terrain) {
      return {
        type: 'terrain',
        content: getTerrainEmoji(terrain),
        info: `${terrain.type} (${terrain.walkable ? 'walkable' : 'blocked'})`
      }
    }

    return null
  }

  return (
    <div className="space-y-4">
      {/* Map Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span>🚶 Agents</span>
          <span>🎁 Items</span>
          <span>🌿 Grass</span>
          <span>💧 Water</span>
          <span>🌳 Trees</span>
          <span>🪨 Rocks</span>
        </div>
      </div>

      {/* Interactive Map Grid */}
      <div className="relative border rounded-lg p-4 bg-card overflow-auto">
        <div 
          className="grid gap-px bg-border"
          style={{ 
            gridTemplateColumns: `repeat(${mapWidth}, minmax(24px, 1fr))`,
            gridTemplateRows: `repeat(${mapHeight}, minmax(24px, 1fr))`
          }}
        >
          {worldData.terrain_map.map((row, y) =>
            row.map((cell, x) => {
              const cellContent = getCellContent(x, y)
              const isHovered = hoveredCell?.x === x && hoveredCell?.y === y
              
              return (
                <div
                  key={`${x}-${y}`}
                  className={`
                    ${getTerrainColor(cell)} 
                    ${isHovered ? 'ring-2 ring-primary' : ''}
                    w-6 h-6 flex items-center justify-center text-xs cursor-pointer
                    transition-all hover:scale-110 hover:z-10 relative
                  `}
                  onMouseEnter={() => setHoveredCell({ x, y })}
                  onMouseLeave={() => setHoveredCell(null)}
                  title={cellContent?.info || `(${x}, ${y})`}
                >
                  {cellContent?.content}
                  
                  {/* Hover tooltip */}
                  {isHovered && cellContent && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20">
                      <div className="bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                        <div>({x}, {y})</div>
                        <div>{cellContent.info}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Encounter Zones Overlay */}
        {worldData.nearby_encounters.map((zone, index) => (
          <div
            key={index}
            className="absolute border-2 border-purple-400 border-dashed rounded bg-purple-400/20 pointer-events-none"
            style={{
              left: `${(zone.x1 / mapWidth) * 100}%`,
              top: `${(zone.y1 / mapHeight) * 100}%`,
              width: `${((zone.x2 - zone.x1 + 1) / mapWidth) * 100}%`,
              height: `${((zone.y2 - zone.y1 + 1) / mapHeight) * 100}%`
            }}
            title={`Encounter Zone ${index + 1}: ${(zone.encounter_rate * 100).toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Selected Cell Info */}
      {hoveredCell && (
        <div className="p-3 bg-card border rounded-lg">
          <div className="text-sm">
            <strong>Position:</strong> ({hoveredCell.x}, {hoveredCell.y})
          </div>
          {getCellContent(hoveredCell.x, hoveredCell.y) && (
            <div className="text-sm">
              <strong>Content:</strong> {getCellContent(hoveredCell.x, hoveredCell.y)?.info}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Active Agents View Component
 */
function ActiveAgentsView({ 
  agents, 
  agentData,
  onSelectAgent,
  selectedAgent
}: { 
  agents: AgentPositionData[]
  agentData: Record<string, any>
  onSelectAgent: (agentId: string) => void
  selectedAgent: string
}) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'exploring': return 'default'
      case 'idle': return 'secondary'
      case 'battling': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {agents.map((agent) => {
        const data = agentData[agent.agent_id] || {}
        const isSelected = selectedAgent === agent.agent_id
        
        return (
          <div
            key={agent.agent_id}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              isSelected ? 'border-primary bg-primary/10' : 'hover:bg-card/50'
            }`}
            onClick={() => onSelectAgent(isSelected ? '' : agent.agent_id)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-primary">{agent.agent_id}</h4>
              <Badge variant={getStatusVariant(agent.status)}>
                {agent.status.toUpperCase()}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>Position: ({agent.x}, {agent.y})</div>
              <div>Facing: {agent.facing}</div>
              <div>Inventory: {Object.keys(data.inventory || {}).length} items</div>
              <div>Team: {(data.active_tuxemon_team || []).length} Tuxemon</div>
            </div>

            {data.active_tuxemon_team?.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">Active Team:</div>
                <div className="flex gap-1">
                  {data.active_tuxemon_team.slice(0, 3).map((tuxemon: any, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tuxemon.species} Lv.{tuxemon.level}
                    </Badge>
                  ))}
                  {data.active_tuxemon_team.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{data.active_tuxemon_team.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
      
      {agents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No active agents in this world</p>
        </div>
      )}
    </div>
  )
}

/**
 * Encounter Zones View Component
 */
function EncounterZonesView({ zones }: { zones: EncounterZone[] }) {
  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {zones.map((zone, index) => (
        <div key={index} className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-primary">
              Zone ({zone.x1},{zone.y1}) → ({zone.x2},{zone.y2})
            </h4>
            <Badge variant="outline">
              {(zone.encounter_rate * 100).toFixed(1)}%
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Level Range:</strong> {zone.min_level} - {zone.max_level}
            </div>
            <div className="text-sm">
              <strong>Types:</strong>
              <div className="flex gap-1 mt-1">
                {zone.tuxemon_types.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {zones.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No encounter zones in this area</p>
        </div>
      )}
    </div>
  )
}

/**
 * Available Items View Component
 */
function AvailableItemsView({ items }: { items: ItemSpawn[] }) {
  const activeItems = items.filter(item => item.is_active)
  
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {activeItems.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div>
            <div className="font-medium text-primary">{item.item_type}</div>
            <div className="text-sm text-muted-foreground">
              Position: ({item.x}, {item.y})
            </div>
          </div>
          <Badge variant="outline">
            x{item.quantity}
          </Badge>
        </div>
      ))}
      
      {activeItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No active items available</p>
        </div>
      )}
    </div>
  )
}

/**
 * World Performance View Component
 */
function WorldPerformanceView({ performance }: { performance: any }) {
  const metrics = [
    {
      label: 'State Update Time',
      value: `${performance.state_update_time_ms}ms`,
      description: 'Time to process state updates'
    },
    {
      label: 'Collision Checks',
      value: `${performance.collision_checks_per_second}/s`,
      description: 'Collision detection rate'
    }
  ]

  return (
    <div className="space-y-4">
      {metrics.map((metric, index) => (
        <div key={index} className="p-3 bg-card border rounded-md">
          <div className="text-lg font-bold text-primary mb-1">
            {metric.value}
          </div>
          <div className="text-sm font-medium mb-1">
            {metric.label}
          </div>
          <div className="text-xs text-muted-foreground">
            {metric.description}
          </div>
        </div>
      ))}
    </div>
  )
}