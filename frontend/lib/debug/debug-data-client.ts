/**
 * Enhanced WebSocket client utilities for debug interfaces
 * Extends existing dashboard WebSocket patterns for debug-specific data
 */

import { useWebSocket, WebSocketHook } from '@/lib/dashboard/websocket-client'
import { useState, useEffect, useCallback } from 'react'
import {
  DebugDataHook,
  DebugWebSocketOptions,
  DebugUpdate,
  BattleStateDebugData,
  RegistryStateDebugData,
  WorldStateDebugData,
  SessionDebugData,
  EncounterDebugData,
  HandlerTestData,
  TeamManagerData,
  CombatMechanicsData,
  CaptureDebugData,
  MovementDebugData
} from './debug-types'

/**
 * Base debug WebSocket hook with historical data management
 */
export function useDebugWebSocket<T>(
  interfaceType: string,
  processId?: string,
  options: DebugWebSocketOptions = {}
): DebugDataHook<T> & {
  subscribeToProcess: (id: string) => void
  unsubscribeFromProcess: (id: string) => void
} {
  const {
    maxHistorySize = 100,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    autoSubscribe = true
  } = options

  const [data, setData] = useState<T | null>(null)
  const [historicalData, setHistoricalData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Build WebSocket URL based on interface type and process ID
  const wsUrl = typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:${getWebSocketPort()}/debug/${interfaceType}${processId ? `/${processId}` : ''}`
    : ''

  function getWebSocketPort(): string {
    if (process.env.NODE_ENV === 'production') {
      return window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
    }
    return process.env.NEXT_PUBLIC_WEBSOCKET_PORT || window.location.port || '3000'
  }

  const webSocket = useWebSocket(wsUrl, {
    reconnectAttempts,
    reconnectInterval,
    onConnect: () => {
      setIsLoading(false)
      
      // Auto-subscribe to debug data if enabled
      if (autoSubscribe && processId) {
        webSocket.sendMessage({
          type: 'subscribe',
          interface_type: interfaceType,
          process_id: processId
        })
      }
    },
    onDisconnect: () => {
    },
    onMessage: (messageData: DebugUpdate<T>) => {
      if (messageData.type === 'data_update' && messageData.data) {
        const newData = messageData.data
        setData(newData)
        
        // Update historical data with size limit
        setHistoricalData(prev => {
          const updated = [newData, ...prev].slice(0, maxHistorySize)
          return updated
        })
      }
    },
    onError: () => {
      setIsLoading(false)
    }
  })

  // Manual subscription method
  const subscribeToProcess = useCallback((id: string) => {
    webSocket.sendMessage({
      type: 'subscribe',
      interface_type: interfaceType,
      process_id: id
    })
  }, [webSocket, interfaceType])

  // Unsubscription method
  const unsubscribeFromProcess = useCallback((id: string) => {
    webSocket.sendMessage({
      type: 'unsubscribe',
      interface_type: interfaceType,
      process_id: id
    })
  }, [webSocket, interfaceType])

  return {
    data,
    connected: webSocket.connected,
    error: webSocket.error,
    historicalData,
    isLoading,
    subscribeToProcess,
    unsubscribeFromProcess
  }
}

/**
 * Specialized hooks for different debug interfaces
 */

export function useBattleStateDebug(battleId?: string) {
  return useDebugWebSocket<BattleStateDebugData>('battle-state', battleId, {
    maxHistorySize: 50, // Battles generate less frequent but important updates
    autoSubscribe: !!battleId
  })
}

export function useRegistryStateDebug(registryId?: string) {
  return useDebugWebSocket<RegistryStateDebugData>('registry-state', registryId, {
    maxHistorySize: 20, // Registry updates are comprehensive snapshots
    autoSubscribe: !!registryId
  })
}

export function useWorldStateDebug(worldId?: string) {
  return useDebugWebSocket<WorldStateDebugData>('world-state', worldId, {
    maxHistorySize: 30, // World state updates frequently
    autoSubscribe: !!worldId
  })
}

export function useSessionMonitorDebug(sessionId?: string) {
  return useDebugWebSocket<SessionDebugData>('session-monitor', sessionId, {
    maxHistorySize: 100, // Session events need more history for debugging
    autoSubscribe: !!sessionId
  })
}

export function useEncounterTrackerDebug(agentId?: string) {
  return useDebugWebSocket<EncounterDebugData>('encounter-tracker', agentId, {
    maxHistorySize: 75, // Track encounter history for patterns
    autoSubscribe: !!agentId
  })
}

export function useHandlerTestingDebug(testSuiteId?: string) {
  return useDebugWebSocket<HandlerTestData>('handler-testing', testSuiteId, {
    maxHistorySize: 200, // Testing generates many results
    autoSubscribe: !!testSuiteId
  })
}

export function useTeamManagerDebug(agentId?: string) {
  return useDebugWebSocket<TeamManagerData>('team-manager', agentId, {
    maxHistorySize: 25, // Team changes are less frequent
    autoSubscribe: !!agentId
  })
}

export function useCombatMechanicsDebug(battleId?: string) {
  return useDebugWebSocket<CombatMechanicsData>('combat-mechanics', battleId, {
    maxHistorySize: 150, // Combat mechanics generate detailed calculations
    autoSubscribe: !!battleId
  })
}

export function useCaptureTrackerDebug(agentId?: string) {
  return useDebugWebSocket<CaptureDebugData>('capture-tracker', agentId, {
    maxHistorySize: 100, // Track capture attempts over time
    autoSubscribe: !!agentId
  })
}

export function useMovementTrackerDebug(agentId?: string) {
  return useDebugWebSocket<MovementDebugData>('movement-tracker', agentId, {
    maxHistorySize: 200, // Movement events are frequent
    autoSubscribe: !!agentId
  })
}

/**
 * Generic debug process discovery hook
 * Fetches available processes for debug interface selection
 */
export function useDebugProcessDiscovery(processType: string) {
  const [processes, setProcesses] = useState<Array<{ id: string; name: string; metadata: any }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const wsUrl = typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:${getWebSocketPort()}/debug/discovery`
    : ''

  function getWebSocketPort(): string {
    if (process.env.NODE_ENV === 'production') {
      return window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
    }
    return process.env.NEXT_PUBLIC_WEBSOCKET_PORT || window.location.port || '3000'
  }

  const webSocket = useWebSocket(wsUrl, {
    onConnect: () => {
      // Request process list on connection
      webSocket.sendMessage({
        type: 'get_process_list',
        process_type: processType
      })
    },
    onMessage: (data) => {
      if (data.type === 'process_list' && data.process_type === processType) {
        setProcesses(data.processes || [])
        setLoading(false)
      }
    },
    onError: () => {
      setError(`Failed to discover ${processType} processes`)
      setLoading(false)
    }
  })

  const refreshProcessList = useCallback(() => {
    setLoading(true)
    setError(null)
    if (webSocket.connected) {
      webSocket.sendMessage({
        type: 'get_process_list',
        process_type: processType
      })
    }
  }, [webSocket, processType])

  return {
    processes,
    loading,
    error,
    refreshProcessList,
    connected: webSocket.connected
  }
}

/**
 * Utility hook for managing debug interface filters and search
 */
export function useDebugFiltering<T>(
  data: T[],
  initialFilters: any = {}
) {
  const [filters, setFilters] = useState(initialFilters)
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null)

  const filteredData = useCallback(() => {
    let filtered = [...data]

    // Apply search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(item => {
        return JSON.stringify(item).toLowerCase().includes(searchLower)
      })
    }

    // Apply status filter
    if (filters.statusFilter) {
      filtered = filtered.filter(item => {
        return (item as any).status === filters.statusFilter
      })
    }

    // Apply time range filter
    if (filters.timeRange) {
      filtered = filtered.filter(item => {
        const timestamp = (item as any).timestamp || Date.now()
        return timestamp >= filters.timeRange.start && timestamp <= filters.timeRange.end
      })
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[sortConfig.field]
        const bVal = (b as any)[sortConfig.field]
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [data, filters, sortConfig])

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
    setSortConfig(null)
  }, [initialFilters])

  const updateSort = useCallback((field: string) => {
    setSortConfig((prev: { field: string; direction: 'asc' | 'desc' } | null) => {
      if (prev?.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { field, direction: 'asc' }
    })
  }, [])

  return {
    filteredData: filteredData(),
    filters,
    sortConfig,
    updateFilter,
    clearFilters,
    updateSort
  }
}

/**
 * Performance monitoring for debug interfaces
 */
export function useDebugPerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    dataUpdateFrequency: 0,
    memoryUsage: 0,
    connectionLatency: 0
  })

  const startRenderTiming = useCallback(() => {
    return performance.now()
  }, [])

  const endRenderTiming = useCallback((startTime: number) => {
    const renderTime = performance.now() - startTime
    setMetrics(prev => ({ ...prev, renderTime }))
  }, [])

  const measureLatency = useCallback(async (wsHook: WebSocketHook) => {
    const start = performance.now()
    const pingMessage = { type: 'ping', timestamp: start }
    
    wsHook.sendMessage(pingMessage)
    
    // Note: This would need server support for ping/pong measurement
    // For now, we'll estimate based on connection time
    const estimatedLatency = performance.now() - start
    setMetrics(prev => ({ ...prev, connectionLatency: estimatedLatency }))
  }, [])

  useEffect(() => {
    // Monitor memory usage if available
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memoryInfo.usedJSHeapSize / 1024 / 1024 // MB
      }))
    }
  }, [])

  return {
    metrics,
    startRenderTiming,
    endRenderTiming,
    measureLatency
  }
}