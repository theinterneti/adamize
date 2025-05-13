/**
 * Local Model Handler
 *
 * This module provides a handler for local model operations.
 *
 * @module handlers/LocalModelHandler
 * @requires vscode
 * @requires fs
 * @requires path
 *
 * @implements REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 * @implements IMPL-REFACTOR-002 Implement LocalModelHandler
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IModelInfo } from '../utils/modelManager';
import { IModelOperationHandler, ModelProviderType } from './IModelOperationHandler';
import { ModelError, ModelErrorType } from '../utils/modelError';

/**
 * Local model handler
 *
 * @class LocalModelHandler
 * @implements {IModelOperationHandler}
 * @implements REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 * @implements IMPL-REFACTOR-002 Implement LocalModelHandler
 */
export class LocalModelHandler implements IModelOperationHandler {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private modelsCache: Map<string, IModelInfo> = new Map();

  /**
   * Creates an instance of LocalModelHandler.
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @param {vscode.OutputChannel} outputChannel - Output channel for logging
   */
  constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.context = context;
    this.outputChannel = outputChannel;
  }

  /**
   * Get the provider type
   *
   * @returns {ModelProviderType} Provider type
   */
  public getProviderType(): ModelProviderType {
    return ModelProviderType.LOCAL;
  }

  /**
   * Discover available models
   *
   * @returns {Promise<IModelInfo[]>} Array of discovered models
   */
  public async discoverModels(): Promise<IModelInfo[]> {
    this.outputChannel.appendLine('Discovering local models...');

    const models: IModelInfo[] = [];

    try {
      // Get storage path
      const storagePath = this.context.globalStorageUri.fsPath;

      // Check for models in the storage path
      if (fs.existsSync(storagePath)) {
        const files = fs.readdirSync(storagePath);

        for (const file of files) {
          if (file.endsWith('.onnx') || file.endsWith('.bin') || file.endsWith('.pt')) {
            const filePath = path.join(storagePath, file);
            const stats = fs.statSync(filePath);

            const model: IModelInfo = {
              id: file,
              name: file.replace(/\.[^/.]+$/, ''), // Remove extension
              version: '1.0.0', // Default version
              size: stats.size,
              localPath: filePath,
              isLocal: true,
              capabilities: ['text-generation'], // Default capability
              provider: 'local',
            };

            models.push(model);

            // Cache the model
            this.modelsCache.set(model.id, model);
          }
        }
      }

      this.outputChannel.appendLine(`Discovered ${models.length} local models`);

      return models;
    } catch (error) {
      this.outputChannel.appendLine(`Error discovering local models: ${error}`);
      throw error;
    }
  }

  /**
   * Get a model by ID
   *
   * @param {string} modelId - Model ID
   * @returns {Promise<IModelInfo | undefined>} Model information or undefined if not found
   */
  public async getModel(modelId: string): Promise<IModelInfo | undefined> {
    // Check cache first
    if (this.modelsCache.has(modelId)) {
      return this.modelsCache.get(modelId);
    }

    // If not in cache, try to discover it
    await this.discoverModels();

    return this.modelsCache.get(modelId);
  }

  /**
   * Pull a model
   *
   * @param {string} modelName - Model name
   * @param {Record<string, any>} [options] - Pull options
   * @returns {Promise<void>} Promise that resolves when the model is pulled
   */
  public async pullModel(modelName: string, options?: Record<string, any>): Promise<void> {
    // Local models can't be pulled directly
    throw new ModelError(
      `Cannot pull local model: ${modelName}`,
      ModelErrorType.UNKNOWN,
      'Local models must be downloaded manually and placed in the extension storage directory.'
    );
  }

  /**
   * Remove a model
   *
   * @param {string} modelName - Model name
   * @returns {Promise<void>} Promise that resolves when the model is removed
   */
  public async removeModel(modelName: string): Promise<void> {
    this.outputChannel.appendLine(`Removing local model: ${modelName}`);

    try {
      // Get model
      const model = await this.getModel(modelName);

      if (!model) {
        throw new ModelError(
          `Model not found: ${modelName}`,
          ModelErrorType.NOT_FOUND,
          'Check the model name and try again.'
        );
      }

      if (!model.localPath) {
        throw new ModelError(
          `Model has no local path: ${modelName}`,
          ModelErrorType.UNKNOWN,
          'The model may not be stored locally.'
        );
      }

      // Remove file
      fs.unlinkSync(model.localPath);

      this.outputChannel.appendLine(`Successfully removed local model: ${modelName}`);

      // Remove from cache
      this.modelsCache.delete(modelName);
    } catch (error) {
      this.outputChannel.appendLine(`Error removing local model: ${error}`);
      throw error;
    }
  }
}

export default LocalModelHandler;
