# MCP Bridge Commands Implementation Plan

This document outlines the implementation plan for the MCP Bridge Commands component, which will define VS Code commands for interacting with the MCP Bridge.

## Overview

The MCP Bridge Commands component will define VS Code commands for starting/stopping the bridge, interacting with the LLM, managing tools, and configuration management.

## Requirements

- **REQ-COMMANDS-001**: Define commands for starting/stopping the bridge
- **REQ-COMMANDS-002**: Define commands for interacting with the LLM
- **REQ-COMMANDS-003**: Define commands for managing tools
- **REQ-COMMANDS-004**: Define commands for configuration management
- **REQ-COMMANDS-005**: Integrate with VS Code's command system
- **REQ-COMMANDS-006**: Support command arguments
- **REQ-COMMANDS-007**: Support command error handling
- **REQ-COMMANDS-008**: Support command progress reporting

## Implementation Details

### Source File

```typescript
// src/mcp/bridge/mcpBridgeCommands.ts

import * as vscode from 'vscode';
import { VSCodeLogger } from './vscodeLogger';
import { MCPBridgeManager } from './mcpBridgeManager';

/**
 * MCP Bridge Commands
 * 
 * Defines VS Code commands for interacting with the MCP Bridge.
 */
export class MCPBridgeCommands {
  private logger: VSCodeLogger;
  private bridgeManager: MCPBridgeManager;
  private context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];
  
  /**
   * Create a new MCP Bridge Commands
   * @param context Extension context
   * @param bridgeManager Bridge manager
   * @param logger Logger instance
   */
  constructor(
    context: vscode.ExtensionContext,
    bridgeManager: MCPBridgeManager,
    logger?: VSCodeLogger
  ) {
    this.context = context;
    this.bridgeManager = bridgeManager;
    this.logger = logger || new VSCodeLogger('Adamize MCP Bridge Commands');
  }
  
  /**
   * Register commands
   */
  public registerCommands(): void {
    try {
      this.logger.info('Registering MCP Bridge commands');
      
      // Register bridge commands
      this.registerBridgeCommands();
      
      // Register LLM commands
      this.registerLLMCommands();
      
      // Register tool commands
      this.registerToolCommands();
      
      // Register configuration commands
      this.registerConfigCommands();
      
      this.logger.info('MCP Bridge commands registered');
    } catch (error) {
      this.logger.error(`Error registering MCP Bridge commands: ${error}`);
    }
  }
  
  /**
   * Register bridge commands
   */
  private registerBridgeCommands(): void {
    try {
      // Register bridge commands
      this.disposables.push(
        vscode.commands.registerCommand('adamize.mcpBridge.start', () => this.startBridge()),
        vscode.commands.registerCommand('adamize.mcpBridge.stop', () => this.stopBridge()),
        vscode.commands.registerCommand('adamize.mcpBridge.restart', () => this.restartBridge()),
        vscode.commands.registerCommand('adamize.mcpBridge.showStatus', () => this.showStatus())
      );
      
      this.logger.info('Bridge commands registered');
    } catch (error) {
      this.logger.error(`Error registering bridge commands: ${error}`);
    }
  }
  
  /**
   * Register LLM commands
   */
  private registerLLMCommands(): void {
    try {
      // Register LLM commands
      this.disposables.push(
        vscode.commands.registerCommand('adamize.mcpBridge.sendMessage', () => this.sendMessage()),
        vscode.commands.registerCommand('adamize.mcpBridge.clearConversation', () => this.clearConversation()),
        vscode.commands.registerCommand('adamize.mcpBridge.showConversation', () => this.showConversation()),
        vscode.commands.registerCommand('adamize.mcpBridge.setSystemPrompt', () => this.setSystemPrompt())
      );
      
      this.logger.info('LLM commands registered');
    } catch (error) {
      this.logger.error(`Error registering LLM commands: ${error}`);
    }
  }
  
  /**
   * Register tool commands
   */
  private registerToolCommands(): void {
    try {
      // Register tool commands
      this.disposables.push(
        vscode.commands.registerCommand('adamize.mcpBridge.listTools', () => this.listTools()),
        vscode.commands.registerCommand('adamize.mcpBridge.callTool', (toolName, args) => this.callTool(toolName, args)),
        vscode.commands.registerCommand('adamize.mcpBridge.showToolDetails', (toolName) => this.showToolDetails(toolName))
      );
      
      this.logger.info('Tool commands registered');
    } catch (error) {
      this.logger.error(`Error registering tool commands: ${error}`);
    }
  }
  
  /**
   * Register configuration commands
   */
  private registerConfigCommands(): void {
    try {
      // Register configuration commands
      this.disposables.push(
        vscode.commands.registerCommand('adamize.mcpBridge.manageProfiles', () => this.manageProfiles()),
        vscode.commands.registerCommand('adamize.mcpBridge.createProfile', () => this.createProfile()),
        vscode.commands.registerCommand('adamize.mcpBridge.editProfile', (profileName) => this.editProfile(profileName)),
        vscode.commands.registerCommand('adamize.mcpBridge.deleteProfile', (profileName) => this.deleteProfile(profileName)),
        vscode.commands.registerCommand('adamize.mcpBridge.exportProfiles', () => this.exportProfiles()),
        vscode.commands.registerCommand('adamize.mcpBridge.importProfiles', () => this.importProfiles())
      );
      
      this.logger.info('Configuration commands registered');
    } catch (error) {
      this.logger.error(`Error registering configuration commands: ${error}`);
    }
  }
  
  /**
   * Start the bridge
   * @returns True if started successfully
   */
  private async startBridge(): Promise<boolean> {
    try {
      return await this.bridgeManager.startBridge();
    } catch (error) {
      this.logger.error(`Error starting bridge: ${error}`);
      vscode.window.showErrorMessage(`Error starting MCP Bridge: ${error}`);
      return false;
    }
  }
  
  /**
   * Stop the bridge
   * @returns True if stopped successfully
   */
  private async stopBridge(): Promise<boolean> {
    try {
      return await this.bridgeManager.stopBridge();
    } catch (error) {
      this.logger.error(`Error stopping bridge: ${error}`);
      vscode.window.showErrorMessage(`Error stopping MCP Bridge: ${error}`);
      return false;
    }
  }
  
  /**
   * Restart the bridge
   * @returns True if restarted successfully
   */
  private async restartBridge(): Promise<boolean> {
    try {
      return await this.bridgeManager.restartBridge();
    } catch (error) {
      this.logger.error(`Error restarting bridge: ${error}`);
      vscode.window.showErrorMessage(`Error restarting MCP Bridge: ${error}`);
      return false;
    }
  }
  
  /**
   * Show bridge status
   */
  private async showStatus(): Promise<void> {
    try {
      await this.bridgeManager.showStatus();
    } catch (error) {
      this.logger.error(`Error showing status: ${error}`);
      vscode.window.showErrorMessage(`Error showing MCP Bridge status: ${error}`);
    }
  }
  
  /**
   * Send a message to the bridge
   */
  private async sendMessage(): Promise<void> {
    try {
      await this.bridgeManager.sendMessage();
    } catch (error) {
      this.logger.error(`Error sending message: ${error}`);
      vscode.window.showErrorMessage(`Error sending message to MCP Bridge: ${error}`);
    }
  }
  
  /**
   * Clear conversation history
   */
  private async clearConversation(): Promise<void> {
    // TODO: Implement clear conversation
  }
  
  /**
   * Show conversation history
   */
  private async showConversation(): Promise<void> {
    // TODO: Implement show conversation
  }
  
  /**
   * Set system prompt
   */
  private async setSystemPrompt(): Promise<void> {
    // TODO: Implement set system prompt
  }
  
  /**
   * List tools
   */
  private async listTools(): Promise<void> {
    try {
      await this.bridgeManager.listTools();
    } catch (error) {
      this.logger.error(`Error listing tools: ${error}`);
      vscode.window.showErrorMessage(`Error listing MCP Bridge tools: ${error}`);
    }
  }
  
  /**
   * Call a tool
   * @param toolName Tool name
   * @param args Tool arguments
   */
  private async callTool(toolName: string, args: any): Promise<void> {
    // TODO: Implement call tool
  }
  
  /**
   * Show tool details
   * @param toolName Tool name
   */
  private async showToolDetails(toolName: string): Promise<void> {
    // TODO: Implement show tool details
  }
  
  /**
   * Manage profiles
   */
  private async manageProfiles(): Promise<void> {
    try {
      await this.bridgeManager.manageProfiles();
    } catch (error) {
      this.logger.error(`Error managing profiles: ${error}`);
      vscode.window.showErrorMessage(`Error managing profiles: ${error}`);
    }
  }
  
  /**
   * Create a profile
   */
  private async createProfile(): Promise<void> {
    try {
      await this.bridgeManager.createProfile();
    } catch (error) {
      this.logger.error(`Error creating profile: ${error}`);
      vscode.window.showErrorMessage(`Error creating profile: ${error}`);
    }
  }
  
  /**
   * Edit a profile
   * @param profileName Profile name
   */
  private async editProfile(profileName?: string): Promise<void> {
    try {
      await this.bridgeManager.editProfile(profileName);
    } catch (error) {
      this.logger.error(`Error editing profile: ${error}`);
      vscode.window.showErrorMessage(`Error editing profile: ${error}`);
    }
  }
  
  /**
   * Delete a profile
   * @param profileName Profile name
   */
  private async deleteProfile(profileName?: string): Promise<void> {
    try {
      await this.bridgeManager.deleteProfile(profileName);
    } catch (error) {
      this.logger.error(`Error deleting profile: ${error}`);
      vscode.window.showErrorMessage(`Error deleting profile: ${error}`);
    }
  }
  
  /**
   * Export profiles
   */
  private async exportProfiles(): Promise<void> {
    try {
      await this.bridgeManager.exportProfiles();
    } catch (error) {
      this.logger.error(`Error exporting profiles: ${error}`);
      vscode.window.showErrorMessage(`Error exporting profiles: ${error}`);
    }
  }
  
  /**
   * Import profiles
   */
  private async importProfiles(): Promise<void> {
    try {
      await this.bridgeManager.importProfiles();
    } catch (error) {
      this.logger.error(`Error importing profiles: ${error}`);
      vscode.window.showErrorMessage(`Error importing profiles: ${error}`);
    }
  }
  
  /**
   * Dispose of resources
   */
  public dispose(): void {
    try {
      this.logger.info('Disposing MCP Bridge Commands');
      
      // Dispose of disposables
      this.disposables.forEach(disposable => {
        disposable.dispose();
      });
      
      this.logger.info('MCP Bridge Commands disposed');
    } catch (error) {
      this.logger.error(`Error disposing MCP Bridge Commands: ${error}`);
    }
  }
}
```

## Test Plan

We will create tests for the MCP Bridge Commands to ensure they meet the requirements:

1. **TEST-COMMANDS-001**: Test that the commands can be registered successfully
2. **TEST-COMMANDS-002**: Test that the bridge commands work correctly
3. **TEST-COMMANDS-003**: Test that the LLM commands work correctly
4. **TEST-COMMANDS-004**: Test that the tool commands work correctly
5. **TEST-COMMANDS-005**: Test that the configuration commands work correctly
6. **TEST-COMMANDS-006**: Test that the commands handle errors gracefully
7. **TEST-COMMANDS-007**: Test that the commands integrate with VS Code's command system
8. **TEST-COMMANDS-008**: Test that the commands support progress reporting

## Integration Plan

The MCP Bridge Commands will be used by the extension:

1. Update the extension to use the new MCP Bridge Commands
2. Add command palette entries for the commands
3. Add keybindings for the commands
4. Add context menu entries for the commands

## Next Steps

After implementing the MCP Bridge Commands, we will move on to updating the extension to use the new MCP Bridge components.
