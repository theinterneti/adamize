/**
 * Model Operation Handler Interface
 *
 * This module defines the interface for model operation handlers.
 * Each provider (Ollama, HuggingFace, etc.) will implement this interface.
 *
 * @module handlers/IModelOperationHandler
 * @requires vscode
 *
 * @implements REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 */

import * as vscode from 'vscode';
import { IModelInfo } from '../utils/modelManager';

/**
 * Model provider type
 *
 * @enum {string}
 * @implements REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 */
export enum ModelProviderType {
  /** Ollama provider */
  OLLAMA = 'ollama',
  /** HuggingFace provider */
  HUGGINGFACE = 'huggingface',
  /** Local provider */
  LOCAL = 'local',
}

/**
 * Model operation handler interface
 *
 * @interface IModelOperationHandler
 * @implements REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 */
export interface IModelOperationHandler {
  /**
   * Get the provider type
   *
   * @returns {ModelProviderType} Provider type
   */
  getProviderType(): ModelProviderType;

  /**
   * Discover available models
   *
   * @returns {Promise<IModelInfo[]>} Array of discovered models
   */
  discoverModels(): Promise<IModelInfo[]>;

  /**
   * Get a model by ID
   *
   * @param {string} modelId - Model ID
   * @returns {Promise<IModelInfo | undefined>} Model information or undefined if not found
   */
  getModel(modelId: string): Promise<IModelInfo | undefined>;

  /**
   * Pull a model
   *
   * @param {string} modelName - Model name
   * @param {Record<string, any>} [options] - Pull options
   * @returns {Promise<void>} Promise that resolves when the model is pulled
   */
  pullModel(modelName: string, options?: Record<string, any>): Promise<void>;

  /**
   * Remove a model
   *
   * @param {string} modelName - Model name
   * @returns {Promise<void>} Promise that resolves when the model is removed
   */
  removeModel(modelName: string): Promise<void>;
}

export default IModelOperationHandler;
