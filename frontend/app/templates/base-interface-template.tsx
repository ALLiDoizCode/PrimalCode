"use client";

import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { Badge } from "@/components/ui/8bit/badge";
import { useState, useEffect } from "react";

// Types for WebSocket connection and real-time data
interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface ProcessStatus {
  processId: string;
  status: "active" | "inactive" | "error";
  lastUpdate: number;
}

interface BaseInterfaceTemplateProps {
  title?: string;
  processId?: string;
  enableWebSocket?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Base Interface Template using 8bitcn components
 * 
 * This template provides:
 * - Responsive layout with gaming aesthetic
 * - WebSocket connection pattern for real-time data
 * - Core component usage examples
 * - TypeScript interfaces for common data structures
 * 
 * Migration pattern for existing HTML interfaces:
 * 1. Replace HTML elements with 8bitcn components
 * 2. Convert CSS classes to Tailwind CSS
 * 3. Add TypeScript interfaces for data structures
 * 4. Implement WebSocket patterns for real-time updates
 */
export function BaseInterfaceTemplate({
  title = "Tuxemon Debug Interface",
  processId = "world",
  enableWebSocket = true,
  className = "",
  children
}: BaseInterfaceTemplateProps) {
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [processStatus, setProcessStatus] = useState<ProcessStatus | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  // WebSocket connection pattern for real-time data integration
  useEffect(() => {
    if (!enableWebSocket) return;

    // WebSocket implementation for real-time data
    // This pattern can be adapted for existing interface WebSocket connections
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        // Example WebSocket connection - adapt URL for actual implementation
        ws = new WebSocket(`ws://localhost:3001/${processId}`);
        
        ws.onopen = () => {
          setConnectionStatus("connected");
          console.log(`Connected to ${processId} process`);
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            setMessages(prev => [...prev.slice(-99), message]); // Keep last 100 messages
            
            // Update process status if message contains status info
            if (message.type === "status") {
              setProcessStatus(message.data);
            }
          } catch (error) {
            // Failed to parse WebSocket message
          }
        };

        ws.onclose = () => {
          setConnectionStatus("disconnected");
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setConnectionStatus("disconnected");
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        setConnectionStatus("disconnected");
      }
    };

    // Simulate connection for demo purposes (replace with actual WebSocket in production)
    setTimeout(() => {
      setConnectionStatus("connected");
      setProcessStatus({
        processId: processId,
        status: "active",
        lastUpdate: Date.now()
      });
    }, 1000);

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [processId, enableWebSocket]);

  const sendCommand = () => {
    if (connectionStatus !== "connected" || !commandInput.trim()) return;

    // Example command sending - adapt for actual implementation
    const message = {
      type: "command",
      data: { command: commandInput },
      timestamp: Date.now()
    };

    // In actual implementation, send via WebSocket
    console.log("Sending command:", message);
    
    // Simulate adding command to message log
    setMessages(prev => [...prev.slice(-99), {
      type: "command_sent",
      data: { command: commandInput },
      timestamp: Date.now()
    }]);
    
    setCommandInput("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
      case "active":
        return "bg-green-600";
      case "connecting":
        return "bg-yellow-600";
      case "disconnected":
      case "inactive":
      case "error":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <div className={`min-h-screen bg-background p-6 ${className}`}>
      {/* Header with process status */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 retro">{title}</h1>
          <p className="text-muted-foreground">Process: {processId}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus)}`} />
            WebSocket: {connectionStatus}
          </Badge>
          
          {processStatus && (
            <Badge variant="outline" className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(processStatus.status)}`} />
              Process: {processStatus.status}
            </Badge>
          )}
        </div>
      </header>

      {/* Command Input Section - Gaming Component Demonstration */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 retro">Command Interface</h2>
        <div className="flex gap-4 flex-col sm:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Enter command (e.g., get-world-info, health-check)..."
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendCommand()}
              font="retro"
              className="w-full"
            />
          </div>
          <Button
            onClick={sendCommand}
            disabled={connectionStatus !== "connected" || !commandInput.trim()}
            variant="default"
            font="retro"
          >
            Send Command
          </Button>
        </div>
      </section>

      {/* Core Component Demonstration */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 retro">8bitcn Component Examples</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Button Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium retro">Button Variants</h3>
            <div className="space-y-2">
              <Button variant="default" font="retro" className="w-full">Default Button</Button>
              <Button variant="destructive" font="retro" className="w-full">Destructive Button</Button>
              <Button variant="outline" font="retro" className="w-full">Outline Button</Button>
              <Button variant="secondary" font="retro" className="w-full">Secondary Button</Button>
              <Button variant="ghost" font="retro" className="w-full">Ghost Button</Button>
              <Button variant="link" font="retro" className="w-full">Link Button</Button>
            </div>
          </div>

          {/* Input Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium retro">Input Examples</h3>
            <div className="space-y-3">
              <Input placeholder="Agent ID..." font="retro" />
              <Input placeholder="Battle coordinates..." font="retro" />
              <Input placeholder="Search creatures..." font="retro" />
              <Input type="number" placeholder="Level filter..." font="retro" />
            </div>
          </div>

          {/* Badge Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium retro">Badge Examples</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Online</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="outline">Offline</Badge>
              <Badge variant="secondary">Pending</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Example */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 retro">Navigation Pattern</h2>
        <nav className="flex flex-wrap gap-2">
          <Button variant="ghost" font="retro">World State</Button>
          <Button variant="ghost" font="retro">Battle System</Button>
          <Button variant="ghost" font="retro">Agent Registry</Button>
          <Button variant="ghost" font="retro">Performance Monitor</Button>
          <Button variant="ghost" font="retro">Debug Tools</Button>
        </nav>
      </section>

      {/* Content Area */}
      {children ? (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 retro">Content</h2>
          <div className="bg-card border border-border rounded-lg p-6">
            {children}
          </div>
        </section>
      ) : (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 retro">Interface Content Area</h2>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-muted-foreground retro">
              This area would contain your interface-specific content.
              Replace this section with your actual interface implementation.
            </p>
          </div>
        </section>
      )}

      {/* Message Log for WebSocket debugging */}
      {enableWebSocket && messages.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 retro">Message Log</h2>
          <div className="bg-card border border-border rounded-lg p-4 max-h-60 overflow-y-auto">
            <div className="space-y-2 text-sm font-mono">
              {messages.slice(-10).map((message, index) => (
                <div key={index} className="text-muted-foreground">
                  <span className="text-foreground">
                    [{new Date(message.timestamp).toLocaleTimeString()}]
                  </span>{" "}
                  {message.type}: {JSON.stringify(message.data)}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer with migration guidance */}
      <footer className="mt-12 pt-8 border-t border-border">
        <div className="text-sm text-muted-foreground retro">
          <h3 className="font-semibold mb-2">Migration Guide for Existing Interfaces:</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>Replace HTML buttons with Button component variants</li>
            <li>Replace HTML inputs with Input component (retro font)</li>
            <li>Replace status indicators with Badge components</li>
            <li>Convert CSS classes to Tailwind CSS utilities</li>
            <li>Add TypeScript interfaces for data structures</li>
            <li>Implement WebSocket patterns using useEffect hooks</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

export default BaseInterfaceTemplate;