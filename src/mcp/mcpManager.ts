/**
 * MCP Manager
 *
 * This module provides a class for managing MCP servers and connections.
 * It supports:
 * - Starting and stopping MCP servers
 * - Managing connections to MCP servers
 * - Discovering available tools
 * - Calling functions on tools
 *
 * @module mcp/mcpManager
 */

import * as vscode from 'vscode';
import { MCPConfigManager } from './mcpConfigManager';
import { MCPServerConnection } from './mcpServerConnection';
import { IMCPServerConfig } from './mcpTypes';

/**
 * MCP Server Status
 */
export enum MCPServerStatus {
  /** Server is not running */
  Stopped = 'stopped',
  /** Server is starting */
  Starting = 'starting',
  /** Server is running */
  Running = 'running',
  /** Server is stopping */
  Stopping = 'stopping',
  /** Server failed to start */
  Failed = 'failed'
}

/**
 * MCP Server Info
 */
export interface IMCPServerInfo {
  /** Server name */
  name: string;
  /** Server configuration */
  config: IMCPServerConfig;
  /** Server status */
  status: MCPServerStatus;
  /** Server connection */
  connection?: MCPServerConnection;
  /** Available tools */
  tools: string[];
}

/**
 * MCP Manager
 *
 * This class manages MCP servers and connections.
 */
export class MCPManager {
  private outputChannel: vscode.OutputChannel;
  private configManager: MCPConfigManager;
  private servers: Map<string, IMCPServerInfo> = new Map();

  /**
   * Create a new MCP manager
   */
  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Adamize MCP Manager');
    this.configManager = new MCPConfigManager(this.outputChannel);
  }

  /**
   * Initialize the MCP manager
   */
  public async initialize(): Promise<void> {
    try {
      this.outputChannel.appendLine('Initializing MCP manager');

      // Initialize configuration manager
      await this.configManager.initialize();

      // Load server configurations
      const configs = this.configManager.getServerConfigs();
      configs.forEach(config => {
        this.servers.set(config.name, {
          name: config.name,
          config,
          status: MCPServerStatus.Stopped,
          tools: []
        });
      });

      this.outputChannel.appendLine(`Loaded ${configs.length} server configurations`);
    } catch (error) {
      this.outputChannel.appendLine(`Error initializing MCP manager: ${error}`);
    }
  }

  /**
   * Get all servers
   * @returns Array of server info objects
   */
  public getServers(): IMCPServerInfo[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get server by name
   * @param name Server name
   * @returns Server info or undefined if not found
   */
  public getServer(name: string): IMCPServerInfo | undefined {
    return this.servers.get(name);
  }

  /**
   * Start a server
   * @param name Server name
   * @returns True if started successfully
   */
  public async startServer(name: string): Promise<boolean> {
    try {
      const server = this.servers.get(name);
      if (!server) {
        this.outputChannel.appendLine(`Server not found: ${name}`);
        return false;
      }

      if (server.status === MCPServerStatus.Running) {
        this.outputChannel.appendLine(`Server already running: ${name}`);
        return true;
      }

      // Update status
      server.status = MCPServerStatus.Starting;
      this.outputChannel.appendLine(`Starting server: ${name}`);

      // Create connection
      const connection = new MCPServerConnection(server.config, this.outputChannel);
      
      // Connect to server
      const connected = await connection.connect();
      
      if (connected) {
        server.connection = connection;
        server.status = MCPServerStatus.Running;
        this.outputChannel.appendLine(`Server started: ${name}`);
        
        // Discover tools
        await this.discoverTools(name);
        
        return true;
      } else {
        server.status = MCPServerStatus.Failed;
        this.outputChannel.appendLine(`Failed to start server: ${name}`);
        return false;
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error starting server: ${error}`);
      return false;
    }
  }

  /**
   * Stop a server
   * @param name Server name
   * @returns True if stopped successfully
   */
  public async stopServer(name: string): Promise<boolean> {
    try {
      const server = this.servers.get(name);
      if (!server) {
        this.outputChannel.appendLine(`Server not found: ${name}`);
        return false;
      }

      if (server.status !== MCPServerStatus.Running) {
        this.outputChannel.appendLine(`Server not running: ${name}`);
        return true;
      }

      // Update status
      server.status = MCPServerStatus.Stopping;
      this.outputChannel.appendLine(`Stopping server: ${name}`);

      // Disconnect
      server.connection?.disconnect();
      server.connection = undefined;
      server.status = MCPServerStatus.Stopped;
      
      this.outputChannel.appendLine(`Server stopped: ${name}`);
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error stopping server: ${error}`);
      return false;
    }
  }

  /**
   * Discover tools from a server
   * @param name Server name
   * @returns Array of tool names
   */
  public async discoverTools(name: string): Promise<string[]> {
    try {
      const server = this.servers.get(name);
      if (!server) {
        this.outputChannel.appendLine(`Server not found: ${name}`);
        return [];
      }

      if (server.status !== MCPServerStatus.Running) {
        this.outputChannel.appendLine(`Server not running: ${name}`);
        return [];
      }

      // This is a placeholder for tool discovery
      // In a real implementation, this would query the server for available tools
      const tools: string[] = ['tool1', 'tool2', 'tool3'];
      
      server.tools = tools;
      this.outputChannel.appendLine(`Discovered ${tools.length} tools from server: ${name}`);
      
      return tools;
    } catch (error) {
      this.outputChannel.appendLine(`Error discovering tools: ${error}`);
      return [];
    }
  }

  /**
   * Get tools from a server
   * @param name Server name
   * @returns Array of tool names
   */
  public async getTools(name: string): Promise<string[]> {
    try {
      const server = this.servers.get(name);
      if (!server) {
        this.outputChannel.appendLine(`Server not found: ${name}`);
        return [];
      }

      if (server.status !== MCPServerStatus.Running) {
        this.outputChannel.appendLine(`Server not running: ${name}`);
        return [];
      }

      return server.tools;
    } catch (error) {
      this.outputChannel.appendLine(`Error getting tools: ${error}`);
      return [];
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    try {
      // Stop all servers
      this.servers.forEach(server => {
        if (server.status === MCPServerStatus.Running) {
          server.connection?.disconnect();
        }
      });

      this.outputChannel.dispose();
    } catch (error) {
      console.error(`Error disposing MCP manager: ${error}`);
    }
  }
}
