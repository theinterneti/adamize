/**
 * Preset Manager
 * 
 * This module provides utilities for managing model configuration presets.
 * It handles loading, saving, and sharing presets.
 * 
 * @module utils/presetManager
 * @requires vscode
 * 
 * @implements REQ-MODEL-040 Create a ModelConfigurationPreset interface with fields for model name, parameters, and metadata
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Model configuration preset interface
 * 
 * @interface IModelConfigurationPreset
 * @implements REQ-MODEL-040 Create a ModelConfigurationPreset interface with fields for model name, parameters, and metadata
 */
export interface IModelConfigurationPreset {
  /** Preset ID */
  id: string;
  
  /** Preset name */
  name: string;
  
  /** Preset description */
  description?: string;
  
  /** Model name */
  modelName: string;
  
  /** Model provider */
  provider: string;
  
  /** Model parameters */
  parameters: {
    /** Temperature (0.0 - 1.0) */
    temperature?: number;
    
    /** Maximum tokens to generate */
    maxTokens?: number;
    
    /** Top-p sampling */
    topP?: number;
    
    /** Frequency penalty */
    frequencyPenalty?: number;
    
    /** Presence penalty */
    presencePenalty?: number;
    
    /** Stop sequences */
    stop?: string[];
    
    /** System prompt */
    systemPrompt?: string;
    
    /** Additional parameters */
    [key: string]: any;
  };
  
  /** Metadata */
  metadata: {
    /** Creation date */
    createdAt: string;
    
    /** Last modified date */
    modifiedAt: string;
    
    /** Creator name */
    createdBy?: string;
    
    /** Tags */
    tags?: string[];
    
    /** Additional metadata */
    [key: string]: any;
  };
}

/**
 * Preset manager class
 * 
 * @class PresetManager
 * @implements REQ-MODEL-040 Create a ModelConfigurationPreset interface with fields for model name, parameters, and metadata
 */
export class PresetManager {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private presets: Map<string, IModelConfigurationPreset> = new Map();
  
  /**
   * Create a new preset manager
   * @param context Extension context
   * @param outputChannel Output channel
   */
  constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.context = context;
    this.outputChannel = outputChannel;
  }
  
  /**
   * Initialize the preset manager
   */
  public async initialize(): Promise<void> {
    try {
      this.outputChannel.appendLine('Initializing preset manager...');
      
      // Load presets from storage
      await this.loadPresets();
      
      this.outputChannel.appendLine(`Loaded ${this.presets.size} presets`);
    } catch (error) {
      this.outputChannel.appendLine(`Error initializing preset manager: ${error}`);
    }
  }
  
  /**
   * Load presets from storage
   */
  private async loadPresets(): Promise<void> {
    try {
      // Load from global state
      const storedPresets = this.context.globalState.get<Record<string, IModelConfigurationPreset>>('adamize.modelPresets');
      
      if (storedPresets) {
        Object.values(storedPresets).forEach(preset => {
          this.presets.set(preset.id, preset);
        });
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error loading presets: ${error}`);
    }
  }
  
  /**
   * Save presets to storage
   */
  private async savePresets(): Promise<void> {
    try {
      const presetsObj: Record<string, IModelConfigurationPreset> = {};
      
      this.presets.forEach(preset => {
        presetsObj[preset.id] = preset;
      });
      
      await this.context.globalState.update('adamize.modelPresets', presetsObj);
    } catch (error) {
      this.outputChannel.appendLine(`Error saving presets: ${error}`);
    }
  }
  
  /**
   * Get all presets
   * @returns Array of presets
   */
  public getPresets(): IModelConfigurationPreset[] {
    return Array.from(this.presets.values());
  }
  
  /**
   * Get a preset by ID
   * @param id Preset ID
   * @returns Preset or undefined if not found
   */
  public getPreset(id: string): IModelConfigurationPreset | undefined {
    return this.presets.get(id);
  }
  
  /**
   * Create a new preset
   * @param preset Preset to create
   * @returns True if created successfully
   */
  public async createPreset(preset: IModelConfigurationPreset): Promise<boolean> {
    try {
      // Check if preset already exists
      if (this.presets.has(preset.id)) {
        this.outputChannel.appendLine(`Preset with ID ${preset.id} already exists`);
        return false;
      }
      
      // Add preset
      this.presets.set(preset.id, preset);
      
      // Save presets
      await this.savePresets();
      
      this.outputChannel.appendLine(`Created preset: ${preset.name} (${preset.id})`);
      
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error creating preset: ${error}`);
      return false;
    }
  }
  
  /**
   * Update a preset
   * @param id Preset ID
   * @param preset Updated preset
   * @returns True if updated successfully
   */
  public async updatePreset(id: string, preset: IModelConfigurationPreset): Promise<boolean> {
    try {
      // Check if preset exists
      if (!this.presets.has(id)) {
        this.outputChannel.appendLine(`Preset with ID ${id} not found`);
        return false;
      }
      
      // Update preset
      this.presets.set(id, preset);
      
      // Save presets
      await this.savePresets();
      
      this.outputChannel.appendLine(`Updated preset: ${preset.name} (${preset.id})`);
      
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error updating preset: ${error}`);
      return false;
    }
  }
  
  /**
   * Delete a preset
   * @param id Preset ID
   * @returns True if deleted successfully
   */
  public async deletePreset(id: string): Promise<boolean> {
    try {
      // Check if preset exists
      if (!this.presets.has(id)) {
        this.outputChannel.appendLine(`Preset with ID ${id} not found`);
        return false;
      }
      
      // Delete preset
      this.presets.delete(id);
      
      // Save presets
      await this.savePresets();
      
      this.outputChannel.appendLine(`Deleted preset: ${id}`);
      
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error deleting preset: ${error}`);
      return false;
    }
  }
  
  /**
   * Export presets to a file
   * @param filePath File path
   * @returns True if exported successfully
   */
  public async exportPresets(filePath: string): Promise<boolean> {
    try {
      // Create presets object
      const presetsObj: Record<string, IModelConfigurationPreset> = {};
      
      this.presets.forEach(preset => {
        presetsObj[preset.id] = preset;
      });
      
      // Write to file
      fs.writeFileSync(filePath, JSON.stringify(presetsObj, null, 2));
      
      this.outputChannel.appendLine(`Exported ${this.presets.size} presets to ${filePath}`);
      
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error exporting presets: ${error}`);
      return false;
    }
  }
  
  /**
   * Import presets from a file
   * @param filePath File path
   * @returns Number of imported presets
   */
  public async importPresets(filePath: string): Promise<number> {
    try {
      // Read file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const importedPresets = JSON.parse(fileContent) as Record<string, IModelConfigurationPreset>;
      
      // Import presets
      let importedCount = 0;
      
      for (const preset of Object.values(importedPresets)) {
        // Add preset
        this.presets.set(preset.id, preset);
        importedCount++;
      }
      
      // Save presets
      await this.savePresets();
      
      this.outputChannel.appendLine(`Imported ${importedCount} presets from ${filePath}`);
      
      return importedCount;
    } catch (error) {
      this.outputChannel.appendLine(`Error importing presets: ${error}`);
      return 0;
    }
  }
}

export default PresetManager;
