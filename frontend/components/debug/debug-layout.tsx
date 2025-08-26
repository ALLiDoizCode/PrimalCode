/**
 * Debug Interface Layout Component
 * Provides consistent gaming-themed layout for all debug interfaces
 * Uses 8bitcn components for unified aesthetic
 */

import React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/8bit/badge'
import { Button } from '@/components/ui/8bit/button'

interface DebugLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  connectionStatus?: 'connected' | 'disconnected' | 'connecting'
  onRefresh?: () => void
  autoRefreshEnabled?: boolean
  onToggleAutoRefresh?: (enabled: boolean) => void
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export function DebugLayout({
  title,
  subtitle,
  children,
  connectionStatus = 'disconnected',
  onRefresh,
  autoRefreshEnabled = false,
  onToggleAutoRefresh,
  breadcrumbs = []
}: DebugLayoutProps) {
  const getConnectionBadgeVariant = () => {
    switch (connectionStatus) {
      case 'connected': return 'default'
      case 'connecting': return 'secondary' 
      case 'disconnected': return 'destructive'
      default: return 'outline'
    }
  }

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live Data'
      case 'connecting': return 'Connecting...'
      case 'disconnected': return 'Disconnected'
      default: return 'Unknown'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Breadcrumb Navigation */}
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Link href="/debug" className="hover:text-foreground transition-colors">
                  🎮 Debug Hub
                </Link>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <span>/</span>
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-foreground transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-foreground">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <Badge variant={getConnectionBadgeVariant()}>
                {getConnectionText()}
              </Badge>

              {/* Refresh Control */}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="px-3"
                >
                  🔄 Refresh
                </Button>
              )}

              {/* Auto-Refresh Toggle */}
              {onToggleAutoRefresh && (
                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefreshEnabled}
                    onChange={(e) => onToggleAutoRefresh(e.target.checked)}
                    className="rounded border-input bg-background"
                  />
                  <span>Auto Refresh</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Title Section */}
      <div className="border-b bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {title}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Quick Action Links */}
            <div className="flex items-center space-x-3">
              <Link href="/debug">
                <Button variant="outline" size="sm">
                  ← All Debug Interfaces
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/20 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>PrimalCode Debug Interface</span>
              <span>•</span>
              <span>Gaming UI powered by 8bitcn</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

/**
 * Debug Panel Component
 * Reusable panel structure for debug interface sections
 */
interface DebugPanelProps {
  title: string
  icon?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
  loading?: boolean
  error?: string | null
}

export function DebugPanel({
  title,
  icon,
  children,
  className = '',
  actions,
  loading = false,
  error = null
}: DebugPanelProps) {
  return (
    <div className={`bg-card border rounded-lg shadow-sm ${className}`}>
      <div className="px-6 py-4 border-b bg-card/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </h2>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              <span className="text-muted-foreground">Loading...</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-destructive text-lg mb-2">⚠️ Error</div>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && children}
      </div>
    </div>
  )
}

/**
 * Debug Grid Component
 * Responsive grid layout for debug interface panels
 */
interface DebugGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function DebugGrid({ 
  children, 
  columns = 2,
  className = ''
}: DebugGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'
  }

  return (
    <div className={`grid gap-6 ${gridClasses[columns]} ${className}`}>
      {children}
    </div>
  )
}

/**
 * Debug Stats Component
 * Displays key metrics in a gaming-themed card format
 */
interface DebugStatsProps {
  stats: Array<{
    label: string
    value: string | number
    icon?: string
    variant?: 'default' | 'success' | 'warning' | 'destructive'
  }>
}

export function DebugStats({ stats }: DebugStatsProps) {
  const getVariantClasses = (variant: string = 'default') => {
    switch (variant) {
      case 'success':
        return 'border-green-500/20 bg-green-500/10 text-green-500'
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500'
      case 'destructive':
        return 'border-red-500/20 bg-red-500/10 text-red-500'
      default:
        return 'border-primary/20 bg-primary/10 text-primary'
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border text-center ${getVariantClasses(stat.variant)}`}
        >
          {stat.icon && (
            <div className="text-2xl mb-2">{stat.icon}</div>
          )}
          <div className="text-2xl font-bold mb-1">
            {stat.value}
          </div>
          <div className="text-sm opacity-80">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}