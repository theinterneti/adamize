/**
 * Model Management Service
 *
 * This module provides a service for managing models.
 *
 * @module services/ModelManagementService
 * @requires vscode
 *
 * @implements REQ-REFACTOR-003 Implement Service Layer
 * @implements IMPL-REFACTOR-003 Implement ModelManagementService
 */

import * as vscode from 'vscode';
import { IModelInfo } from '../utils/modelManager';
import { IModelOperationHandler, ModelProviderType } from '../handlers/IModelOperationHandler';
import ModelHandlerFactory from '../handlers/ModelHandlerFactory';
import { ModelOperationStatus } from '../types/modelTypes';
import { ModelError, ModelErrorType } from '../utils/modelError';

/**
 * Model operation progress
 *
 * @interface IModelOperationProgress
 * @implements REQ-REFACTOR-003 Implement Service Layer
 */
export interface IModelOperationProgress {
  /** Operation status */
  status: ModelOperationStatus;
  /** Progress message */
  message: string;
  /** Progress percentage (0-100) */
  percentage?: number;
}

/**
 * Model operation result
 *
 * @interface IModelOperationResult
 * @implements REQ-REFACTOR-003 Implement Service Layer
 */
export interface IModelOperationResult {
  /** Operation status */
  status: ModelOperationStatus;
  /** Result message */
  message: string;
  /** Error (if status is ERROR) */
  error?: Error;
  /** Model information (if available) */
  model?: IModelInfo;
}

/**
 * Model management service
 *
 * @class ModelManagementService
 * @implements REQ-REFACTOR-003 Implement Service Layer
 * @implements IMPL-REFACTOR-003 Implement ModelManagementService
 */
export class ModelManagementService {
  private outputChannel: vscode.OutputChannel;
  private handlerFactory: ModelHandlerFactory;

  /**
   * Creates an instance of ModelManagementService.
   *
   * @param {ModelHandlerFactory} handlerFactory - Model handler factory
   * @param {vscode.OutputChannel} outputChannel - Output channel for logging
   */
  constructor(handlerFactory: ModelHandlerFactory, outputChannel: vscode.OutputChannel) {
    this.handlerFactory = handlerFactory;
    this.outputChannel = outputChannel;
  }

  /**
   * Pull a model
   *
   * @param {string} modelName - Model name
   * @param {ModelProviderType} providerType - Provider type
   * @param {Record<string, any>} [options] - Pull options
   * @param {(progress: IModelOperationProgress) => void} [progressCallback] - Progress callback
   * @returns {Promise<IModelOperationResult>} Operation result
   */
  public async pullModel(
    modelName: string,
    providerType: ModelProviderType,
    options?: Record<string, any>,
    progressCallback?: (progress: IModelOperationProgress) => void
  ): Promise<IModelOperationResult> {
    this.outputChannel.appendLine(`Pulling model: ${modelName} from ${providerType}`);

    // Report initial progress
    if (progressCallback) {
      progressCallback({
        status: ModelOperationStatus.IN_PROGRESS,
        message: `Pulling model: ${modelName}`,
        percentage: 0,
      });
    }

    try {
      // Get handler for provider
      const handler = this.handlerFactory.createHandler(providerType);

      // Pull model
      await handler.pullModel(modelName, options);

      // Report success
      if (progressCallback) {
        progressCallback({
          status: ModelOperationStatus.SUCCESS,
          message: `Successfully pulled model: ${modelName}`,
          percentage: 100,
        });
      }

      // Get model info
      const model = await handler.getModel(modelName);

      return {
        status: ModelOperationStatus.SUCCESS,
        message: `Successfully pulled model: ${modelName}`,
        model,
      };
    } catch (error) {
      // Report error
      if (progressCallback) {
        progressCallback({
          status: ModelOperationStatus.ERROR,
          message: `Error pulling model: ${error instanceof Error ? error.message : String(error)}`,
          percentage: 0,
        });
      }

      return {
        status: ModelOperationStatus.ERROR,
        message: `Error pulling model: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Remove a model
   *
   * @param {string} modelName - Model name
   * @param {ModelProviderType} providerType - Provider type
   * @param {(progress: IModelOperationProgress) => void} [progressCallback] - Progress callback
   * @returns {Promise<IModelOperationResult>} Operation result
   */
  public async removeModel(
    modelName: string,
    providerType: ModelProviderType,
    progressCallback?: (progress: IModelOperationProgress) => void
  ): Promise<IModelOperationResult> {
    this.outputChannel.appendLine(`Removing model: ${modelName} from ${providerType}`);

    // Report initial progress
    if (progressCallback) {
      progressCallback({
        status: ModelOperationStatus.IN_PROGRESS,
        message: `Removing model: ${modelName}`,
        percentage: 0,
      });
    }

    try {
      // Get handler for provider
      const handler = this.handlerFactory.createHandler(providerType);

      // Remove model
      await handler.removeModel(modelName);

      // Report success
      if (progressCallback) {
        progressCallback({
          status: ModelOperationStatus.SUCCESS,
          message: `Successfully removed model: ${modelName}`,
          percentage: 100,
        });
      }

      return {
        status: ModelOperationStatus.SUCCESS,
        message: `Successfully removed model: ${modelName}`,
      };
    } catch (error) {
      // Report error
      if (progressCallback) {
        progressCallback({
          status: ModelOperationStatus.ERROR,
          message: `Error removing model: ${error instanceof Error ? error.message : String(error)}`,
          percentage: 0,
        });
      }

      return {
        status: ModelOperationStatus.ERROR,
        message: `Error removing model: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Start a model server
   *
   * @param {ModelProviderType} providerType - Provider type
   * @param {(progress: IModelOperationProgress) => void} [progressCallback] - Progress callback
   * @returns {Promise<IModelOperationResult>} Operation result
   */
  public async startServer(
    providerType: ModelProviderType,
    progressCallback?: (progress: IModelOperationProgress) => void
  ): Promise<IModelOperationResult> {
    this.outputChannel.appendLine(`Starting server for ${providerType}`);

    // Report initial progress
    if (progressCallback) {
      progressCallback({
        status: ModelOperationStatus.IN_PROGRESS,
        message: `Starting server for ${providerType}`,
        percentage: 0,
      });
    }

    try {
      // Currently only Ollama server can be started
      if (providerType !== ModelProviderType.OLLAMA) {
        throw new ModelError(
          `Cannot start server for ${providerType}`,
          ModelErrorType.UNKNOWN,
          `Only Ollama servers can be started.`
        );
      }

      // Get Ollama handler
      const handler = this.handlerFactory.createHandler(ModelProviderType.OLLAMA);

      // Start server (assuming OllamaModelHandler has a startServer method)
      // This would need to be added to the OllamaModelHandler class
      // await (handler as OllamaModelHandler).startServer();

      // For now, we'll just use the ollamaClient directly
      const ollamaClient = (handler as any).ollamaClient;
      if (ollamaClient && typeof ollamaClient.startServer === 'function') {
        await ollamaClient.startServer();
      } else {
        throw new ModelError(
          `Cannot start Ollama server`,
          ModelErrorType.UNKNOWN,
          `The Ollama client does not support starting the server.`
        );
      }

      // Report success
      if (progressCallback) {
        progressCallback({
          status: ModelOperationStatus.SUCCESS,
          message: `Successfully started server for ${providerType}`,
          percentage: 100,
        });
      }

      return {
        status: ModelOperationStatus.SUCCESS,
        message: `Successfully started server for ${providerType}`,
      };
    } catch (error) {
      // Report error
      if (progressCallback) {
        progressCallback({
          status: ModelOperationStatus.ERROR,
          message: `Error starting server: ${error instanceof Error ? error.message : String(error)}`,
          percentage: 0,
        });
      }

      return {
        status: ModelOperationStatus.ERROR,
        message: `Error starting server: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

export default ModelManagementService;
