/**
 * MCP Configuration Template
 * 
 * This template provides a structure for implementing MCP configuration interfaces
 * that can be used to read and write MCP server configurations from various sources:
 * 1. Workspace settings (.vscode/mcp.json)
 * 2. User settings (settings.json)
 * 3. Discovered configurations from other tools
 * 
 * The configuration interfaces are designed to be extensible and reusable across
 * different parts of the application.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

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
  
  /** Server URL (for sse servers) */
  url?: string;
  
  /** HTTP headers (for sse servers) */
  headers?: Record<string, string>;
  
  /** Source of the configuration (workspace, user, discovered) */
  source: 'workspace' | 'user' | 'discovered';
  
  /** Path to the workspace folder (for workspace configurations) */
  workspacePath?: string;
}

/**
 * MCP Configuration Provider
 */
export interface IMCPConfigProvider {
  /** Get all server configurations */
  getServerConfigs(): Promise<IMCPServerConfig[]>;
  
  /** Get input variables */
  getInputVariables(): Promise<IMCPInputVariable[]>;
  
  /** Get input variable value */
  getInputValue(inputId: string): Promise<string | undefined>;
  
  /** Set input variable value */
  setInputValue(inputId: string, value: string): Promise<void>;
}

/**
 * MCP Workspace Configuration Provider
 */
export class MCPWorkspaceConfigProvider implements IMCPConfigProvider {
  private outputChannel: vscode.OutputChannel;
  
  /**
   * Create a new MCP workspace configuration provider
   * @param outputChannel Output channel for logging
   */
  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }
  
  /**
   * Get all server configurations from workspace settings
   * @returns Array of server configurations
   */
  public async getServerConfigs(): Promise<IMCPServerConfig[]> {
    try {
      const configs: IMCPServerConfig[] = [];
      
      // Check if workspace is open
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return configs;
      }
      
      // Check each workspace folder for .vscode/mcp.json
      for (const folder of vscode.workspace.workspaceFolders) {
        const mcpJsonPath = path.join(folder.uri.fsPath, '.vscode', 'mcp.json');
        
        if (fs.existsSync(mcpJsonPath)) {
          try {
            const mcpJsonContent = fs.readFileSync(mcpJsonPath, 'utf8');
            const mcpSettings = JSON.parse(mcpJsonContent) as IMCPSettings;
            
            // Process server configurations
            if (mcpSettings.servers) {
              for (const [name, config] of Object.entries(mcpSettings.servers)) {
                configs.push({
                  name,
                  type: config.type || 'stdio',
                  command: config.command,
                  args: config.args,
                  env: config.env,
                  url: config.url,
                  headers: config.headers,
                  source: 'workspace',
                  workspacePath: folder.uri.fsPath
                });
              }
            }
          } catch (error) {
            this.outputChannel.appendLine(`Error parsing ${mcpJsonPath}: ${error}`);
          }
        }
      }
      
      return configs;
    } catch (error) {
      this.outputChannel.appendLine(`Error getting workspace server configs: ${error}`);
      return [];
    }
  }
  
  /**
   * Get input variables from workspace settings
   * @returns Array of input variables
   */
  public async getInputVariables(): Promise<IMCPInputVariable[]> {
    try {
      const variables: IMCPInputVariable[] = [];
      
      // Check if workspace is open
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return variables;
      }
      
      // Check each workspace folder for .vscode/mcp.json
      for (const folder of vscode.workspace.workspaceFolders) {
        const mcpJsonPath = path.join(folder.uri.fsPath, '.vscode', 'mcp.json');
        
        if (fs.existsSync(mcpJsonPath)) {
          try {
            const mcpJsonContent = fs.readFileSync(mcpJsonPath, 'utf8');
            const mcpSettings = JSON.parse(mcpJsonContent) as IMCPSettings;
            
            // Process input variables
            if (mcpSettings.inputs) {
              variables.push(...mcpSettings.inputs);
            }
          } catch (error) {
            this.outputChannel.appendLine(`Error parsing ${mcpJsonPath}: ${error}`);
          }
        }
      }
      
      return variables;
    } catch (error) {
      this.outputChannel.appendLine(`Error getting workspace input variables: ${error}`);
      return [];
    }
  }
  
  /**
   * Get input variable value
   * @param inputId Input variable ID
   * @returns Input variable value
   */
  public async getInputValue(inputId: string): Promise<string | undefined> {
    // Workspace config provider doesn't store values
    // Values are stored by the MCP manager
    return undefined;
  }
  
  /**
   * Set input variable value
   * @param inputId Input variable ID
   * @param value Input variable value
   */
  public async setInputValue(inputId: string, value: string): Promise<void> {
    // Workspace config provider doesn't store values
    // Values are stored by the MCP manager
  }
}

/**
 * MCP User Configuration Provider
 */
export class MCPUserConfigProvider implements IMCPConfigProvider {
  private outputChannel: vscode.OutputChannel;
  
  /**
   * Create a new MCP user configuration provider
   * @param outputChannel Output channel for logging
   */
  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }
  
  /**
   * Get all server configurations from user settings
   * @returns Array of server configurations
   */
  public async getServerConfigs(): Promise<IMCPServerConfig[]> {
    try {
      const configs: IMCPServerConfig[] = [];
      
      const config = vscode.workspace.getConfiguration('mcp');
      const servers = config.get<Record<string, IMCPSettingsServerConfig>>('servers');
      
      if (servers) {
        for (const [name, serverConfig] of Object.entries(servers)) {
          configs.push({
            name,
            type: serverConfig.type || 'stdio',
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env,
            url: serverConfig.url,
            headers: serverConfig.headers,
            source: 'user'
          });
        }
      }
      
      return configs;
    } catch (error) {
      this.outputChannel.appendLine(`Error getting user server configs: ${error}`);
      return [];
    }
  }
  
  /**
   * Get input variables from user settings
   * @returns Array of input variables
   */
  public async getInputVariables(): Promise<IMCPInputVariable[]> {
    try {
      const variables: IMCPInputVariable[] = [];
      
      const config = vscode.workspace.getConfiguration('mcp');
      const inputs = config.get<IMCPInputVariable[]>('inputs');
      
      if (inputs) {
        variables.push(...inputs);
      }
      
      return variables;
    } catch (error) {
      this.outputChannel.appendLine(`Error getting user input variables: ${error}`);
      return [];
    }
  }
  
  /**
   * Get input variable value
   * @param inputId Input variable ID
   * @returns Input variable value
   */
  public async getInputValue(inputId: string): Promise<string | undefined> {
    // User config provider doesn't store values
    // Values are stored by the MCP manager
    return undefined;
  }
  
  /**
   * Set input variable value
   * @param inputId Input variable ID
   * @param value Input variable value
   */
  public async setInputValue(inputId: string, value: string): Promise<void> {
    // User config provider doesn't store values
    // Values are stored by the MCP manager
  }
}

/**
 * MCP Discovery Configuration Provider
 */
export class MCPDiscoveryConfigProvider implements IMCPConfigProvider {
  private outputChannel: vscode.OutputChannel;
  
  /**
   * Create a new MCP discovery configuration provider
   * @param outputChannel Output channel for logging
   */
  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }
  
  /**
   * Get all server configurations from discovered sources
   * @returns Array of server configurations
   */
  public async getServerConfigs(): Promise<IMCPServerConfig[]> {
    try {
      const configs: IMCPServerConfig[] = [];
      
      // Check if discovery is enabled
      if (!this.isDiscoveryEnabled()) {
        return configs;
      }
      
      // Discover configurations from Claude Desktop
      const claudeConfigs = await this.discoverClaudeConfigs();
      configs.push(...claudeConfigs);
      
      // Discover configurations from other sources
      // ...
      
      return configs;
    } catch (error) {
      this.outputChannel.appendLine(`Error getting discovered server configs: ${error}`);
      return [];
    }
  }
  
  /**
   * Discover configurations from Claude Desktop
   * @returns Array of server configurations
   */
  private async discoverClaudeConfigs(): Promise<IMCPServerConfig[]> {
    try {
      const configs: IMCPServerConfig[] = [];
      
      // Implementation would depend on how Claude Desktop stores its configurations
      // This is just a placeholder
      
      return configs;
    } catch (error) {
      this.outputChannel.appendLine(`Error discovering Claude configs: ${error}`);
      return [];
    }
  }
  
  /**
   * Get input variables from discovered sources
   * @returns Array of input variables
   */
  public async getInputVariables(): Promise<IMCPInputVariable[]> {
    // Discovery config provider doesn't provide input variables
    return [];
  }
  
  /**
   * Get input variable value
   * @param inputId Input variable ID
   * @returns Input variable value
   */
  public async getInputValue(inputId: string): Promise<string | undefined> {
    // Discovery config provider doesn't store values
    return undefined;
  }
  
  /**
   * Set input variable value
   * @param inputId Input variable ID
   * @param value Input variable value
   */
  public async setInputValue(inputId: string, value: string): Promise<void> {
    // Discovery config provider doesn't store values
  }
  
  /**
   * Check if MCP discovery is enabled
   * @returns True if discovery is enabled
   */
  private isDiscoveryEnabled(): boolean {
    return vscode.workspace.getConfiguration('chat.mcp').get<boolean>('discovery.enabled', true);
  }
}

/**
 * MCP Configuration Manager
 */
export class MCPConfigManager implements IMCPConfigProvider {
  private outputChannel: vscode.OutputChannel;
  private providers: IMCPConfigProvider[] = [];
  private inputValues: Map<string, string> = new Map();
  
  /**
   * Create a new MCP configuration manager
   * @param outputChannel Output channel for logging
   */
  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    
    // Create providers
    this.providers.push(new MCPWorkspaceConfigProvider(outputChannel));
    this.providers.push(new MCPUserConfigProvider(outputChannel));
    this.providers.push(new MCPDiscoveryConfigProvider(outputChannel));
    
    // Register configuration change listener
    vscode.workspace.onDidChangeConfiguration(this.handleConfigurationChange.bind(this));
  }
  
  /**
   * Get all server configurations
   * @returns Array of server configurations
   */
  public async getServerConfigs(): Promise<IMCPServerConfig[]> {
    try {
      const configs: IMCPServerConfig[] = [];
      
      // Get configurations from all providers
      for (const provider of this.providers) {
        const providerConfigs = await provider.getServerConfigs();
        configs.push(...providerConfigs);
      }
      
      // Remove duplicates (prefer workspace > user > discovered)
      const uniqueConfigs = new Map<string, IMCPServerConfig>();
      
      for (const config of configs) {
        const existingConfig = uniqueConfigs.get(config.name);
        
        if (!existingConfig || this.isHigherPriority(config.source, existingConfig.source)) {
          uniqueConfigs.set(config.name, config);
        }
      }
      
      return Array.from(uniqueConfigs.values());
    } catch (error) {
      this.outputChannel.appendLine(`Error getting server configs: ${error}`);
      return [];
    }
  }
  
  /**
   * Check if source1 has higher priority than source2
   * @param source1 First source
   * @param source2 Second source
   * @returns True if source1 has higher priority
   */
  private isHigherPriority(
    source1: 'workspace' | 'user' | 'discovered',
    source2: 'workspace' | 'user' | 'discovered'
  ): boolean {
    const priority = {
      workspace: 3,
      user: 2,
      discovered: 1
    };
    
    return priority[source1] > priority[source2];
  }
  
  /**
   * Get input variables
   * @returns Array of input variables
   */
  public async getInputVariables(): Promise<IMCPInputVariable[]> {
    try {
      const variables: IMCPInputVariable[] = [];
      
      // Get variables from all providers
      for (const provider of this.providers) {
        const providerVariables = await provider.getInputVariables();
        variables.push(...providerVariables);
      }
      
      // Remove duplicates (prefer workspace > user)
      const uniqueVariables = new Map<string, IMCPInputVariable>();
      
      for (const variable of variables) {
        uniqueVariables.set(variable.id, variable);
      }
      
      return Array.from(uniqueVariables.values());
    } catch (error) {
      this.outputChannel.appendLine(`Error getting input variables: ${error}`);
      return [];
    }
  }
  
  /**
   * Get input variable value
   * @param inputId Input variable ID
   * @returns Input variable value
   */
  public async getInputValue(inputId: string): Promise<string | undefined> {
    // Check if we already have the value
    if (this.inputValues.has(inputId)) {
      return this.inputValues.get(inputId);
    }
    
    // Prompt user for value
    const variables = await this.getInputVariables();
    const variable = variables.find(v => v.id === inputId);
    
    if (!variable) {
      return undefined;
    }
    
    const value = await vscode.window.showInputBox({
      prompt: variable.description,
      password: variable.password
    });
    
    if (value === undefined) {
      return undefined;
    }
    
    // Store value
    this.inputValues.set(inputId, value);
    
    return value;
  }
  
  /**
   * Set input variable value
   * @param inputId Input variable ID
   * @param value Input variable value
   */
  public async setInputValue(inputId: string, value: string): Promise<void> {
    this.inputValues.set(inputId, value);
  }
  
  /**
   * Handle configuration change
   * @param event Configuration change event
   */
  private handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
    // Clear input values if configuration changes
    if (
      event.affectsConfiguration('mcp') ||
      event.affectsConfiguration('chat.mcp.discovery.enabled')
    ) {
      this.inputValues.clear();
    }
  }
}
