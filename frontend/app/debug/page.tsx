/**
 * Debug Interface Hub - Main navigation page for all debug interfaces
 * Provides organized access to all migrated debug tools with gaming UI
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/8bit/button'
import { Badge } from '@/components/ui/8bit/badge'
import { DebugLayout, DebugGrid, DebugPanel, DebugStats } from '@/components/debug/debug-layout'

interface DebugInterfaceCard {
  id: string
  title: string
  description: string
  icon: string
  href: string
  category: 'state-viewers' | 'monitoring' | 'testing' | 'visualization'
  status: 'available' | 'migrated' | 'legacy'
  priority: 'high' | 'medium' | 'low'
}

const debugInterfaces: DebugInterfaceCard[] = [
  // State Viewers (High Priority)
  {
    id: 'battle-state',
    title: 'Battle State Viewer',
    description: 'Real-time battle state monitoring with turn tracking',
    icon: '⚔️',
    href: '/debug/battle-state',
    category: 'state-viewers',
    status: 'migrated',
    priority: 'high'
  },
  {
    id: 'registry-state', 
    title: 'Registry State Viewer',
    description: 'Agent registry status and matchmaking visualization',
    icon: '📋',
    href: '/debug/registry-state',
    category: 'state-viewers',
    status: 'migrated',
    priority: 'high'
  },
  {
    id: 'world-state',
    title: 'World State Viewer',
    description: 'World state exploration with interactive map features',
    icon: '🗺️',
    href: '/debug/world-state',
    category: 'state-viewers',
    status: 'migrated',
    priority: 'high'
  },

  // Session & Encounter Monitoring (High Priority)
  {
    id: 'session-monitor',
    title: 'Session Monitor',
    description: 'Agent session tracking and persistence monitoring',
    icon: '👥',
    href: '/debug/session-monitor',
    category: 'monitoring',
    status: 'migrated',
    priority: 'high'
  },
  {
    id: 'encounter-tracker',
    title: 'Encounter Tracker', 
    description: 'Wild Tuxemon encounter monitoring and probability tracking',
    icon: '🎯',
    href: '/debug/encounter-tracker',
    category: 'monitoring',
    status: 'migrated',
    priority: 'high'
  },

  // Testing & Management Interfaces (Medium Priority)
  {
    id: 'team-manager',
    title: 'Team Manager',
    description: 'Tuxemon team composition and management',
    icon: '🏆',
    href: '/debug/team-manager',
    category: 'testing',
    status: 'migrated',
    priority: 'medium'
  },
  {
    id: 'handler-testing',
    title: 'Handler Testing Interface',
    description: 'AO process handler testing and validation',
    icon: '🧪',
    href: '/debug/handler-testing',
    category: 'testing',
    status: 'migrated',
    priority: 'medium'
  },

  // Enhanced Visualization Interfaces (Medium Priority)
  {
    id: 'combat-mechanics',
    title: 'Combat Mechanics Viewer',
    description: 'Battle mechanics debugging and analysis',
    icon: '💥',
    href: '/debug/combat-mechanics',
    category: 'visualization',
    status: 'migrated',
    priority: 'medium'
  },
  {
    id: 'capture-tracker',
    title: 'Capture Tracker',
    description: 'Capture success rate monitoring',
    icon: '🎾',
    href: '/debug/capture-tracker',
    category: 'visualization',
    status: 'migrated',
    priority: 'medium'
  },
  {
    id: 'movement-tracker',
    title: 'Movement Tracker',
    description: 'Agent movement and collision detection',
    icon: '🚶',
    href: '/debug/movement-tracker',
    category: 'visualization',
    status: 'migrated',
    priority: 'medium'
  }
]

export default function DebugHubPage() {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'migrated': return 'default'
      case 'available': return 'secondary'
      case 'legacy': return 'outline'
      default: return 'outline'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'state-viewers': return '👁️'
      case 'monitoring': return '📊'
      case 'testing': return '🔧'
      case 'visualization': return '📈'
      default: return '🎮'
    }
  }

  const categoryGroups = debugInterfaces.reduce((groups, interface_) => {
    if (!groups[interface_.category]) {
      groups[interface_.category] = []
    }
    groups[interface_.category].push(interface_)
    return groups
  }, {} as Record<string, DebugInterfaceCard[]>)

  const stats = [
    {
      label: 'Total Interfaces',
      value: debugInterfaces.length,
      icon: '🎮',
      variant: 'default' as const
    },
    {
      label: 'Migrated',
      value: debugInterfaces.filter(i => i.status === 'migrated').length,
      icon: '✅',
      variant: 'success' as const
    },
    {
      label: 'High Priority',
      value: debugInterfaces.filter(i => i.priority === 'high').length,
      icon: '🔥',
      variant: 'warning' as const
    },
    {
      label: 'Categories',
      value: Object.keys(categoryGroups).length,
      icon: '📂',
      variant: 'default' as const
    }
  ]

  return (
    <DebugLayout
      title="🎮 Debug Interface Hub"
      subtitle="Unified access to all PrimalCode debugging and development interfaces"
      breadcrumbs={[]}
    >
      <div className="space-y-8">
        {/* Overview Stats */}
        <DebugStats stats={stats} />

        {/* Quick Actions */}
        <DebugPanel title="Quick Actions" icon="⚡">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboards">
              <Button variant="outline">
                📊 Monitoring Dashboards
              </Button>
            </Link>
            <Link href="/debug/battle-state">
              <Button variant="outline">
                ⚔️ Latest Battle
              </Button>
            </Link>
            <Link href="/debug/world-state">
              <Button variant="outline">
                🗺️ World Explorer
              </Button>
            </Link>
            <Link href="/debug/handler-testing">
              <Button variant="outline">
                🧪 Test Runner
              </Button>
            </Link>
          </div>
        </DebugPanel>

        {/* Interface Categories */}
        {Object.entries(categoryGroups).map(([category, interfaces]) => (
          <DebugPanel
            key={category}
            title={`${getCategoryIcon(category)} ${category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
            className="mb-6"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {interfaces
                .sort((a, b) => {
                  // Sort by priority: high, medium, low
                  const priorityOrder = { high: 0, medium: 1, low: 2 }
                  return priorityOrder[a.priority] - priorityOrder[b.priority]
                })
                .map((interface_) => (
                  <Link key={interface_.id} href={interface_.href}>
                    <div className="group p-4 border rounded-lg hover:border-primary/50 hover:bg-card/50 transition-all duration-200 cursor-pointer h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-2xl">{interface_.icon}</div>
                        <div className="flex gap-2">
                          <Badge
                            variant={getStatusBadgeVariant(interface_.status)}
                            className="text-xs"
                          >
                            {interface_.status}
                          </Badge>
                          <Badge
                            variant={interface_.priority === 'high' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {interface_.priority}
                          </Badge>
                        </div>
                      </div>

                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {interface_.title}
                      </h3>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {interface_.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Category: {category}
                        </span>
                        <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Open Interface →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </DebugPanel>
        ))}

        {/* System Information */}
        <DebugPanel title="System Information" icon="💻">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Debug Environment</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next.js Version:</span>
                  <span>15.5.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UI Framework:</span>
                  <span>8bitcn Gaming Components</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WebSocket Client:</span>
                  <span>Enhanced Dashboard Client</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TypeScript:</span>
                  <span>5.x with Debug Types</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Interface Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Interfaces:</span>
                  <span>{debugInterfaces.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Migrated to React:</span>
                  <span className="text-green-500">
                    {debugInterfaces.filter(i => i.status === 'migrated').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Legacy HTML:</span>
                  <span className="text-yellow-500">
                    {debugInterfaces.filter(i => i.status === 'legacy').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Real-time Updates:</span>
                  <span className="text-green-500">Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </DebugPanel>

        {/* Migration Progress */}
        <DebugPanel title="Migration Progress" icon="🚀">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Story 8.3 Progress</span>
              <span className="text-sm text-muted-foreground">
                {debugInterfaces.filter(i => i.status === 'migrated').length} / {debugInterfaces.length} Complete
              </span>
            </div>

            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${(debugInterfaces.filter(i => i.status === 'migrated').length / debugInterfaces.length) * 100}%`
                }}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              All priority debug interfaces have been successfully migrated to React components with 8bitcn gaming UI.
              Real-time WebSocket integration and enhanced visualization capabilities are now available across all interfaces.
            </div>
          </div>
        </DebugPanel>
      </div>
    </DebugLayout>
  )
}