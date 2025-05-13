/**
 * Refactored Model Manager Utility
 *
 * This module provides utilities for managing LLM models in the Adamize extension.
 * It handles model discovery, downloading, and loading.
 *
 * @module modelManager
 * @requires vscode
 *
 * @implements REQ-LLM-001 Discover available local LLM models
 * @implements REQ-LLM-002 Download models from remote sources
 * @implements REQ-LLM-003 Load models for use in the extension
 * @implements REQ-LLM-004 Manage model versions and updates
 * @implements REQ-OLLAMA-013 Add model management features (pulling, removing models)
 * @implements REQ-MODEL-020 Improve error handling for model operations
 * @implements REQ-MODEL-021 Provide detailed error messages with recovery suggestions
 * @implements REQ-MODEL-022 Add retry mechanisms for transient errors
 * @implements REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 * @implements REQ-REFACTOR-003 Implement Service Layer
 * @implements IMPL-REFACTOR-002 Implement refactored ModelManager
 * @implements IMPL-REFACTOR-003 Implement Service Layer
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ModelProviderType } from '../handlers/IModelOperationHandler';
import { ModelHandlerFactory } from '../handlers/ModelHandlerFactory';
import { OllamaClient } from '../ollama/ollamaClient';
import { ModelConfigurationService } from '../services/ModelConfigurationService';
import { ModelDiscoveryService } from '../services/ModelDiscoveryService';
import {
  IModelOperationProgress,
  ModelManagementService,
} from '../services/ModelManagementService';
import { ModelOperationStatus } from '../types/modelTypes';
import { ModelError, ModelErrorType } from './modelError';
import { PresetManager } from './presetManager';

/**
 * Model information interface
 *
 * @interface IModelInfo
 */
export interface IModelInfo {
  /** Unique identifier for the model */
  id: string;
  /** Human-readable name of the model */
  name: string;
  /** Model version */
  version: string;
  /** Size of the model in bytes */
  size: number;
  /** URL to download the model */
  url?: string;
  /** Local path to the model file */
  localPath?: string;
  /** Whether the model is available locally */
  isLocal: boolean;
  /** Model capabilities */
  capabilities: string[];
  /** Model provider (e.g., 'huggingface', 'ollama') */
  provider: string;
  /** Model details */
  details?: Record<string, any>;
}

/**
 * Model manager class
 *
 * @class ModelManager
 */
export class ModelManager {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private ollamaClient: OllamaClient;
  private handlerFactory: ModelHandlerFactory;
  private discoveryService: ModelDiscoveryService;
  private managementService: ModelManagementService;
  private configurationService: ModelConfigurationService;
  private presetManager: PresetManager;

  /**
   * Creates an instance of ModelManager.
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @param {vscode.OutputChannel} outputChannel - Output channel for logging
   */
  constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.context = context;
    this.outputChannel = outputChannel;

    // Initialize Ollama client
    const ollamaEndpoint = this.getOllamaEndpoint();
    this.ollamaClient = new OllamaClient(ollamaEndpoint, outputChannel);

    // Initialize handler factory
    this.handlerFactory = new ModelHandlerFactory(context, outputChannel, this.ollamaClient);

    // Initialize services
    this.discoveryService = new ModelDiscoveryService(this.handlerFactory, outputChannel);
    this.managementService = new ModelManagementService(this.handlerFactory, outputChannel);

    // Initialize preset manager
    this.presetManager = new PresetManager(context, outputChannel);

    // Initialize configuration service
    this.configurationService = new ModelConfigurationService(this.presetManager, outputChannel);
  }

  /**
   * Initialize the model manager
   *
   * @async
   * @returns {Promise<void>}
   */
  public async initialize(): Promise<void> {
    this.outputChannel.appendLine('Initializing model manager...');

    // Initialize preset manager
    await this.presetManager.initialize();

    // Discover models
    await this.discoverLocalModels();

    this.outputChannel.appendLine('Model manager initialized');
  }

  /**
   * Get the storage path for models
   *
   * @private
   * @returns {string} The storage path
   */
  private getStoragePath(): string {
    const storagePath = path.join(this.context.globalStorageUri.fsPath, 'models');

    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    return storagePath;
  }

  /**
   * Get the Ollama endpoint from settings or use default
   *
   * @returns {string} The Ollama endpoint
   */
  public getOllamaEndpoint(): string {
    // Get the endpoint from settings or use default
    const config = vscode.workspace.getConfiguration('adamize.ollama');
    return config.get<string>('endpoint') || 'http://localhost:11434';
  }

  /**
   * Format bytes to a human-readable string
   *
   * @private
   * @param {number} bytes - The number of bytes
   * @param {number} [decimals=2] - The number of decimal places
   * @returns {string} The formatted string
   */
  private formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) {
      return '0 Bytes';
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Check disk space
   *
   * @private
   * @returns {Promise<{ free: number; total: number }>} Free and total disk space in bytes
   */
  private async checkDiskSpace(): Promise<{ free: number; total: number }> {
    const storagePath = this.getStoragePath();

    try {
      // Use statfs if available (Node.js >= 18.0.0)
      if (typeof fs.statfs === 'function') {
        const stats = await fs.promises.statfs(storagePath);
        return {
          free: stats.bavail * stats.bsize,
          total: stats.blocks * stats.bsize,
        };
      }

      // Fallback for older Node.js versions
      const stats = await fs.promises.stat(storagePath);

      // Return a conservative estimate
      return {
        free: 10 * 1024 * 1024 * 1024, // Assume 10GB free
        total: 100 * 1024 * 1024 * 1024, // Assume 100GB total
      };
    } catch (error) {
      this.outputChannel.appendLine(`Error checking disk space: ${error}`);

      // Return a conservative estimate
      return {
        free: 10 * 1024 * 1024 * 1024, // Assume 10GB free
        total: 100 * 1024 * 1024 * 1024, // Assume 100GB total
      };
    }
  }

  /**
   * Discover local models
   *
   * @async
   * @returns {Promise<IModelInfo[]>} Array of discovered models
   */
  public async discoverLocalModels(): Promise<IModelInfo[]> {
    this.outputChannel.appendLine('Discovering local models...');

    try {
      // Use discovery service to discover all models
      const models = await this.discoveryService.discoverAllModels(true);

      this.outputChannel.appendLine(`Discovered ${models.length} models in total`);

      return models;
    } catch (error) {
      this.outputChannel.appendLine(`Error discovering local models: ${error}`);
      return [];
    }
  }

  /**
   * Discover Ollama models
   *
   * @async
   * @returns {Promise<IModelInfo[]>} Array of discovered Ollama models
   */
  public async discoverOllamaModels(): Promise<IModelInfo[]> {
    this.outputChannel.appendLine('Discovering Ollama models...');

    try {
      // Get Ollama handler
      const handler = this.handlerFactory.createHandler(ModelProviderType.OLLAMA);

      // Discover models
      return await handler.discoverModels();
    } catch (error) {
      this.outputChannel.appendLine(`Error discovering Ollama models: ${error}`);
      return [];
    }
  }

  /**
   * Download a model from a URL
   *
   * @async
   * @param {string} modelId - The model ID
   * @param {string} modelUrl - The URL to download the model from
   * @returns {Promise<string>} The path to the downloaded model
   */
  public async downloadModel(modelId: string, modelUrl: string): Promise<string> {
    this.outputChannel.appendLine(`Downloading model ${modelId} from ${modelUrl}`);

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Downloading model ${modelId}`,
        cancellable: true,
      },
      async (progress, token) => {
        try {
          const storagePath = this.getStoragePath();
          const modelPath = path.join(storagePath, modelId);

          // Check if the model already exists
          if (fs.existsSync(modelPath)) {
            this.outputChannel.appendLine(`Model ${modelId} already exists at ${modelPath}`);
            return modelPath;
          }

          // Check disk space before downloading
          try {
            const { free } = await this.checkDiskSpace();
            // Assume models are at least 2GB, warn if less than 5GB available
            if (free < 5 * 1024 * 1024 * 1024) {
              const warningMessage = `Low disk space: ${this.formatBytes(free)} available. Models typically require 2-10GB.`;
              this.outputChannel.appendLine(warningMessage);

              // Show warning but continue
              const continueDownload = await vscode.window.showWarningMessage(
                warningMessage,
                { modal: true },
                'Continue Anyway',
                'Cancel'
              );

              if (continueDownload !== 'Continue Anyway') {
                throw new ModelError(
                  'Model download cancelled due to low disk space',
                  ModelErrorType.DOWNLOAD,
                  'Free up disk space before trying again.'
                );
              }
            }
          } catch (error) {
            // If we can't check disk space, just log and continue
            this.outputChannel.appendLine(`Could not check disk space: ${error}`);
          }

          // Download the model
          const response = await axios({
            method: 'GET',
            url: modelUrl,
            responseType: 'stream',
            onDownloadProgress: progressEvent => {
              if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                progress.report({ increment: percent });
              }
            },
          });

          // Create a write stream
          const writer = fs.createWriteStream(modelPath);

          // Pipe the response to the file
          response.data.pipe(writer);

          // Wait for the download to complete
          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
            token.onCancellationRequested(() => {
              writer.close();
              fs.unlinkSync(modelPath);
              reject(new Error('Download cancelled'));
            });
          });

          this.outputChannel.appendLine(`Model ${modelId} downloaded to ${modelPath}`);

          // Update discovery service
          await this.discoveryService.discoverAllModels(true);

          return modelPath;
        } catch (error) {
          this.outputChannel.appendLine(`Error downloading model ${modelId}: ${error}`);
          throw error;
        }
      }
    );
  }

  /**
   * Get a model by ID
   *
   * @async
   * @param {string} modelId - The model ID
   * @returns {Promise<IModelInfo | undefined>} The model information or undefined if not found
   */
  public async getModel(modelId: string): Promise<IModelInfo | undefined> {
    try {
      // Use discovery service to get model
      return await this.discoveryService.getModel(modelId);
    } catch (error) {
      this.outputChannel.appendLine(`Error getting model ${modelId}: ${error}`);
      return undefined;
    }
  }

  /**
   * List all available models
   *
   * @async
   * @returns {Promise<IModelInfo[]>} Array of all available models
   */
  public async listModels(): Promise<IModelInfo[]> {
    try {
      // Use discovery service to discover all models
      return await this.discoveryService.discoverAllModels();
    } catch (error) {
      this.outputChannel.appendLine(`Error listing models: ${error}`);
      return [];
    }
  }

  /**
   * Pull an Ollama model
   *
   * @async
   * @param {string} modelName - The name of the model to pull
   * @returns {Promise<void>}
   */
  public async pullOllamaModel(modelName: string): Promise<void> {
    this.outputChannel.appendLine(`Pulling Ollama model: ${modelName}`);

    try {
      // Show progress notification
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Pulling Ollama model: ${modelName}`,
          cancellable: false,
        },
        async progress => {
          // Report initial progress
          progress.report({ increment: 0 });

          // Create progress callback
          const progressCallback = (progressInfo: IModelOperationProgress) => {
            progress.report({
              increment: progressInfo.percentage || 0,
              message: progressInfo.message,
            });
          };

          // Use management service to pull model
          const result = await this.managementService.pullModel(
            modelName,
            ModelProviderType.OLLAMA,
            undefined,
            progressCallback
          );

          // Check result
          if (result.status === ModelOperationStatus.ERROR) {
            throw result.error || new Error(result.message);
          }

          // Report final progress
          progress.report({ increment: 100 });
          this.outputChannel.appendLine(`Successfully pulled Ollama model: ${modelName}`);
        }
      );
    } catch (error) {
      this.outputChannel.appendLine(`Error pulling Ollama model: ${error}`);
      throw error;
    }
  }

  /**
   * Remove an Ollama model
   *
   * @async
   * @param {string} modelName - The name of the model to remove
   * @returns {Promise<void>}
   */
  public async removeOllamaModel(modelName: string): Promise<void> {
    this.outputChannel.appendLine(`Removing Ollama model: ${modelName}`);

    try {
      // Show progress notification
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Removing Ollama model: ${modelName}`,
          cancellable: false,
        },
        async progress => {
          // Report initial progress
          progress.report({ increment: 0 });

          // Create progress callback
          const progressCallback = (progressInfo: IModelOperationProgress) => {
            progress.report({
              increment: progressInfo.percentage || 0,
              message: progressInfo.message,
            });
          };

          // Use management service to remove model
          const result = await this.managementService.removeModel(
            modelName,
            ModelProviderType.OLLAMA,
            progressCallback
          );

          // Check result
          if (result.status === ModelOperationStatus.ERROR) {
            throw result.error || new Error(result.message);
          }

          // Report final progress
          progress.report({ increment: 100 });
          this.outputChannel.appendLine(`Successfully removed Ollama model: ${modelName}`);
        }
      );
    } catch (error) {
      this.outputChannel.appendLine(`Error removing Ollama model: ${error}`);
      throw error;
    }
  }

  /**
   * Start the Ollama server
   *
   * @async
   * @returns {Promise<void>}
   */
  public async startOllamaServer(): Promise<void> {
    this.outputChannel.appendLine('Starting Ollama server...');

    try {
      // Show progress notification
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Starting Ollama server',
          cancellable: false,
        },
        async progress => {
          // Report initial progress
          progress.report({ increment: 0 });

          // Create progress callback
          const progressCallback = (progressInfo: IModelOperationProgress) => {
            progress.report({
              increment: progressInfo.percentage || 0,
              message: progressInfo.message,
            });
          };

          // Use management service to start server
          const result = await this.managementService.startServer(
            ModelProviderType.OLLAMA,
            progressCallback
          );

          // Check result
          if (result.status === ModelOperationStatus.ERROR) {
            throw result.error || new Error(result.message);
          }

          // Report final progress
          progress.report({ increment: 100 });
          this.outputChannel.appendLine('Successfully started Ollama server');
        }
      );
    } catch (error) {
      this.outputChannel.appendLine(`Error starting Ollama server: ${error}`);
      throw error;
    }
  }

  /**
   * Stop the Ollama server
   *
   * @async
   * @returns {Promise<void>}
   */
  public async stopOllamaServer(): Promise<void> {
    this.outputChannel.appendLine('Stopping Ollama server...');

    try {
      await this.ollamaClient.stopServer();
      this.outputChannel.appendLine('Ollama server stopped successfully');
    } catch (error) {
      if (error instanceof ModelError) {
        this.outputChannel.appendLine(
          `Error stopping Ollama server: ${error.message}\nRecovery suggestion: ${error.recoverySuggestion}`
        );
        vscode.window.showErrorMessage(error.getUserFriendlyMessage());
      } else {
        this.outputChannel.appendLine(`Error stopping Ollama server: ${error}`);
        vscode.window.showErrorMessage(`Error stopping Ollama server: ${error}`);
      }
      throw error;
    }
  }
}
