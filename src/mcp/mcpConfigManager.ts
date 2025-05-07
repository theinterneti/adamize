/**
 * MCP Configuration Manager
 *
 * This module provides a class for managing MCP server configurations.
 * It supports loading configurations from:
 * - Workspace settings
 * - User settings
 * - Discovered servers
 *
 * @module mcp/mcpConfigManager
 */

import * as vscode from 'vscode';
import { IMCPServerConfig, IMCPInputVariable } from './mcpTypes';

/**
 * MCP Configuration Manager
 *
 * This class manages MCP server configurations from various sources.
 */
export class MCPConfigManager {
  private outputChannel: vscode.OutputChannel;
  private workspaceConfig: vscode.WorkspaceConfiguration;
  private serverConfigs: IMCPServerConfig[] = [];
  private inputVariables: IMCPInputVariable[] = [];
  private inputValues: Map<string, string> = new Map();

  /**
   * Create a new MCP configuration manager
   * @param outputChannel Output channel for logging
   */
  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.workspaceConfig = vscode.workspace.getConfiguration('adamize.mcp');
  }

  /**
   * Initialize the configuration manager
   */
  public async initialize(): Promise<void> {
    try {
      this.outputChannel.appendLine('Initializing MCP configuration manager');

      // Load configurations from all sources
      await this.loadWorkspaceConfigs();
      await this.loadUserConfigs();
      await this.discoverServers();

      // Load input variables
      await this.loadInputVariables();

      this.outputChannel.appendLine(`Loaded ${this.serverConfigs.length} server configurations`);
      this.outputChannel.appendLine(`Loaded ${this.inputVariables.length} input variables`);
    } catch (error) {
      this.outputChannel.appendLine(`Error initializing MCP configuration manager: ${error}`);
    }
  }

  /**
   * Load server configurations from workspace settings
   */
  private async loadWorkspaceConfigs(): Promise<void> {
    try {
      const workspaceServers = this.workspaceConfig.get<IMCPServerConfig[]>('servers') || [];

      // Mark as workspace source
      workspaceServers.forEach(server => {
        server.source = 'workspace';
      });

      this.serverConfigs.push(...workspaceServers);
      this.outputChannel.appendLine(`Loaded ${workspaceServers.length} workspace server configurations`);
    } catch (error) {
      this.outputChannel.appendLine(`Error loading workspace configurations: ${error}`);
    }
  }

  /**
   * Load server configurations from user settings
   */
  private async loadUserConfigs(): Promise<void> {
    try {
      const userConfig = vscode.workspace.getConfiguration('adamize.mcp', null);
      const userServers = userConfig.get<IMCPServerConfig[]>('servers') || [];

      // Mark as user source
      userServers.forEach(server => {
        server.source = 'user';
      });

      this.serverConfigs.push(...userServers);
      this.outputChannel.appendLine(`Loaded ${userServers.length} user server configurations`);
    } catch (error) {
      this.outputChannel.appendLine(`Error loading user configurations: ${error}`);
    }
  }

  /**
   * Discover MCP servers
   */
  private async discoverServers(): Promise<void> {
    try {
      // This is a placeholder for server discovery
      // In a real implementation, this would scan for MCP servers
      // For now, we'll just add a dummy discovered server
      const discoveredServers: IMCPServerConfig[] = [];

      this.serverConfigs.push(...discoveredServers);
      this.outputChannel.appendLine(`Discovered ${discoveredServers.length} server configurations`);
    } catch (error) {
      this.outputChannel.appendLine(`Error discovering servers: ${error}`);
    }
  }

  /**
   * Load input variables
   */
  private async loadInputVariables(): Promise<void> {
    try {
      // Load input variables from workspace settings
      const workspaceVariables = this.workspaceConfig.get<IMCPInputVariable[]>('inputVariables') || [];
      this.inputVariables.push(...workspaceVariables);

      // Load input values
      await this.loadInputValues();

      this.outputChannel.appendLine(`Loaded ${workspaceVariables.length} input variables`);
    } catch (error) {
      this.outputChannel.appendLine(`Error loading input variables: ${error}`);
    }
  }

  /**
   * Load input values
   */
  private async loadInputValues(): Promise<void> {
    try {
      // Load input values from workspace state
      const context = await this.getExtensionContext();
      if (context) {
        const storedValues = context.workspaceState.get<Record<string, string>>('adamize.mcp.inputValues') || {};
        Object.entries(storedValues).forEach(([key, value]) => {
          this.inputValues.set(key, value);
        });
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error loading input values: ${error}`);
    }
  }

  /**
   * Get extension context
   */
  private async getExtensionContext(): Promise<vscode.ExtensionContext | undefined> {
    try {
      // This is a placeholder for getting the extension context
      // In a real implementation, this would be passed to the constructor
      return undefined;
    } catch (error) {
      this.outputChannel.appendLine(`Error getting extension context: ${error}`);
      return undefined;
    }
  }

  /**
   * Get all server configurations
   * @returns Array of server configurations
   */
  public getServerConfigs(): IMCPServerConfig[] {
    return this.serverConfigs;
  }

  /**
   * Get server configuration by name
   * @param name Server name
   * @returns Server configuration or undefined if not found
   */
  public getServerConfig(name: string): IMCPServerConfig | undefined {
    return this.serverConfigs.find(server => server.name === name);
  }

  /**
   * Get all input variables
   * @returns Array of input variables
   */
  public getInputVariables(): IMCPInputVariable[] {
    return this.inputVariables;
  }

  /**
   * Get input variable by ID
   * @param id Input variable ID
   * @returns Input variable or undefined if not found
   */
  public getInputVariable(id: string): IMCPInputVariable | undefined {
    return this.inputVariables.find(variable => variable.id === id);
  }

  /**
   * Get input variable value
   * @param id Input variable ID
   * @returns Input variable value or undefined if not found
   */
  public getInputValue(id: string): string | undefined {
    return this.inputValues.get(id);
  }

  /**
   * Set input variable value
   * @param id Input variable ID
   * @param value Input variable value
   */
  public async setInputValue(id: string, value: string): Promise<void> {
    try {
      this.inputValues.set(id, value);

      // Save to workspace state
      const context = await this.getExtensionContext();
      if (context) {
        const storedValues = context.workspaceState.get<Record<string, string>>('adamize.mcp.inputValues') || {};
        storedValues[id] = value;
        await context.workspaceState.update('adamize.mcp.inputValues', storedValues);
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error setting input value: ${error}`);
    }
  }
}
