/**
 * MCP Manager Template
 * 
 * This template provides a structure for implementing an MCP manager that can:
 * 1. Read MCP server configurations from settings.json
 * 2. Create and manage MCP server connections
 * 3. Handle environment variables and input variables
 * 4. Start, stop, and restart servers
 * 
 * The MCP manager acts as a central point for managing all MCP server connections
 * and provides a unified interface for the rest of the application to interact with
 * MCP servers.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { MCPClient, MCPServerConnection, IMCPServerConfig } from './mcp-client.template';

/**
 * MCP Server Configuration from settings.json
 */
export interface IMCPSettingsServerConfig {
  /** Server type (stdio or sse) */
  type?: 'stdio' | 'sse';
  
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
 * MCP Input Variable Configuration
 */
export interface IMCPInputVariable {
  /** Input type */
  type: 'promptString';
  
  /** Input ID */
  id: string;
  
  /** Input description */
  description: string;
  
  /** Whether input is a password */
  password?: boolean;
}

/**
 * MCP Configuration from settings.json
 */
export interface IMCPSettings {
  /** Input variables */
  inputs?: IMCPInputVariable[];
  
  /** Server configurations */
  servers?: Record<string, IMCPSettingsServerConfig>;
}

/**
 * MCP Server Status
 */
export enum MCPServerStatus {
  /** Server is stopped */
  STOPPED = 'stopped',
  
  /** Server is starting */
  STARTING = 'starting',
  
  /** Server is running */
  RUNNING = 'running',
  
  /** Server is stopping */
  STOPPING = 'stopping',
  
  /** Server has an error */
  ERROR = 'error'
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
  
  /** Error message (if status is ERROR) */
  error?: string;
}

/**
 * MCP Manager
 */
export class MCPManager {
  private outputChannel: vscode.OutputChannel;
  private client: MCPClient;
  private servers: Map<string, IMCPServerInfo> = new Map();
  private inputValues: Map<string, string> = new Map();
  
  /**
   * Create a new MCP manager
   */
  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Adamize MCP Manager');
    this.client = new MCPClient();
    
    // Register configuration change listener
    vscode.workspace.onDidChangeConfiguration(this.handleConfigurationChange.bind(this));
  }
  
  /**
   * Initialize the MCP manager
   */
  public async initialize(): Promise<void> {
    try {
      this.outputChannel.appendLine('Initializing MCP manager');
      
      // Load configurations
      await this.loadConfigurations();
      
      this.outputChannel.appendLine(`Loaded ${this.servers.size} server configurations`);
    } catch (error) {
      this.outputChannel.appendLine(`Error initializing MCP manager: ${error}`);
    }
  }
  
  /**
   * Load MCP configurations from settings.json
   */
  private async loadConfigurations(): Promise<void> {
    try {
      // Clear existing configurations
      this.servers.clear();
      
      // Load workspace configurations
      await this.loadWorkspaceConfigurations();
      
      // Load user configurations
      await this.loadUserConfigurations();
      
      // Load discovered configurations
      if (this.isDiscoveryEnabled()) {
        await this.loadDiscoveredConfigurations();
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error loading configurations: ${error}`);
    }
  }
  
  /**
   * Load workspace configurations from .vscode/mcp.json
   */
  private async loadWorkspaceConfigurations(): Promise<void> {
    try {
      // Check if workspace is open
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return;
      }
      
      // Check each workspace folder for .vscode/mcp.json
      for (const folder of vscode.workspace.workspaceFolders) {
        const mcpJsonPath = path.join(folder.uri.fsPath, '.vscode', 'mcp.json');
        
        if (fs.existsSync(mcpJsonPath)) {
          const mcpJsonContent = fs.readFileSync(mcpJsonPath, 'utf8');
          const mcpSettings = JSON.parse(mcpJsonContent) as IMCPSettings;
          
          // Process input variables
          if (mcpSettings.inputs) {
            for (const input of mcpSettings.inputs) {
              // Store input variable definition
              // (actual values will be prompted when needed)
            }
          }
          
          // Process server configurations
          if (mcpSettings.servers) {
            for (const [name, config] of Object.entries(mcpSettings.servers)) {
              await this.addServerFromConfig(name, config, folder.uri.fsPath);
            }
          }
        }
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error loading workspace configurations: ${error}`);
    }
  }
  
  /**
   * Load user configurations from settings.json
   */
  private async loadUserConfigurations(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('mcp');
      const servers = config.get<Record<string, IMCPSettingsServerConfig>>('servers');
      
      if (servers) {
        for (const [name, serverConfig] of Object.entries(servers)) {
          await this.addServerFromConfig(name, serverConfig);
        }
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error loading user configurations: ${error}`);
    }
  }
  
  /**
   * Load discovered configurations from other tools
   */
  private async loadDiscoveredConfigurations(): Promise<void> {
    try {
      // Implementation would depend on how other tools store their configurations
      // For example, Claude Desktop might store configurations in a specific location
    } catch (error) {
      this.outputChannel.appendLine(`Error loading discovered configurations: ${error}`);
    }
  }
  
  /**
   * Add a server from configuration
   * @param name Server name
   * @param config Server configuration
   * @param workspacePath Workspace path (for resolving relative paths)
   */
  private async addServerFromConfig(
    name: string,
    config: IMCPSettingsServerConfig,
    workspacePath?: string
  ): Promise<void> {
    try {
      // Determine server type
      const type = config.type || 'stdio';
      
      // Create server configuration
      const serverConfig: IMCPServerConfig = {
        name,
        type: type as 'stdio' | 'sse'
      };
      
      if (type === 'stdio') {
        if (!config.command) {
          throw new Error(`Command is required for stdio server: ${name}`);
        }
        
        serverConfig.command = config.command;
        serverConfig.args = config.args;
        
        // Process environment variables
        if (config.env) {
          serverConfig.env = {};
          
          for (const [key, value] of Object.entries(config.env)) {
            // Check if value contains an input variable reference
            if (typeof value === 'string' && value.startsWith('${input:') && value.endsWith('}')) {
              const inputId = value.substring(8, value.length - 1);
              const inputValue = await this.getInputValue(inputId);
              serverConfig.env[key] = inputValue;
            } else {
              serverConfig.env[key] = value;
            }
          }
        }
        
        // Process .env file
        if (config.envFile) {
          const envFilePath = workspacePath
            ? path.resolve(workspacePath, config.envFile)
            : config.envFile;
          
          if (fs.existsSync(envFilePath)) {
            const envVars = dotenv.parse(fs.readFileSync(envFilePath));
            serverConfig.env = { ...serverConfig.env, ...envVars };
          }
        }
      } else if (type === 'sse') {
        if (!config.url) {
          throw new Error(`URL is required for SSE server: ${name}`);
        }
        
        serverConfig.url = config.url;
        
        // Process headers
        if (config.headers) {
          serverConfig.headers = {};
          
          for (const [key, value] of Object.entries(config.headers)) {
            // Check if value contains an input variable reference
            if (typeof value === 'string' && value.startsWith('${input:') && value.endsWith('}')) {
              const inputId = value.substring(8, value.length - 1);
              const inputValue = await this.getInputValue(inputId);
              serverConfig.headers[key] = inputValue;
            } else {
              serverConfig.headers[key] = value;
            }
          }
        }
      }
      
      // Add server to client
      this.client.addServer(serverConfig);
      
      // Store server info
      this.servers.set(name, {
        name,
        config: serverConfig,
        status: MCPServerStatus.STOPPED
      });
      
      this.outputChannel.appendLine(`Added server: ${name}`);
    } catch (error) {
      this.outputChannel.appendLine(`Error adding server ${name}: ${error}`);
    }
  }
  
  /**
   * Get input variable value
   * @param inputId Input variable ID
   * @returns Input variable value
   */
  private async getInputValue(inputId: string): Promise<string> {
    // Check if we already have the value
    if (this.inputValues.has(inputId)) {
      return this.inputValues.get(inputId)!;
    }
    
    // Prompt user for value
    const value = await vscode.window.showInputBox({
      prompt: `Enter value for ${inputId}`,
      password: true // Assume it's sensitive
    });
    
    if (value === undefined) {
      throw new Error(`User cancelled input for ${inputId}`);
    }
    
    // Store value
    this.inputValues.set(inputId, value);
    
    return value;
  }
  
  /**
   * Handle configuration change
   * @param event Configuration change event
   */
  private handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
    if (event.affectsConfiguration('mcp')) {
      this.outputChannel.appendLine('MCP configuration changed, reloading');
      this.loadConfigurations();
    }
  }
  
  /**
   * Check if MCP discovery is enabled
   * @returns True if discovery is enabled
   */
  private isDiscoveryEnabled(): boolean {
    return vscode.workspace.getConfiguration('chat.mcp').get<boolean>('discovery.enabled', true);
  }
  
  /**
   * Get all server infos
   * @returns Array of server infos
   */
  public getServers(): IMCPServerInfo[] {
    return Array.from(this.servers.values());
  }
  
  /**
   * Get server info
   * @param name Server name
   * @returns Server info
   */
  public getServer(name: string): IMCPServerInfo | undefined {
    return this.servers.get(name);
  }
  
  /**
   * Start a server
   * @param name Server name
   * @returns True if server was started successfully
   */
  public async startServer(name: string): Promise<boolean> {
    try {
      const serverInfo = this.servers.get(name);
      
      if (!serverInfo) {
        throw new Error(`Server not found: ${name}`);
      }
      
      if (serverInfo.status === MCPServerStatus.RUNNING) {
        this.outputChannel.appendLine(`Server ${name} is already running`);
        return true;
      }
      
      // Update status
      serverInfo.status = MCPServerStatus.STARTING;
      
      // Connect to server
      const success = await this.client.connectToServer(name);
      
      // Update status
      if (success) {
        serverInfo.status = MCPServerStatus.RUNNING;
        this.outputChannel.appendLine(`Server ${name} started successfully`);
      } else {
        serverInfo.status = MCPServerStatus.ERROR;
        serverInfo.error = 'Failed to connect to server';
        this.outputChannel.appendLine(`Failed to start server ${name}`);
      }
      
      return success;
    } catch (error) {
      this.outputChannel.appendLine(`Error starting server ${name}: ${error}`);
      
      // Update status
      const serverInfo = this.servers.get(name);
      if (serverInfo) {
        serverInfo.status = MCPServerStatus.ERROR;
        serverInfo.error = error instanceof Error ? error.message : String(error);
      }
      
      return false;
    }
  }
  
  /**
   * Stop a server
   * @param name Server name
   */
  public stopServer(name: string): void {
    try {
      const serverInfo = this.servers.get(name);
      
      if (!serverInfo) {
        throw new Error(`Server not found: ${name}`);
      }
      
      if (serverInfo.status !== MCPServerStatus.RUNNING) {
        this.outputChannel.appendLine(`Server ${name} is not running`);
        return;
      }
      
      // Update status
      serverInfo.status = MCPServerStatus.STOPPING;
      
      // Disconnect from server
      this.client.disconnectFromServer(name);
      
      // Update status
      serverInfo.status = MCPServerStatus.STOPPED;
      
      this.outputChannel.appendLine(`Server ${name} stopped`);
    } catch (error) {
      this.outputChannel.appendLine(`Error stopping server ${name}: ${error}`);
    }
  }
  
  /**
   * Restart a server
   * @param name Server name
   * @returns True if server was restarted successfully
   */
  public async restartServer(name: string): Promise<boolean> {
    try {
      // Stop server
      this.stopServer(name);
      
      // Start server
      return await this.startServer(name);
    } catch (error) {
      this.outputChannel.appendLine(`Error restarting server ${name}: ${error}`);
      return false;
    }
  }
  
  /**
   * Dispose the MCP manager
   */
  public dispose(): void {
    try {
      // Stop all servers
      for (const name of this.servers.keys()) {
        this.stopServer(name);
      }
      
      // Clear servers
      this.servers.clear();
      
      // Dispose output channel
      this.outputChannel.dispose();
    } catch (error) {
      console.error('Error disposing MCP manager:', error);
    }
  }
}
