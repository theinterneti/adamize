/**
 * Model Configuration Service
 *
 * This module provides a service for managing model configurations.
 *
 * @module services/ModelConfigurationService
 * @requires vscode
 *
 * @implements REQ-REFACTOR-003 Implement Service Layer
 * @implements IMPL-REFACTOR-003 Implement ModelConfigurationService
 */

import * as vscode from 'vscode';
import { IModelConfigurationPreset, PresetManager } from '../utils/presetManager';
import { ModelError, ModelErrorType } from '../utils/modelError';

/**
 * Model configuration service
 *
 * @class ModelConfigurationService
 * @implements REQ-REFACTOR-003 Implement Service Layer
 * @implements IMPL-REFACTOR-003 Implement ModelConfigurationService
 */
export class ModelConfigurationService {
  private outputChannel: vscode.OutputChannel;
  private presetManager: PresetManager;

  /**
   * Creates an instance of ModelConfigurationService.
   *
   * @param {PresetManager} presetManager - Preset manager
   * @param {vscode.OutputChannel} outputChannel - Output channel for logging
   */
  constructor(presetManager: PresetManager, outputChannel: vscode.OutputChannel) {
    this.presetManager = presetManager;
    this.outputChannel = outputChannel;
  }

  /**
   * Get all presets
   *
   * @returns {IModelConfigurationPreset[]} Array of all presets
   */
  public getPresets(): IModelConfigurationPreset[] {
    return this.presetManager.getPresets();
  }

  /**
   * Get a preset by ID
   *
   * @param {string} presetId - Preset ID
   * @returns {IModelConfigurationPreset | undefined} Preset or undefined if not found
   */
  public getPreset(presetId: string): IModelConfigurationPreset | undefined {
    return this.presetManager.getPreset(presetId);
  }

  /**
   * Create a new preset
   *
   * @param {IModelConfigurationPreset} preset - Preset to create
   * @returns {Promise<boolean>} True if created successfully
   */
  public async createPreset(preset: IModelConfigurationPreset): Promise<boolean> {
    this.outputChannel.appendLine(`Creating preset: ${preset.name}`);

    try {
      // Validate preset
      this.validatePreset(preset);

      // Create preset
      const result = await this.presetManager.createPreset(preset);

      if (result) {
        this.outputChannel.appendLine(`Successfully created preset: ${preset.name}`);
      } else {
        this.outputChannel.appendLine(`Failed to create preset: ${preset.name}`);
      }

      return result;
    } catch (error) {
      this.outputChannel.appendLine(`Error creating preset: ${error}`);
      throw error;
    }
  }

  /**
   * Update a preset
   *
   * @param {string} presetId - Preset ID
   * @param {IModelConfigurationPreset} preset - Updated preset
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async updatePreset(presetId: string, preset: IModelConfigurationPreset): Promise<boolean> {
    this.outputChannel.appendLine(`Updating preset: ${presetId}`);

    try {
      // Validate preset
      this.validatePreset(preset);

      // Update preset
      const result = await this.presetManager.updatePreset(presetId, preset);

      if (result) {
        this.outputChannel.appendLine(`Successfully updated preset: ${preset.name}`);
      } else {
        this.outputChannel.appendLine(`Failed to update preset: ${preset.name}`);
      }

      return result;
    } catch (error) {
      this.outputChannel.appendLine(`Error updating preset: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a preset
   *
   * @param {string} presetId - Preset ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  public async deletePreset(presetId: string): Promise<boolean> {
    this.outputChannel.appendLine(`Deleting preset: ${presetId}`);

    try {
      // Delete preset
      const result = await this.presetManager.deletePreset(presetId);

      if (result) {
        this.outputChannel.appendLine(`Successfully deleted preset: ${presetId}`);
      } else {
        this.outputChannel.appendLine(`Failed to delete preset: ${presetId}`);
      }

      return result;
    } catch (error) {
      this.outputChannel.appendLine(`Error deleting preset: ${error}`);
      throw error;
    }
  }

  /**
   * Apply a preset to the current configuration
   *
   * @param {string} presetId - Preset ID
   * @returns {Promise<boolean>} True if applied successfully
   */
  public async applyPreset(presetId: string): Promise<boolean> {
    this.outputChannel.appendLine(`Applying preset: ${presetId}`);

    try {
      // Get preset
      const preset = this.presetManager.getPreset(presetId);

      if (!preset) {
        throw new ModelError(
          `Preset not found: ${presetId}`,
          ModelErrorType.NOT_FOUND,
          'Check the preset ID and try again.'
        );
      }

      // Apply preset to configuration
      const config = vscode.workspace.getConfiguration('adamize.ollama');

      // Update configuration
      await config.update('model', preset.modelName, vscode.ConfigurationTarget.Global);

      if (preset.parameters.temperature !== undefined) {
        await config.update(
          'temperature',
          preset.parameters.temperature,
          vscode.ConfigurationTarget.Global
        );
      }

      if (preset.parameters.maxTokens !== undefined) {
        await config.update(
          'maxTokens',
          preset.parameters.maxTokens,
          vscode.ConfigurationTarget.Global
        );
      }

      if (preset.parameters.systemPrompt !== undefined) {
        await config.update(
          'systemPrompt',
          preset.parameters.systemPrompt,
          vscode.ConfigurationTarget.Global
        );
      }

      this.outputChannel.appendLine(`Successfully applied preset: ${preset.name}`);

      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error applying preset: ${error}`);
      throw error;
    }
  }

  /**
   * Validate a preset
   *
   * @param {IModelConfigurationPreset} preset - Preset to validate
   * @throws {ModelError} If the preset is invalid
   */
  private validatePreset(preset: IModelConfigurationPreset): void {
    // Check required fields
    if (!preset.id) {
      throw new ModelError(
        'Preset ID is required',
        ModelErrorType.UNKNOWN,
        'Provide a unique ID for the preset.'
      );
    }

    if (!preset.name) {
      throw new ModelError(
        'Preset name is required',
        ModelErrorType.UNKNOWN,
        'Provide a name for the preset.'
      );
    }

    if (!preset.modelName) {
      throw new ModelError(
        'Model name is required',
        ModelErrorType.UNKNOWN,
        'Provide a model name for the preset.'
      );
    }

    if (!preset.provider) {
      throw new ModelError(
        'Provider is required',
        ModelErrorType.UNKNOWN,
        'Provide a provider for the preset.'
      );
    }

    // Check parameters
    if (!preset.parameters) {
      throw new ModelError(
        'Parameters are required',
        ModelErrorType.UNKNOWN,
        'Provide parameters for the preset.'
      );
    }

    // Validate temperature
    if (
      preset.parameters.temperature !== undefined &&
      (preset.parameters.temperature < 0 || preset.parameters.temperature > 1)
    ) {
      throw new ModelError(
        'Temperature must be between 0 and 1',
        ModelErrorType.UNKNOWN,
        'Provide a valid temperature value between 0 and 1.'
      );
    }

    // Validate max tokens
    if (preset.parameters.maxTokens !== undefined && preset.parameters.maxTokens < 1) {
      throw new ModelError(
        'Max tokens must be greater than 0',
        ModelErrorType.UNKNOWN,
        'Provide a valid max tokens value greater than 0.'
      );
    }
  }
}

export default ModelConfigurationService;
