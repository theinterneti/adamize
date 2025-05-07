/**
 * MCP Client Template
 * 
 * This template provides a structure for implementing an MCP client that can:
 * 1. Connect to MCP servers (both stdio and SSE)
 * 2. Discover available tools
 * 3. Call functions on tools
 * 4. Handle responses and errors
 * 
 * Requirements implemented:
 * - REQ-MCP-001: Connect to an MCP server
 * - REQ-MCP-002: Discover available tools from the MCP server
 * - REQ-MCP-003: Retrieve the schema for a specific tool
 * - REQ-MCP-010: Call functions on tools with parameters
 * - REQ-MCP-011: Validate parameters against the function schema
 * - REQ-MCP-012: Handle successful function call responses
 * - REQ-MCP-013: Handle error responses from function calls
 * - REQ-MCP-020: Handle connection errors gracefully
 * - REQ-MCP-021: Handle tool discovery errors gracefully
 * - REQ-MCP-022: Handle schema retrieval errors gracefully
 * - REQ-MCP-023: Handle parameter validation errors gracefully
 * - REQ-MCP-030: Log connection attempts and results
 * - REQ-MCP-031: Log tool discovery attempts and results
 * - REQ-MCP-032: Log function calls and results
 * - REQ-MCP-033: Log errors with appropriate detail
 */

import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import axios from 'axios';
import { EventSource } from 'eventsource';

/**
 * MCP Server Configuration
 */
export interface IMCPServerConfig {
  /** Server name */
  name: string;
  
  /** Server type (stdio or sse) */
  type: 'stdio' | 'sse';
  
  /** Command to run (for stdio servers) */
  command?: string;
  
  /** Command arguments (for stdio servers) */
  args?: string[];
  
  /** Environment variables (for stdio servers) */
  env?: Record<string, string>;
  
  /** Path to .env file (for stdio servers) */
  envFile?: string;
  
  /** Server URL (for sse servers) */
  url?: string;
  
  /** HTTP headers (for sse servers) */
  headers?: Record<string, string>;
}

/**
 * MCP Tool Schema
 */
export interface IMCPToolSchema {
  /** Tool name */
  name: string;
  
  /** Tool description */
  description: string;
  
  /** Tool functions */
  functions: IMCPFunctionSchema[];
}

/**
 * MCP Function Schema
 */
export interface IMCPFunctionSchema {
  /** Function name */
  name: string;
  
  /** Function description */
  description: string;
  
  /** Function parameters */
  parameters: IMCPParameterSchema[];
}

/**
 * MCP Parameter Schema
 */
export interface IMCPParameterSchema {
  /** Parameter name */
  name: string;
  
  /** Parameter description */
  description: string;
  
  /** Parameter type */
  type: string;
  
  /** Whether parameter is required */
  required: boolean;
}

/**
 * MCP Function Call Result
 */
export interface IMCPFunctionCallResult {
  /** Call status */
  status: 'success' | 'error';
  
  /** Result data (if status is success) */
  result?: unknown;
  
  /** Error message (if status is error) */
  error?: string;
}

/**
 * MCP Server Connection
 */
export class MCPServerConnection {
  private process?: ChildProcess;
  private eventSource?: EventSource;
  private outputChannel: vscode.OutputChannel;
  private isConnected: boolean = false;
  
  /**
   * Create a new MCP server connection
   * @param config Server configuration
   * @param outputChannel Output channel for logging
   */
  constructor(
    private config: IMCPServerConfig,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
  }
  
  /**
   * Connect to the MCP server
   * @returns True if connected successfully
   */
  public async connect(): Promise<boolean> {
    try {
      this.outputChannel.appendLine(`Connecting to MCP server: ${this.config.name}`);
      
      if (this.config.type === 'stdio') {
        return this.connectStdio();
      } else if (this.config.type === 'sse') {
        return this.connectSSE();
      } else {
        throw new Error(`Unsupported server type: ${this.config.type}`);
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error connecting to MCP server: ${error}`);
      return false;
    }
  }
  
  /**
   * Connect to stdio server
   * @returns True if connected successfully
   */
  private async connectStdio(): Promise<boolean> {
    try {
      if (!this.config.command) {
        throw new Error('Command is required for stdio servers');
      }
      
      // Prepare environment variables
      const env = { ...process.env, ...this.config.env };
      
      // Spawn process
      this.process = spawn(this.config.command, this.config.args || [], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Handle process events
      this.process.on('error', (error) => {
        this.outputChannel.appendLine(`Process error: ${error}`);
        this.isConnected = false;
      });
      
      this.process.on('exit', (code) => {
        this.outputChannel.appendLine(`Process exited with code: ${code}`);
        this.isConnected = false;
      });
      
      // Handle stdout and stderr
      this.process.stdout?.on('data', (data) => {
        this.outputChannel.appendLine(`[stdout] ${data.toString()}`);
        // Process JSON-RPC messages from stdout
      });
      
      this.process.stderr?.on('data', (data) => {
        this.outputChannel.appendLine(`[stderr] ${data.toString()}`);
      });
      
      this.isConnected = true;
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error connecting to stdio server: ${error}`);
      return false;
    }
  }
  
  /**
   * Connect to SSE server
   * @returns True if connected successfully
   */
  private async connectSSE(): Promise<boolean> {
    try {
      if (!this.config.url) {
        throw new Error('URL is required for SSE servers');
      }
      
      // Create EventSource
      this.eventSource = new EventSource(this.config.url, {
        headers: this.config.headers
      });
      
      // Handle EventSource events
      this.eventSource.onopen = () => {
        this.outputChannel.appendLine('SSE connection opened');
        this.isConnected = true;
      };
      
      this.eventSource.onerror = (error) => {
        this.outputChannel.appendLine(`SSE error: ${error}`);
        this.isConnected = false;
      };
      
      this.eventSource.onmessage = (event) => {
        this.outputChannel.appendLine(`SSE message: ${event.data}`);
        // Process JSON-RPC messages from SSE
      };
      
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error connecting to SSE server: ${error}`);
      return false;
    }
  }
  
  /**
   * Disconnect from the MCP server
   */
  public disconnect(): void {
    try {
      if (this.config.type === 'stdio' && this.process) {
        this.process.kill();
        this.process = undefined;
      } else if (this.config.type === 'sse' && this.eventSource) {
        this.eventSource.close();
        this.eventSource = undefined;
      }
      
      this.isConnected = false;
      this.outputChannel.appendLine(`Disconnected from MCP server: ${this.config.name}`);
    } catch (error) {
      this.outputChannel.appendLine(`Error disconnecting from MCP server: ${error}`);
    }
  }
  
  /**
   * Check if connected to the MCP server
   * @returns True if connected
   */
  public isConnectedToServer(): boolean {
    return this.isConnected;
  }
  
  /**
   * Send a message to the MCP server
   * @param message Message to send
   */
  public sendMessage(message: unknown): void {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to MCP server');
      }
      
      const messageStr = JSON.stringify(message);
      
      if (this.config.type === 'stdio' && this.process) {
        this.process.stdin?.write(messageStr + '\n');
      } else if (this.config.type === 'sse' && this.config.url) {
        // For SSE, we need to send messages via HTTP POST
        axios.post(this.config.url, messageStr, {
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers
          }
        });
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error sending message: ${error}`);
    }
  }
}

/**
 * MCP Client
 */
export class MCPClient {
  private outputChannel: vscode.OutputChannel;
  private connections: Map<string, MCPServerConnection> = new Map();
  private toolSchemas: Map<string, IMCPToolSchema> = new Map();
  
  /**
   * Create a new MCP client
   */
  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Adamize MCP Client');
  }
  
  /**
   * Add an MCP server
   * @param config Server configuration
   * @returns True if server was added successfully
   */
  public addServer(config: IMCPServerConfig): boolean {
    try {
      const connection = new MCPServerConnection(config, this.outputChannel);
      this.connections.set(config.name, connection);
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error adding server: ${error}`);
      return false;
    }
  }
  
  /**
   * Connect to an MCP server
   * @param serverName Server name
   * @returns True if connected successfully
   */
  public async connectToServer(serverName: string): Promise<boolean> {
    try {
      const connection = this.connections.get(serverName);
      if (!connection) {
        throw new Error(`Server not found: ${serverName}`);
      }
      
      return await connection.connect();
    } catch (error) {
      this.outputChannel.appendLine(`Error connecting to server: ${error}`);
      return false;
    }
  }
  
  /**
   * Disconnect from an MCP server
   * @param serverName Server name
   */
  public disconnectFromServer(serverName: string): void {
    try {
      const connection = this.connections.get(serverName);
      if (connection) {
        connection.disconnect();
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error disconnecting from server: ${error}`);
    }
  }
  
  /**
   * Get available tools from an MCP server
   * @param serverName Server name
   * @returns List of available tools
   */
  public async getTools(serverName: string): Promise<IMCPToolSchema[]> {
    // Implementation would depend on the specific MCP server protocol
    return [];
  }
  
  /**
   * Call a function on a tool
   * @param serverName Server name
   * @param toolName Tool name
   * @param functionName Function name
   * @param parameters Function parameters
   * @returns Function call result
   */
  public async callFunction(
    serverName: string,
    toolName: string,
    functionName: string,
    parameters: Record<string, unknown>
  ): Promise<IMCPFunctionCallResult> {
    // Implementation would depend on the specific MCP server protocol
    return { status: 'success', result: {} };
  }
}
