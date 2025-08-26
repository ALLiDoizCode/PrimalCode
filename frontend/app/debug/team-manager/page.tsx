/**
 * Team Manager - Enhanced debug interface for Tuxemon team composition and management
 * Migrated from HTML to React with 8bitcn gaming components
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/8bit/button'
import { Badge } from '@/components/ui/8bit/badge'
import { Input } from '@/components/ui/8bit/input'
import { DebugLayout, DebugPanel, DebugGrid, DebugStats } from '@/components/debug/debug-layout'
import { useTeamManagerDebug, useDebugProcessDiscovery } from '@/lib/debug/debug-data-client'
import { TeamManagerData, TuxemonDebugData } from '@/lib/debug/debug-types'

export default function TeamManagerPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedTuxemon, setSelectedTuxemon] = useState<string>('')

  // Discover available agent processes
  const {
    processes: agentProcesses,
    loading: processesLoading,
    refreshProcessList
  } = useDebugProcessDiscovery('agent')

  // Connect to team manager WebSocket
  const {
    data: teamData,
    connected,
    error,
    historicalData,
    isLoading,
    subscribeToProcess,
    unsubscribeFromProcess
  } = useTeamManagerDebug(selectedAgentId)

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

  // Calculate team statistics
  const teamStats = teamData ? [
    {
      label: 'Team Size',
      value: teamData.team_composition.length,
      icon: '👥',
      variant: 'default' as const
    },
    {
      label: 'Total Level',
      value: teamData.team_stats.total_level,
      icon: '📊',
      variant: 'default' as const
    },
    {
      label: 'Avg Level',
      value: Math.round(teamData.team_stats.average_level),
      icon: '📈',
      variant: 'default' as const
    },
    {
      label: 'Battle Ready',
      value: `${teamData.team_stats.battle_readiness}%`,
      icon: '⚔️',
      variant: teamData.team_stats.battle_readiness > 75 ? ('success' as const) : ('warning' as const)
    }
  ] : []

  return (
    <DebugLayout
      title="🏆 Team Manager"
      subtitle="Tuxemon team composition analysis and management tools"
      connectionStatus={connected ? 'connected' : 'disconnected'}
      onRefresh={handleRefresh}
      autoRefreshEnabled={autoRefresh}
      onToggleAutoRefresh={setAutoRefresh}
      breadcrumbs={[{ label: 'Team Manager' }]}
    >
      <div className="space-y-6">
        {/* Agent Selection */}
        <DebugPanel title="Agent Selection" icon="🎯">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Agent to Manage</label>
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

        {/* Team Overview Stats */}
        {teamData && (
          <DebugStats stats={teamStats} />
        )}

        {/* Main Team Management Interface */}
        {selectedAgentId && (
          <div className="space-y-6">
            {/* Team Composition */}
            <DebugPanel
              title="Team Composition"
              icon="👥"
              loading={isLoading}
              error={error}
              actions={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    ⚖️ Balance Team
                  </Button>
                  <Button variant="outline" size="sm">
                    🔄 Optimize
                  </Button>
                </div>
              }
            >
              {teamData && (
                <TeamCompositionView
                  team={teamData.team_composition}
                  selectedTuxemon={selectedTuxemon}
                  onSelectTuxemon={setSelectedTuxemon}
                />
              )}
            </DebugPanel>

            <DebugGrid columns={2}>
              {/* Team Statistics */}
              <DebugPanel
                title="Team Statistics"
                icon="📊"
                loading={isLoading}
                error={error}
              >
                {teamData && (
                  <TeamStatisticsView stats={teamData.team_stats} />
                )}
              </DebugPanel>

              {/* Type Coverage */}
              <DebugPanel
                title="Type Coverage"
                icon="🌈"
                loading={isLoading}
                error={error}
              >
                {teamData && (
                  <TypeCoverageView 
                    teamComposition={teamData.team_composition}
                    typeDistribution={teamData.team_stats.type_distribution}
                  />
                )}
              </DebugPanel>

              {/* Team Recommendations */}
              <DebugPanel
                title="AI Recommendations"
                icon="🤖"
                loading={isLoading}
                error={error}
                className="lg:col-span-2"
              >
                {teamData && (
                  <TeamRecommendationsView recommendations={teamData.recommendations} />
                )}
              </DebugPanel>
            </DebugGrid>

            {/* Individual Tuxemon Details */}
            {selectedTuxemon && teamData && (
              <DebugPanel title="Tuxemon Details" icon="🔍">
                {(() => {
                  const tuxemon = teamData.team_composition.find(t => t.id === selectedTuxemon)
                  if (!tuxemon) return null
                  return <TuxemonDetailsView tuxemon={tuxemon} />
                })()}
              </DebugPanel>
            )}
          </div>
        )}

        {/* No Agent Selected State */}
        {!selectedAgentId && (
          <DebugPanel title="Getting Started" icon="🎮">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-semibold mb-2">Select an Agent to Manage</h3>
              <p className="text-muted-foreground mb-6">
                Choose an agent from the dropdown above to analyze and optimize their Tuxemon team composition.
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
 * Team Composition View Component
 */
function TeamCompositionView({
  team,
  selectedTuxemon,
  onSelectTuxemon
}: {
  team: TuxemonDebugData[]
  selectedTuxemon: string
  onSelectTuxemon: (id: string) => void
}) {
  const getHealthColor = (current: number, max: number) => {
    const percent = (current / max) * 100
    if (percent > 75) return 'bg-green-500'
    if (percent > 50) return 'bg-yellow-500'
    if (percent > 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getTuxemonTypeColor = (species: string) => {
    // Simple type mapping for demonstration
    const typeMap: Record<string, string> = {
      'Bamboon': 'bg-green-100 text-green-700',
      'Rockitten': 'bg-gray-100 text-gray-700',
      'Hydrone': 'bg-blue-100 text-blue-700',
      'Flamon': 'bg-red-100 text-red-700',
      'Leafy': 'bg-green-100 text-green-700'
    }
    return typeMap[species] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-4">
      {/* Team Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map((tuxemon) => (
          <div
            key={tuxemon.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedTuxemon === tuxemon.id 
                ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
                : 'hover:border-primary/50 hover:bg-card/50'
            } ${tuxemon.hp_current === 0 ? 'opacity-50' : ''}`}
            onClick={() => onSelectTuxemon(selectedTuxemon === tuxemon.id ? '' : tuxemon.id)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-primary">{tuxemon.species}</h3>
                {tuxemon.is_active && (
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                Lv.{tuxemon.level}
              </Badge>
            </div>

            {/* Health Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>HP</span>
                <span>{tuxemon.hp_current}/{tuxemon.hp_max}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${getHealthColor(tuxemon.hp_current, tuxemon.hp_max)} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${(tuxemon.hp_current / tuxemon.hp_max) * 100}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs text-center mb-3">
              <div>
                <div className="font-medium text-red-500">{tuxemon.attack}</div>
                <div className="text-muted-foreground">ATK</div>
              </div>
              <div>
                <div className="font-medium text-blue-500">{tuxemon.defense}</div>
                <div className="text-muted-foreground">DEF</div>
              </div>
              <div>
                <div className="font-medium text-yellow-500">{tuxemon.speed}</div>
                <div className="text-muted-foreground">SPD</div>
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

            {/* Type Badge */}
            <div className="mt-2">
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTuxemonTypeColor(tuxemon.species)}`}>
                {tuxemon.species} Type
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Team Empty State */}
      {team.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-2">🐾</div>
          <p>No Tuxemon in team</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" size="sm">
          🔀 Shuffle Team Order
        </Button>
        <Button variant="outline" size="sm">
          💊 Heal All
        </Button>
        <Button variant="outline" size="sm">
          ⭐ Level Up All
        </Button>
      </div>
    </div>
  )
}

/**
 * Team Statistics View Component
 */
function TeamStatisticsView({ stats }: { stats: any }) {
  const statisticItems = [
    {
      label: 'Total Level',
      value: stats.total_level,
      description: 'Sum of all Tuxemon levels',
      icon: '📊'
    },
    {
      label: 'Average Level',
      value: Math.round(stats.average_level),
      description: 'Mean level across team',
      icon: '📈'
    },
    {
      label: 'Battle Readiness',
      value: `${stats.battle_readiness}%`,
      description: 'Overall team combat effectiveness',
      icon: '⚔️'
    },
    {
      label: 'Type Diversity',
      value: Object.keys(stats.type_distribution).length,
      description: 'Number of different types',
      icon: '🌈'
    }
  ]

  const getReadinessColor = (readiness: number) => {
    if (readiness >= 80) return 'text-green-500'
    if (readiness >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-4">
      {statisticItems.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-card border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{item.icon}</div>
            <div>
              <div className="font-medium">{item.label}</div>
              <div className="text-sm text-muted-foreground">{item.description}</div>
            </div>
          </div>
          <div className={`text-xl font-bold ${
            item.label === 'Battle Readiness' ? getReadinessColor(stats.battle_readiness) : 'text-primary'
          }`}>
            {item.value}
          </div>
        </div>
      ))}

      {/* Battle Readiness Gauge */}
      <div className="p-4 bg-card border rounded-lg">
        <h4 className="font-medium mb-3">Battle Readiness Breakdown</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Team Health</span>
            <span>85%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }} />
          </div>

          <div className="flex justify-between text-sm">
            <span>Level Balance</span>
            <span>70%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '70%' }} />
          </div>

          <div className="flex justify-between text-sm">
            <span>Type Coverage</span>
            <span>90%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '90%' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Type Coverage View Component
 */
function TypeCoverageView({ 
  teamComposition, 
  typeDistribution 
}: { 
  teamComposition: TuxemonDebugData[]
  typeDistribution: Record<string, number>
}) {
  // Mock type effectiveness data
  const allTypes = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy']
  
  const teamTypes = Object.keys(typeDistribution)
  const missingTypes = allTypes.filter(type => !teamTypes.includes(type))

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Normal': 'bg-gray-400',
      'Fire': 'bg-red-500',
      'Water': 'bg-blue-500',
      'Electric': 'bg-yellow-400',
      'Grass': 'bg-green-500',
      'Ice': 'bg-cyan-300',
      'Fighting': 'bg-red-700',
      'Poison': 'bg-purple-500',
      'Ground': 'bg-yellow-600',
      'Flying': 'bg-indigo-400',
      'Psychic': 'bg-pink-500',
      'Bug': 'bg-green-400',
      'Rock': 'bg-yellow-800',
      'Ghost': 'bg-purple-700',
      'Dragon': 'bg-indigo-700',
      'Dark': 'bg-gray-800',
      'Steel': 'bg-gray-500',
      'Fairy': 'bg-pink-300'
    }
    return colors[type] || 'bg-gray-400'
  }

  return (
    <div className="space-y-4">
      {/* Current Type Distribution */}
      <div>
        <h4 className="font-medium mb-3">Current Team Types</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(typeDistribution).map(([type, count]) => (
            <div
              key={type}
              className={`${getTypeColor(type)} text-white px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-1`}
            >
              {type}
              <Badge variant="secondary" className="text-xs bg-white/20 text-white">
                {count}
              </Badge>
            </div>
          ))}
        </div>
        {teamTypes.length === 0 && (
          <p className="text-muted-foreground text-sm">No types in current team</p>
        )}
      </div>

      {/* Type Coverage Analysis */}
      <div className="p-4 bg-card border rounded-lg">
        <h4 className="font-medium mb-3">Coverage Analysis</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Types Covered:</span>
            <div className="text-lg font-bold text-green-500">{teamTypes.length}/{allTypes.length}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Coverage Score:</span>
            <div className="text-lg font-bold text-primary">
              {Math.round((teamTypes.length / allTypes.length) * 100)}%
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full"
              style={{ width: `${(teamTypes.length / allTypes.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Missing Types */}
      {missingTypes.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Missing Type Coverage</h4>
          <div className="flex flex-wrap gap-2">
            {missingTypes.slice(0, 8).map((type) => (
              <div
                key={type}
                className={`${getTypeColor(type)} opacity-50 text-white px-3 py-2 rounded-lg font-medium text-sm`}
              >
                {type}
              </div>
            ))}
            {missingTypes.length > 8 && (
              <div className="px-3 py-2 border-2 border-dashed border-muted text-muted-foreground rounded-lg text-sm">
                +{missingTypes.length - 8} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Team Recommendations View Component
 */
function TeamRecommendationsView({ recommendations }: { recommendations: any }) {
  const recommendationSections = [
    {
      title: 'Suggested Changes',
      icon: '💡',
      items: recommendations.suggested_changes,
      color: 'border-blue-500'
    },
    {
      title: 'Type Coverage Gaps',
      icon: '🌈',
      items: recommendations.type_coverage_gaps,
      color: 'border-yellow-500'
    },
    {
      title: 'Level Balance Issues',
      icon: '⚖️',
      items: recommendations.level_balance_issues,
      color: 'border-red-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {recommendationSections.map((section) => (
        <div key={section.title} className={`p-4 border-l-4 ${section.color} bg-card rounded-lg`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{section.icon}</span>
            <h4 className="font-medium">{section.title}</h4>
          </div>
          
          {section.items && section.items.length > 0 ? (
            <ul className="space-y-2">
              {section.items.map((item: string, index: number) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No recommendations in this category</p>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Tuxemon Details View Component
 */
function TuxemonDetailsView({ tuxemon }: { tuxemon: TuxemonDebugData }) {
  const getStatColor = (stat: number, type: 'attack' | 'defense' | 'speed') => {
    const thresholds = {
      attack: { good: 40, fair: 25 },
      defense: { good: 35, fair: 20 },
      speed: { good: 30, fair: 15 }
    }
    
    const threshold = thresholds[type]
    if (stat >= threshold.good) return 'text-green-500'
    if (stat >= threshold.fair) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-primary mb-2">{tuxemon.species}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Level {tuxemon.level}</Badge>
              {tuxemon.is_active && (
                <Badge variant="default">Currently Active</Badge>
              )}
            </div>
          </div>

          <div className="p-4 bg-card border rounded-lg">
            <h4 className="font-medium mb-3">Health Status</h4>
            <div className="flex justify-between text-sm mb-2">
              <span>HP</span>
              <span>{tuxemon.hp_current} / {tuxemon.hp_max}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  (tuxemon.hp_current / tuxemon.hp_max) > 0.75 ? 'bg-green-500' :
                  (tuxemon.hp_current / tuxemon.hp_max) > 0.5 ? 'bg-yellow-500' :
                  (tuxemon.hp_current / tuxemon.hp_max) > 0.25 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${(tuxemon.hp_current / tuxemon.hp_max) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-card border rounded-lg">
            <h4 className="font-medium mb-3">Combat Stats</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Attack</span>
                <span className={`text-lg font-bold ${getStatColor(tuxemon.attack, 'attack')}`}>
                  {tuxemon.attack}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Defense</span>
                <span className={`text-lg font-bold ${getStatColor(tuxemon.defense, 'defense')}`}>
                  {tuxemon.defense}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Speed</span>
                <span className={`text-lg font-bold ${getStatColor(tuxemon.speed, 'speed')}`}>
                  {tuxemon.speed}
                </span>
              </div>
            </div>
          </div>

          {/* Status Effects */}
          {tuxemon.status_effects.length > 0 && (
            <div className="p-4 bg-card border rounded-lg">
              <h4 className="font-medium mb-3">Active Status Effects</h4>
              <div className="flex flex-wrap gap-2">
                {tuxemon.status_effects.map((effect, index) => (
                  <Badge key={index} variant="secondary">
                    {effect}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat Visualization */}
      <div className="p-4 bg-card border rounded-lg">
        <h4 className="font-medium mb-3">Stat Distribution</h4>
        <div className="space-y-3">
          {[
            { name: 'Attack', value: tuxemon.attack, max: 60, color: 'bg-red-500' },
            { name: 'Defense', value: tuxemon.defense, max: 60, color: 'bg-blue-500' },
            { name: 'Speed', value: tuxemon.speed, max: 60, color: 'bg-yellow-500' }
          ].map((stat) => (
            <div key={stat.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{stat.name}</span>
                <span>{stat.value}/{stat.max}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${stat.color} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${(stat.value / stat.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          💊 Heal
        </Button>
        <Button variant="outline" size="sm">
          ⭐ Level Up
        </Button>
        <Button variant="outline" size="sm">
          🔄 Toggle Active
        </Button>
        <Button variant="outline" size="sm">
          📊 View History
        </Button>
      </div>
    </div>
  )
}