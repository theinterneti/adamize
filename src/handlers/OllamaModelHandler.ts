/**
 * Ollama Model Handler
 *
 * This module provides a handler for Ollama model operations.
 *
 * @module handlers/OllamaModelHandler
 * @requires vscode
 * @requires ollama/ollamaClient
 *
 * @implements REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 * @implements IMPL-REFACTOR-002 Implement OllamaModelHandler
 */

import * as vscode from 'vscode';
import { IOllamaClient } from '../ollama/ollamaClient.interface';
import { IModelInfo } from '../utils/modelManager';
import { IModelOperationHandler, ModelProviderType } from './IModelOperationHandler';
import { ModelError, ModelErrorType } from '../utils/modelError';

/**
 * Ollama model handler
 *
 * @class OllamaModelHandler
 * @implements {IModelOperationHandler}
 * @implements REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 * @implements IMPL-REFACTOR-002 Implement OllamaModelHandler
 */
export class OllamaModelHandler implements IModelOperationHandler {
  private ollamaClient: IOllamaClient;
  private outputChannel: vscode.OutputChannel;
  private modelsCache: Map<string, IModelInfo> = new Map();

  /**
   * Creates an instance of OllamaModelHandler.
   *
   * @param {IOllamaClient} ollamaClient - Ollama client
   * @param {vscode.OutputChannel} outputChannel - Output channel for logging
   */
  constructor(ollamaClient: IOllamaClient, outputChannel: vscode.OutputChannel) {
    this.ollamaClient = ollamaClient;
    this.outputChannel = outputChannel;
  }

  /**
   * Get the provider type
   *
   * @returns {ModelProviderType} Provider type
   */
  public getProviderType(): ModelProviderType {
    return ModelProviderType.OLLAMA;
  }

  /**
   * Discover available models
   *
   * @returns {Promise<IModelInfo[]>} Array of discovered models
   */
  public async discoverModels(): Promise<IModelInfo[]> {
    this.outputChannel.appendLine('Discovering Ollama models...');

    try {
      // Get models from Ollama client
      const ollamaModels = await this.ollamaClient.listModels();

      // Convert Ollama models to IModelInfo
      const models: IModelInfo[] = ollamaModels.map(model => ({
        id: model.name,
        name: model.name,
        version: model.modified_at
          ? new Date(model.modified_at).toISOString().split('T')[0]
          : 'unknown',
        size: model.size || 0,
        isLocal: true,
        capabilities: ['text-generation'],
        provider: 'ollama',
        details: model.details || {},
      }));

      this.outputChannel.appendLine(`Discovered ${models.length} Ollama models`);

      // Cache the models
      models.forEach(model => this.modelsCache.set(model.id, model));

      return models;
    } catch (error) {
      this.outputChannel.appendLine(`Error discovering Ollama models: ${error}`);
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

    try {
      // Get model info from Ollama client
      const modelInfo = await this.ollamaClient.getModelInfo(modelId);

      // Convert to IModelInfo
      const model: IModelInfo = {
        id: modelInfo.name,
        name: modelInfo.name,
        version: modelInfo.modified_at
          ? new Date(modelInfo.modified_at).toISOString().split('T')[0]
          : 'unknown',
        size: modelInfo.size || 0,
        isLocal: true,
        capabilities: ['text-generation'],
        provider: 'ollama',
        details: modelInfo.details || {},
      };

      // Cache the model
      this.modelsCache.set(model.id, model);

      return model;
    } catch (error) {
      if (error instanceof ModelError && error.type === ModelErrorType.NOT_FOUND) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Pull a model
   *
   * @param {string} modelName - Model name
   * @param {Record<string, any>} [options] - Pull options
   * @returns {Promise<void>} Promise that resolves when the model is pulled
   */
  public async pullModel(modelName: string, options?: Record<string, any>): Promise<void> {
    this.outputChannel.appendLine(`Pulling Ollama model: ${modelName}`);

    try {
      // Pull model using Ollama client
      await this.ollamaClient.pullModel(modelName, options);

      this.outputChannel.appendLine(`Successfully pulled Ollama model: ${modelName}`);

      // Refresh the model cache
      await this.discoverModels();
    } catch (error) {
      this.outputChannel.appendLine(`Error pulling Ollama model: ${error}`);
      throw error;
    }
  }

  /**
   * Remove a model
   *
   * @param {string} modelName - Model name
   * @returns {Promise<void>} Promise that resolves when the model is removed
   */
  public async removeModel(modelName: string): Promise<void> {
    this.outputChannel.appendLine(`Removing Ollama model: ${modelName}`);

    try {
      // Remove model using Ollama client
      await this.ollamaClient.removeModel(modelName);

      this.outputChannel.appendLine(`Successfully removed Ollama model: ${modelName}`);

      // Remove from cache
      this.modelsCache.delete(modelName);
    } catch (error) {
      this.outputChannel.appendLine(`Error removing Ollama model: ${error}`);
      throw error;
    }
  }
}

export default OllamaModelHandler;
