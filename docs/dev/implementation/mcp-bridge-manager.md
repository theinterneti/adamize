# MCP Bridge Manager Implementation Plan

This document outlines the implementation plan for the MCP Bridge Manager component, which will manage the MCP Bridge lifecycle and integration with VS Code.

## Overview

The MCP Bridge Manager will manage the MCP Bridge lifecycle, handle extension activation/deactivation, coordinate between bridge components, and expose bridge functionality to VS Code commands.

## Requirements

- **REQ-MANAGER-001**: Handle extension activation/deactivation
- **REQ-MANAGER-002**: Manage bridge initialization and shutdown
- **REQ-MANAGER-003**: Coordinate between bridge components
- **REQ-MANAGER-004**: Expose bridge functionality to VS Code commands
- **REQ-MANAGER-005**: Manage bridge configuration
- **REQ-MANAGER-006**: Support multiple bridge instances
- **REQ-MANAGER-007**: Support bridge status monitoring
- **REQ-MANAGER-008**: Support bridge error handling and recovery
- **REQ-MANAGER-009**: Support bridge logging

## Implementation Details

### Source File

```typescript
// src/mcp/bridge/mcpBridgeManager.ts

import * as vscode from 'vscode';
import { VSCodeLogger } from './vscodeLogger';
import { MCPBridge } from './mcpBridge';
import { MCPBridgeConfigManager, ConfigProfile } from './mcpBridgeConfigManager';
import { BridgeConfig, Tool } from './bridgeTypes';

/**
 * Bridge status
 */
export enum BridgeStatus {
  /**
   * Bridge is not initialized
   */
  NotInitialized = 'not-initialized',
  
  /**
   * Bridge is initializing
   */
  Initializing = 'initializing',
  
  /**
   * Bridge is running
   */
  Running = 'running',
  
  /**
   * Bridge is stopping
   */
  Stopping = 'stopping',
  
  /**
   * Bridge is stopped
   */
  Stopped = 'stopped',
  
  /**
   * Bridge has an error
   */
  Error = 'error'
}

/**
 * Bridge instance
 */
export interface BridgeInstance {
  /**
   * Bridge ID
   */
  id: string;
  
  /**
   * Bridge name
   */
  name: string;
  
  /**
   * Bridge status
   */
  status: BridgeStatus;
  
  /**
   * Bridge instance
   */
  bridge: MCPBridge;
  
  /**
   * Bridge configuration
   */
  config: BridgeConfig;
  
  /**
   * Status bar item
   */
  statusBarItem?: vscode.StatusBarItem;
}

/**
 * MCP Bridge Manager
 * 
 * Manages the MCP Bridge lifecycle and integration with VS Code.
 */
export class MCPBridgeManager {
  private logger: VSCodeLogger;
  private context: vscode.ExtensionContext;
  private configManager: MCPBridgeConfigManager;
  private bridges: Map<string, BridgeInstance> = new Map();
  private activeBridge: string | null = null;
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];
  
  /**
   * Create a new MCP Bridge Manager
   * @param context Extension context
   * @param outputChannel Output channel
   */
  constructor(
    context: vscode.ExtensionContext,
    outputChannel?: vscode.OutputChannel
  ) {
    this.context = context;
    this.outputChannel = outputChannel || vscode.window.createOutputChannel('Adamize MCP Bridge');
    this.logger = new VSCodeLogger('Adamize MCP Bridge Manager');
    this.configManager = new MCPBridgeConfigManager(context, this.logger);
    
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.text = '$(sync) MCP Bridge';
    this.statusBarItem.tooltip = 'MCP Bridge Status';
    this.statusBarItem.command = 'adamize.mcpBridge.showStatus';
    this.disposables.push(this.statusBarItem);
  }
  
  /**
   * Initialize the bridge manager
   * @returns True if initialized successfully
   */
  public async initialize(): Promise<boolean> {
    try {
      this.logger.info('Initializing MCP Bridge Manager');
      
      // Initialize configuration manager
      const configInitialized = await this.configManager.initialize();
      
      if (!configInitialized) {
        this.logger.error('Failed to initialize configuration manager');
        return false;
      }
      
      // Register commands
      this.registerCommands();
      
      // Show status bar item
      this.statusBarItem.show();
      
      this.logger.info('MCP Bridge Manager initialized successfully');
      
      return true;
    } catch (error) {
      this.logger.error(`Error initializing MCP Bridge Manager: ${error}`);
      return false;
    }
  }
  
  /**
   * Register commands
   */
  private registerCommands(): void {
    try {
      // Register commands
      this.disposables.push(
        vscode.commands.registerCommand('adamize.mcpBridge.start', () => this.startBridge()),
        vscode.commands.registerCommand('adamize.mcpBridge.stop', () => this.stopBridge()),
        vscode.commands.registerCommand('adamize.mcpBridge.restart', () => this.restartBridge()),
        vscode.commands.registerCommand('adamize.mcpBridge.showStatus', () => this.showStatus()),
        vscode.commands.registerCommand('adamize.mcpBridge.listTools', () => this.listTools()),
        vscode.commands.registerCommand('adamize.mcpBridge.sendMessage', () => this.sendMessage()),
        vscode.commands.registerCommand('adamize.mcpBridge.manageProfiles', () => this.manageProfiles()),
        vscode.commands.registerCommand('adamize.mcpBridge.createProfile', () => this.createProfile()),
        vscode.commands.registerCommand('adamize.mcpBridge.editProfile', () => this.editProfile()),
        vscode.commands.registerCommand('adamize.mcpBridge.deleteProfile', () => this.deleteProfile()),
        vscode.commands.registerCommand('adamize.mcpBridge.exportProfiles', () => this.exportProfiles()),
        vscode.commands.registerCommand('adamize.mcpBridge.importProfiles', () => this.importProfiles())
      );
      
      this.logger.info('Registered commands');
    } catch (error) {
      this.logger.error(`Error registering commands: ${error}`);
    }
  }
  
  /**
   * Start the bridge
   * @returns True if started successfully
   */
  public async startBridge(): Promise<boolean> {
    try {
      // Check if bridge is already running
      if (this.activeBridge && this.bridges.has(this.activeBridge)) {
        const bridge = this.bridges.get(this.activeBridge)!;
        
        if (bridge.status === BridgeStatus.Running) {
          this.logger.info('Bridge is already running');
          vscode.window.showInformationMessage('MCP Bridge is already running');
          return true;
        }
      }
      
      // Get active profile
      const activeProfile = this.configManager.getActiveProfile();
      
      if (!activeProfile) {
        this.logger.error('No active profile');
        vscode.window.showErrorMessage('No active profile. Please create a profile first.');
        return false;
      }
      
      // Show progress
      return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Starting MCP Bridge',
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: 'Initializing bridge...' });
        
        // Create bridge instance
        const bridgeId = `bridge-${Date.now()}`;
        const bridgeName = activeProfile.name;
        const bridgeConfig = activeProfile.config;
        
        // Create bridge
        const bridge = new MCPBridge(bridgeConfig, this.outputChannel);
        
        // Create bridge instance
        const bridgeInstance: BridgeInstance = {
          id: bridgeId,
          name: bridgeName,
          status: BridgeStatus.Initializing,
          bridge,
          config: bridgeConfig
        };
        
        // Add bridge instance
        this.bridges.set(bridgeId, bridgeInstance);
        
        // Set active bridge
        this.activeBridge = bridgeId;
        
        // Update status bar
        this.updateStatusBar(BridgeStatus.Initializing);
        
        progress.report({ increment: 50, message: 'Initializing bridge...' });
        
        // Initialize bridge
        const initialized = await bridge.initialize();
        
        if (!initialized) {
          this.logger.error('Failed to initialize bridge');
          vscode.window.showErrorMessage('Failed to initialize MCP Bridge');
          
          // Update bridge status
          bridgeInstance.status = BridgeStatus.Error;
          
          // Update status bar
          this.updateStatusBar(BridgeStatus.Error);
          
          return false;
        }
        
        // Update bridge status
        bridgeInstance.status = BridgeStatus.Running;
        
        // Update status bar
        this.updateStatusBar(BridgeStatus.Running);
        
        progress.report({ increment: 100, message: 'Bridge started' });
        
        this.logger.info('Bridge started successfully');
        vscode.window.showInformationMessage('MCP Bridge started successfully');
        
        return true;
      });
    } catch (error) {
      this.logger.error(`Error starting bridge: ${error}`);
      vscode.window.showErrorMessage(`Error starting MCP Bridge: ${error}`);
      
      // Update status bar
      this.updateStatusBar(BridgeStatus.Error);
      
      return false;
    }
  }
  
  /**
   * Stop the bridge
   * @returns True if stopped successfully
   */
  public async stopBridge(): Promise<boolean> {
    try {
      // Check if bridge is running
      if (!this.activeBridge || !this.bridges.has(this.activeBridge)) {
        this.logger.info('No active bridge to stop');
        vscode.window.showInformationMessage('No active MCP Bridge to stop');
        return true;
      }
      
      const bridge = this.bridges.get(this.activeBridge)!;
      
      if (bridge.status !== BridgeStatus.Running) {
        this.logger.info('Bridge is not running');
        vscode.window.showInformationMessage('MCP Bridge is not running');
        return true;
      }
      
      // Show progress
      return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Stopping MCP Bridge',
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: 'Stopping bridge...' });
        
        // Update bridge status
        bridge.status = BridgeStatus.Stopping;
        
        // Update status bar
        this.updateStatusBar(BridgeStatus.Stopping);
        
        // Close bridge
        await bridge.bridge.close();
        
        // Update bridge status
        bridge.status = BridgeStatus.Stopped;
        
        // Update status bar
        this.updateStatusBar(BridgeStatus.Stopped);
        
        progress.report({ increment: 100, message: 'Bridge stopped' });
        
        this.logger.info('Bridge stopped successfully');
        vscode.window.showInformationMessage('MCP Bridge stopped successfully');
        
        return true;
      });
    } catch (error) {
      this.logger.error(`Error stopping bridge: ${error}`);
      vscode.window.showErrorMessage(`Error stopping MCP Bridge: ${error}`);
      
      // Update status bar
      this.updateStatusBar(BridgeStatus.Error);
      
      return false;
    }
  }
  
  /**
   * Restart the bridge
   * @returns True if restarted successfully
   */
  public async restartBridge(): Promise<boolean> {
    try {
      // Stop bridge
      const stopped = await this.stopBridge();
      
      if (!stopped) {
        return false;
      }
      
      // Start bridge
      return await this.startBridge();
    } catch (error) {
      this.logger.error(`Error restarting bridge: ${error}`);
      vscode.window.showErrorMessage(`Error restarting MCP Bridge: ${error}`);
      return false;
    }
  }
  
  /**
   * Show bridge status
   */
  public async showStatus(): Promise<void> {
    try {
      // Check if bridge is running
      if (!this.activeBridge || !this.bridges.has(this.activeBridge)) {
        vscode.window.showInformationMessage('No active MCP Bridge');
        return;
      }
      
      const bridge = this.bridges.get(this.activeBridge)!;
      
      // Show status
      vscode.window.showInformationMessage(`MCP Bridge: ${bridge.name} (${bridge.status})`);
    } catch (error) {
      this.logger.error(`Error showing status: ${error}`);
      vscode.window.showErrorMessage(`Error showing MCP Bridge status: ${error}`);
    }
  }
  
  /**
   * List tools
   */
  public async listTools(): Promise<void> {
    try {
      // Check if bridge is running
      if (!this.activeBridge || !this.bridges.has(this.activeBridge)) {
        vscode.window.showErrorMessage('No active MCP Bridge. Please start the bridge first.');
        return;
      }
      
      const bridge = this.bridges.get(this.activeBridge)!;
      
      if (bridge.status !== BridgeStatus.Running) {
        vscode.window.showErrorMessage('MCP Bridge is not running. Please start the bridge first.');
        return;
      }
      
      // Get tools
      const tools = bridge.bridge.getTools();
      
      if (tools.length === 0) {
        vscode.window.showInformationMessage('No tools available');
        return;
      }
      
      // Show tools
      const toolItems = tools.map(tool => ({
        label: tool.name,
        description: tool.description,
        detail: `MCP Server: ${tool.mcpServer || 'unknown'}`
      }));
      
      const selectedTool = await vscode.window.showQuickPick(toolItems, {
        placeHolder: 'Select a tool to view details'
      });
      
      if (!selectedTool) {
        return;
      }
      
      // Show tool details
      const tool = tools.find(t => t.name === selectedTool.label);
      
      if (!tool) {
        return;
      }
      
      // Create document with tool details
      const content = JSON.stringify(tool, null, 2);
      const document = await vscode.workspace.openTextDocument({
        content,
        language: 'json'
      });
      
      await vscode.window.showTextDocument(document);
    } catch (error) {
      this.logger.error(`Error listing tools: ${error}`);
      vscode.window.showErrorMessage(`Error listing MCP Bridge tools: ${error}`);
    }
  }
  
  /**
   * Send a message to the bridge
   */
  public async sendMessage(): Promise<void> {
    try {
      // Check if bridge is running
      if (!this.activeBridge || !this.bridges.has(this.activeBridge)) {
        vscode.window.showErrorMessage('No active MCP Bridge. Please start the bridge first.');
        return;
      }
      
      const bridge = this.bridges.get(this.activeBridge)!;
      
      if (bridge.status !== BridgeStatus.Running) {
        vscode.window.showErrorMessage('MCP Bridge is not running. Please start the bridge first.');
        return;
      }
      
      // Get message
      const message = await vscode.window.showInputBox({
        prompt: 'Enter a message to send to the MCP Bridge',
        placeHolder: 'Message'
      });
      
      if (!message) {
        return;
      }
      
      // Send message
      const response = await bridge.bridge.processMessage(message);
      
      // Show response
      const document = await vscode.workspace.openTextDocument({
        content: response,
        language: 'markdown'
      });
      
      await vscode.window.showTextDocument(document);
    } catch (error) {
      this.logger.error(`Error sending message: ${error}`);
      vscode.window.showErrorMessage(`Error sending message to MCP Bridge: ${error}`);
    }
  }
  
  /**
   * Manage profiles
   */
  public async manageProfiles(): Promise<void> {
    try {
      // Get profiles
      const profiles = this.configManager.getProfiles();
      const activeProfile = this.configManager.getActiveProfile();
      
      if (profiles.size === 0) {
        vscode.window.showInformationMessage('No profiles available. Please create a profile first.');
        return;
      }
      
      // Show profiles
      const profileItems = Array.from(profiles.values()).map(profile => ({
        label: profile.name,
        description: profile.description || '',
        detail: activeProfile && profile.name === activeProfile.name ? 'Active' : undefined
      }));
      
      const selectedProfile = await vscode.window.showQuickPick(profileItems, {
        placeHolder: 'Select a profile to manage'
      });
      
      if (!selectedProfile) {
        return;
      }
      
      // Show profile actions
      const actions = [
        { label: 'Set as Active', action: 'activate' },
        { label: 'Edit', action: 'edit' },
        { label: 'Delete', action: 'delete' }
      ];
      
      const selectedAction = await vscode.window.showQuickPick(actions, {
        placeHolder: `Select an action for profile ${selectedProfile.label}`
      });
      
      if (!selectedAction) {
        return;
      }
      
      // Perform action
      switch (selectedAction.action) {
        case 'activate':
          await this.configManager.setActiveProfile(selectedProfile.label);
          vscode.window.showInformationMessage(`Profile ${selectedProfile.label} set as active`);
          break;
        case 'edit':
          await this.editProfile(selectedProfile.label);
          break;
        case 'delete':
          await this.deleteProfile(selectedProfile.label);
          break;
      }
    } catch (error) {
      this.logger.error(`Error managing profiles: ${error}`);
      vscode.window.showErrorMessage(`Error managing profiles: ${error}`);
    }
  }
  
  /**
   * Create a profile
   */
  public async createProfile(): Promise<void> {
    // TODO: Implement profile creation UI
  }
  
  /**
   * Edit a profile
   * @param profileName Profile name
   */
  public async editProfile(profileName?: string): Promise<void> {
    // TODO: Implement profile editing UI
  }
  
  /**
   * Delete a profile
   * @param profileName Profile name
   */
  public async deleteProfile(profileName?: string): Promise<void> {
    // TODO: Implement profile deletion UI
  }
  
  /**
   * Export profiles
   */
  public async exportProfiles(): Promise<void> {
    // TODO: Implement profile export UI
  }
  
  /**
   * Import profiles
   */
  public async importProfiles(): Promise<void> {
    // TODO: Implement profile import UI
  }
  
  /**
   * Update status bar
   * @param status Bridge status
   */
  private updateStatusBar(status: BridgeStatus): void {
    try {
      switch (status) {
        case BridgeStatus.NotInitialized:
          this.statusBarItem.text = '$(sync) MCP Bridge: Not Initialized';
          this.statusBarItem.tooltip = 'MCP Bridge is not initialized';
          break;
        case BridgeStatus.Initializing:
          this.statusBarItem.text = '$(sync~spin) MCP Bridge: Initializing';
          this.statusBarItem.tooltip = 'MCP Bridge is initializing';
          break;
        case BridgeStatus.Running:
          this.statusBarItem.text = '$(check) MCP Bridge: Running';
          this.statusBarItem.tooltip = 'MCP Bridge is running';
          break;
        case BridgeStatus.Stopping:
          this.statusBarItem.text = '$(sync~spin) MCP Bridge: Stopping';
          this.statusBarItem.tooltip = 'MCP Bridge is stopping';
          break;
        case BridgeStatus.Stopped:
          this.statusBarItem.text = '$(stop) MCP Bridge: Stopped';
          this.statusBarItem.tooltip = 'MCP Bridge is stopped';
          break;
        case BridgeStatus.Error:
          this.statusBarItem.text = '$(error) MCP Bridge: Error';
          this.statusBarItem.tooltip = 'MCP Bridge has an error';
          break;
      }
    } catch (error) {
      this.logger.error(`Error updating status bar: ${error}`);
    }
  }
  
  /**
   * Dispose of resources
   */
  public dispose(): void {
    try {
      this.logger.info('Disposing MCP Bridge Manager');
      
      // Stop all bridges
      this.bridges.forEach(bridge => {
        if (bridge.status === BridgeStatus.Running) {
          bridge.bridge.close().catch(error => {
            this.logger.error(`Error closing bridge: ${error}`);
          });
        }
      });
      
      // Dispose of status bar item
      this.statusBarItem.dispose();
      
      // Dispose of disposables
      this.disposables.forEach(disposable => {
        disposable.dispose();
      });
      
      // Dispose of output channel
      this.outputChannel.dispose();
      
      this.logger.info('MCP Bridge Manager disposed');
    } catch (error) {
      this.logger.error(`Error disposing MCP Bridge Manager: ${error}`);
    }
  }
}
```

## Test Plan

We will create tests for the MCP Bridge Manager to ensure it meets the requirements:

1. **TEST-MANAGER-001**: Test that the manager can initialize successfully
2. **TEST-MANAGER-002**: Test that the manager can start a bridge
3. **TEST-MANAGER-003**: Test that the manager can stop a bridge
4. **TEST-MANAGER-004**: Test that the manager can restart a bridge
5. **TEST-MANAGER-005**: Test that the manager can show bridge status
6. **TEST-MANAGER-006**: Test that the manager can list tools
7. **TEST-MANAGER-007**: Test that the manager can send messages to the bridge
8. **TEST-MANAGER-008**: Test that the manager can manage profiles
9. **TEST-MANAGER-009**: Test that the manager can handle errors gracefully
10. **TEST-MANAGER-010**: Test that the manager integrates with VS Code's UI

## Integration Plan

The MCP Bridge Manager will be used by the extension:

1. Update the extension to use the new MCP Bridge Manager
2. Add commands for interacting with the bridge
3. Add UI for bridge status and control
4. Add configuration options for the bridge

## Next Steps

After implementing the MCP Bridge Manager, we will move on to implementing the MCP Bridge Commands component.
