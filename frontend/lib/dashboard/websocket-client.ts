import { useState, useEffect, useCallback, useRef } from 'react'

export interface WebSocketHookState {
  data: any
  connected: boolean
  error: string | null
  lastMessage: any
}

export interface WebSocketHookActions {
  sendMessage: (message: any) => void
  reconnect: () => void
  disconnect: () => void
}

export type WebSocketHook = WebSocketHookState & WebSocketHookActions

interface WebSocketOptions {
  reconnectAttempts?: number
  reconnectInterval?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  onMessage?: (data: any) => void
}

/**
 * Custom React hook for managing WebSocket connections with automatic reconnection
 * and state management optimized for dashboard real-time updates.
 */
export function useWebSocket(url: string, options: WebSocketOptions = {}): WebSocketHook {
  const {
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    onConnect,
    onDisconnect,
    onError,
    onMessage
  } = options

  const [data, setData] = useState<any>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<any>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectCountRef = useRef(0)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        setError(null)
        reconnectCountRef.current = 0
        onConnect?.()
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const messageData = JSON.parse(event.data)
          setData(messageData)
          setLastMessage(messageData)
          onMessage?.(messageData)
        } catch (err) {
          setError('Failed to parse message')
        }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setConnected(false)
        onDisconnect?.()
        
        // Attempt reconnection if within retry limits
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++
          setError(`Reconnecting... (${reconnectCountRef.current}/${reconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else {
          setError('Connection failed - maximum reconnection attempts reached')
        }
      }

      ws.onerror = (event) => {
        if (!mountedRef.current) return
        setError('WebSocket connection error')
        onError?.(event)
      }

    } catch (err) {
      if (!mountedRef.current) return
      setError(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [url, reconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onMessage])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message)
        wsRef.current.send(messageStr)
      } catch (err) {
        setError(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    } else {
      setError('WebSocket is not connected')
    }
  }, [])

  const reconnect = useCallback(() => {
    reconnectCountRef.current = 0
    setError(null)
    connect()
  }, [connect])

  const disconnect = useCallback(() => {
    mountedRef.current = false
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setConnected(false)
    setData(null)
    setError(null)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, [connect, disconnect])

  return {
    data,
    connected,
    error,
    lastMessage,
    sendMessage,
    reconnect,
    disconnect
  }
}

/**
 * Specialized hook for dashboard process monitoring with predefined message types
 */
export function useProcessMonitor(processId?: string) {
  const wsUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:${getWebSocketPort()}/process-monitor`
    : ''
    
  function getWebSocketPort(): string {
    // In production, use the same port as the web server
    // In development, use default Next.js dev server port (3000) or override with WEBSOCKET_PORT env var
    if (process.env.NODE_ENV === 'production') {
      return window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
    }
    return process.env.NEXT_PUBLIC_WEBSOCKET_PORT || window.location.port || '3000'
  }

  const webSocket = useWebSocket(wsUrl, {
    onConnect: () => {
    },
    onDisconnect: () => {
    }
  })

  const subscribeToProcess = useCallback((id: string) => {
    webSocket.sendMessage({
      type: 'subscribe_process',
      process_id: id
    })
  }, [webSocket])

  const unsubscribeFromProcess = useCallback((id: string) => {
    webSocket.sendMessage({
      type: 'unsubscribe_process', 
      process_id: id
    })
  }, [webSocket])

  const requestProcessList = useCallback(() => {
    webSocket.sendMessage({
      type: 'get_process_list'
    })
  }, [webSocket])

  const requestProcessState = useCallback((id: string, type: string) => {
    webSocket.sendMessage({
      type: 'get_process_state',
      process_id: id,
      process_type: type
    })
  }, [webSocket])

  // Auto-subscribe to process if provided
  useEffect(() => {
    if (processId && webSocket.connected) {
      subscribeToProcess(processId)
    }
  }, [processId, webSocket.connected, subscribeToProcess])

  return {
    ...webSocket,
    subscribeToProcess,
    unsubscribeFromProcess,
    requestProcessList,
    requestProcessState
  }
}

/**
 * Hook for managing activity feed data with filtering and pagination
 */
export function useActivityFeed(maxItems = 100) {
  const [activities, setActivities] = useState<any[]>([])
  const [paused, setPaused] = useState(false)

  const addActivity = useCallback((activity: any) => {
    if (paused) return

    setActivities(prev => {
      const newActivities = [activity, ...prev].slice(0, maxItems)
      return newActivities
    })
  }, [paused, maxItems])

  const clearActivities = useCallback(() => {
    setActivities([])
  }, [])

  const togglePause = useCallback(() => {
    setPaused(prev => !prev)
  }, [])

  const filterActivities = useCallback((filterFn: (activity: any) => boolean) => {
    return activities.filter(filterFn)
  }, [activities])

  return {
    activities,
    paused,
    addActivity,
    clearActivities,
    togglePause,
    filterActivities
  }
}