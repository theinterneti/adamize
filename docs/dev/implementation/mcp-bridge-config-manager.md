# MCP Bridge Config Manager Implementation Plan

This document outlines the implementation plan for the MCP Bridge Config Manager component, which will manage the configuration for the MCP Bridge in the VS Code extension.

## Overview

The MCP Bridge Config Manager will adapt the configuration management from the ollama-mcp-bridge to work within the VS Code extension context. It will use VS Code's configuration API instead of file-based configuration, add UI for configuration management, and support multiple configuration profiles.

## Requirements

- **REQ-CONFIG-001**: Use VS Code's configuration API instead of file-based config
- **REQ-CONFIG-002**: Add UI for configuration management
- **REQ-CONFIG-003**: Add validation for configuration
- **REQ-CONFIG-004**: Support multiple configuration profiles
- **REQ-CONFIG-005**: Support environment-specific configuration
- **REQ-CONFIG-006**: Support default configuration
- **REQ-CONFIG-007**: Support configuration migration
- **REQ-CONFIG-008**: Support configuration export/import

## Implementation Details

### Source File

```typescript
// src/mcp/bridge/mcpBridgeConfigManager.ts

import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { VSCodeLogger } from './vscodeLogger';
import { 
  BridgeConfig, 
  ServerParameters, 
  LLMConfig,
  ConnectionMethod
} from './bridgeTypes';

/**
 * Configuration profile
 */
export interface ConfigProfile {
  /**
   * Profile name
   */
  name: string;
  
  /**
   * Profile description
   */
  description?: string;
  
  /**
   * Bridge configuration
   */
  config: BridgeConfig;
}

/**
 * MCP Bridge Config Manager
 * 
 * Manages configuration for the MCP Bridge.
 */
export class MCPBridgeConfigManager {
  private logger: VSCodeLogger;
  private context: vscode.ExtensionContext;
  private profiles: Map<string, ConfigProfile> = new Map();
  private activeProfile: string | null = null;
  
  /**
   * Create a new MCP Bridge Config Manager
   * @param context Extension context
   * @param logger Logger instance
   */
  constructor(
    context: vscode.ExtensionContext,
    logger?: VSCodeLogger
  ) {
    this.context = context;
    this.logger = logger || new VSCodeLogger('Adamize MCP Bridge Config Manager');
  }
  
  /**
   * Initialize the config manager
   * @returns True if initialized successfully
   */
  public async initialize(): Promise<boolean> {
    try {
      this.logger.info('Initializing MCP Bridge Config Manager');
      
      // Load profiles from storage
      await this.loadProfiles();
      
      // Create default profile if no profiles exist
      if (this.profiles.size === 0) {
        this.logger.info('No profiles found, creating default profile');
        await this.createDefaultProfile();
      }
      
      // Set active profile
      const activeProfile = this.context.globalState.get<string>('adamize.mcpBridge.activeProfile');
      
      if (activeProfile && this.profiles.has(activeProfile)) {
        this.activeProfile = activeProfile;
      } else {
        // Set first profile as active
        this.activeProfile = Array.from(this.profiles.keys())[0];
        await this.context.globalState.update('adamize.mcpBridge.activeProfile', this.activeProfile);
      }
      
      this.logger.info(`Active profile: ${this.activeProfile}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error initializing MCP Bridge Config Manager: ${error}`);
      return false;
    }
  }
  
  /**
   * Load profiles from storage
   */
  private async loadProfiles(): Promise<void> {
    try {
      const profiles = this.context.globalState.get<Record<string, ConfigProfile>>('adamize.mcpBridge.profiles');
      
      if (profiles) {
        Object.values(profiles).forEach(profile => {
          this.profiles.set(profile.name, profile);
        });
        
        this.logger.info(`Loaded ${this.profiles.size} profiles`);
      }
    } catch (error) {
      this.logger.error(`Error loading profiles: ${error}`);
    }
  }
  
  /**
   * Save profiles to storage
   */
  private async saveProfiles(): Promise<void> {
    try {
      const profiles: Record<string, ConfigProfile> = {};
      
      this.profiles.forEach(profile => {
        profiles[profile.name] = profile;
      });
      
      await this.context.globalState.update('adamize.mcpBridge.profiles', profiles);
      
      this.logger.info(`Saved ${this.profiles.size} profiles`);
    } catch (error) {
      this.logger.error(`Error saving profiles: ${error}`);
    }
  }
  
  /**
   * Create default profile
   */
  private async createDefaultProfile(): Promise<void> {
    try {
      // Create default configuration
      const defaultConfig = this.createDefaultConfig();
      
      // Create default profile
      const defaultProfile: ConfigProfile = {
        name: 'default',
        description: 'Default configuration',
        config: defaultConfig
      };
      
      // Add profile
      this.profiles.set('default', defaultProfile);
      
      // Save profiles
      await this.saveProfiles();
      
      this.logger.info('Created default profile');
    } catch (error) {
      this.logger.error(`Error creating default profile: ${error}`);
    }
  }
  
  /**
   * Create default configuration
   * @returns Default configuration
   */
  private createDefaultConfig(): BridgeConfig {
    // Determine platform-specific paths
    const isWindows = process.platform === 'win32';
    const nodePath = isWindows ? 'C:\\Program Files\\nodejs\\node.exe' : '/usr/bin/node';
    const homeDir = os.homedir();
    const workspaceDir = path.join(homeDir, 'adamize-workspace');
    
    // Create filesystem MCP server configuration
    const filesystemServer: ServerParameters = {
      command: nodePath,
      args: [
        path.join(homeDir, 'node_modules', '@modelcontextprotocol', 'server-filesystem', 'dist', 'index.js'),
        workspaceDir
      ],
      allowedDirectory: workspaceDir,
      connectionMethod: ConnectionMethod.LocalProcess
    };
    
    // Create LLM configuration
    const llmConfig: LLMConfig = {
      model: 'qwen2.5-coder:7b-instruct',
      baseUrl: 'http://localhost:11434',
      apiKey: 'ollama',
      temperature: 0.7,
      maxTokens: 1000,
      connectionMethod: ConnectionMethod.HTTP
    };
    
    // Create bridge configuration
    const bridgeConfig: BridgeConfig = {
      mcpServer: filesystemServer,
      mcpServerName: 'filesystem',
      mcpServers: {
        filesystem: filesystemServer
      },
      llmConfig,
      systemPrompt: 'You are a helpful assistant that can use tools to help answer questions.'
    };
    
    return bridgeConfig;
  }
  
  /**
   * Get active profile
   * @returns Active profile or null if no active profile
   */
  public getActiveProfile(): ConfigProfile | null {
    if (!this.activeProfile) {
      return null;
    }
    
    return this.profiles.get(this.activeProfile) || null;
  }
  
  /**
   * Get active configuration
   * @returns Active configuration or null if no active profile
   */
  public getActiveConfig(): BridgeConfig | null {
    const profile = this.getActiveProfile();
    
    if (!profile) {
      return null;
    }
    
    return profile.config;
  }
  
  /**
   * Set active profile
   * @param profileName Profile name
   * @returns True if profile was set as active
   */
  public async setActiveProfile(profileName: string): Promise<boolean> {
    try {
      if (!this.profiles.has(profileName)) {
        this.logger.error(`Profile ${profileName} not found`);
        return false;
      }
      
      this.activeProfile = profileName;
      await this.context.globalState.update('adamize.mcpBridge.activeProfile', profileName);
      
      this.logger.info(`Set active profile: ${profileName}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error setting active profile: ${error}`);
      return false;
    }
  }
  
  /**
   * Get all profiles
   * @returns Map of profile names to profiles
   */
  public getProfiles(): Map<string, ConfigProfile> {
    return this.profiles;
  }
  
  /**
   * Get profile by name
   * @param profileName Profile name
   * @returns Profile or undefined if not found
   */
  public getProfile(profileName: string): ConfigProfile | undefined {
    return this.profiles.get(profileName);
  }
  
  /**
   * Create a new profile
   * @param profile Profile to create
   * @returns True if profile was created
   */
  public async createProfile(profile: ConfigProfile): Promise<boolean> {
    try {
      // Check if profile already exists
      if (this.profiles.has(profile.name)) {
        this.logger.error(`Profile ${profile.name} already exists`);
        return false;
      }
      
      // Validate profile
      if (!this.validateProfile(profile)) {
        this.logger.error(`Invalid profile: ${profile.name}`);
        return false;
      }
      
      // Add profile
      this.profiles.set(profile.name, profile);
      
      // Save profiles
      await this.saveProfiles();
      
      this.logger.info(`Created profile: ${profile.name}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error creating profile: ${error}`);
      return false;
    }
  }
  
  /**
   * Update a profile
   * @param profileName Profile name
   * @param profile Updated profile
   * @returns True if profile was updated
   */
  public async updateProfile(profileName: string, profile: ConfigProfile): Promise<boolean> {
    try {
      // Check if profile exists
      if (!this.profiles.has(profileName)) {
        this.logger.error(`Profile ${profileName} not found`);
        return false;
      }
      
      // Validate profile
      if (!this.validateProfile(profile)) {
        this.logger.error(`Invalid profile: ${profile.name}`);
        return false;
      }
      
      // Update profile
      this.profiles.set(profileName, profile);
      
      // Save profiles
      await this.saveProfiles();
      
      this.logger.info(`Updated profile: ${profileName}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error updating profile: ${error}`);
      return false;
    }
  }
  
  /**
   * Delete a profile
   * @param profileName Profile name
   * @returns True if profile was deleted
   */
  public async deleteProfile(profileName: string): Promise<boolean> {
    try {
      // Check if profile exists
      if (!this.profiles.has(profileName)) {
        this.logger.error(`Profile ${profileName} not found`);
        return false;
      }
      
      // Check if profile is active
      if (this.activeProfile === profileName) {
        this.logger.error(`Cannot delete active profile: ${profileName}`);
        return false;
      }
      
      // Delete profile
      this.profiles.delete(profileName);
      
      // Save profiles
      await this.saveProfiles();
      
      this.logger.info(`Deleted profile: ${profileName}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error deleting profile: ${error}`);
      return false;
    }
  }
  
  /**
   * Validate a profile
   * @param profile Profile to validate
   * @returns True if profile is valid
   */
  private validateProfile(profile: ConfigProfile): boolean {
    try {
      // Check if profile has a name
      if (!profile.name) {
        this.logger.error('Profile must have a name');
        return false;
      }
      
      // Check if profile has a configuration
      if (!profile.config) {
        this.logger.error('Profile must have a configuration');
        return false;
      }
      
      // Check if configuration has required fields
      const config = profile.config;
      
      if (!config.mcpServer) {
        this.logger.error('Configuration must have an MCP server');
        return false;
      }
      
      if (!config.mcpServerName) {
        this.logger.error('Configuration must have an MCP server name');
        return false;
      }
      
      if (!config.llmConfig) {
        this.logger.error('Configuration must have an LLM configuration');
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error validating profile: ${error}`);
      return false;
    }
  }
  
  /**
   * Export profiles to a file
   * @param filePath File path
   * @returns True if profiles were exported
   */
  public async exportProfiles(filePath: string): Promise<boolean> {
    try {
      // Create profiles object
      const profiles: Record<string, ConfigProfile> = {};
      
      this.profiles.forEach(profile => {
        profiles[profile.name] = profile;
      });
      
      // Write to file
      const fs = require('fs');
      fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2));
      
      this.logger.info(`Exported ${this.profiles.size} profiles to ${filePath}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error exporting profiles: ${error}`);
      return false;
    }
  }
  
  /**
   * Import profiles from a file
   * @param filePath File path
   * @returns True if profiles were imported
   */
  public async importProfiles(filePath: string): Promise<boolean> {
    try {
      // Read from file
      const fs = require('fs');
      const profiles = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Validate profiles
      let validProfiles = 0;
      
      for (const profile of Object.values(profiles) as ConfigProfile[]) {
        if (this.validateProfile(profile)) {
          this.profiles.set(profile.name, profile);
          validProfiles++;
        }
      }
      
      // Save profiles
      await this.saveProfiles();
      
      this.logger.info(`Imported ${validProfiles} profiles from ${filePath}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error importing profiles: ${error}`);
      return false;
    }
  }
}
```

## Test Plan

We will create tests for the MCP Bridge Config Manager to ensure it meets the requirements:

1. **TEST-CONFIG-001**: Test that the config manager can initialize successfully
2. **TEST-CONFIG-002**: Test that the config manager can create a default profile
3. **TEST-CONFIG-003**: Test that the config manager can get the active profile
4. **TEST-CONFIG-004**: Test that the config manager can set the active profile
5. **TEST-CONFIG-005**: Test that the config manager can create a new profile
6. **TEST-CONFIG-006**: Test that the config manager can update a profile
7. **TEST-CONFIG-007**: Test that the config manager can delete a profile
8. **TEST-CONFIG-008**: Test that the config manager can validate a profile
9. **TEST-CONFIG-009**: Test that the config manager can export profiles
10. **TEST-CONFIG-010**: Test that the config manager can import profiles

## Integration Plan

The MCP Bridge Config Manager will be used by the MCP Bridge Manager component:

1. Update the MCP Bridge Manager to use the new MCP Bridge Config Manager
2. Add UI for managing profiles
3. Add commands for managing profiles
4. Add configuration options for profiles

## Next Steps

After implementing the MCP Bridge Config Manager, we will move on to implementing the MCP Bridge Manager component.
