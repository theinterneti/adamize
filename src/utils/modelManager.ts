/**
 * Model Manager Utility
 *
 * This module provides utilities for managing LLM models in the Adamize extension.
 * It handles model discovery, downloading, and loading.
 *
 * @module modelManager
 * @requires vscode
 * @requires fs
 * @requires path
 * @requires axios
 *
 * @REQ-LLM-001 Discover available local LLM models
 * @REQ-LLM-002 Download models from remote sources
 * @REQ-LLM-003 Load models for use in the extension
 * @REQ-LLM-004 Manage model versions and updates
 * @REQ-OLLAMA-013 Add model management features (pulling, removing models)
 * @REQ-MODEL-020 Improve error handling for model operations
 * @REQ-MODEL-021 Provide detailed error messages with recovery suggestions
 * @REQ-MODEL-022 Add retry mechanisms for transient errors
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Model error types
 *
 * @enum {string}
 * @implements REQ-MODEL-020 Improve error handling for model operations
 */
export enum ModelErrorType {
  /** Connection error when communicating with model provider */
  CONNECTION = 'connection',
  /** Model not found error */
  NOT_FOUND = 'not_found',
  /** Permission error when accessing model files */
  PERMISSION = 'permission',
  /** Download error when pulling models */
  DOWNLOAD = 'download',
  /** Server error when starting or stopping model servers */
  SERVER = 'server',
  /** Unknown error */
  UNKNOWN = 'unknown',
}

/**
 * Model error class
 *
 * @class ModelError
 * @extends Error
 * @implements REQ-MODEL-021 Provide detailed error messages with recovery suggestions
 */
export class ModelError extends Error {
  /** Error type */
  public type: ModelErrorType;
  /** Recovery suggestion */
  public recoverySuggestion: string;
  /** Original error */
  public originalError?: Error;

  /**
   * Creates an instance of ModelError.
   *
   * @param {string} message - Error message
   * @param {ModelErrorType} type - Error type
   * @param {string} recoverySuggestion - Recovery suggestion
   * @param {Error} [originalError] - Original error
   */
  constructor(
    message: string,
    type: ModelErrorType,
    recoverySuggestion: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ModelError';
    this.type = type;
    this.recoverySuggestion = recoverySuggestion;
    this.originalError = originalError;
  }

  /**
   * Get a user-friendly error message with recovery suggestion
   *
   * @returns {string} User-friendly error message
   */
  public getUserFriendlyMessage(): string {
    return `${this.message}\n\nTry this: ${this.recoverySuggestion}`;
  }
}

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
}

/**
 * Model manager class
 *
 * @class ModelManager
 * @implements {IModelManager}
 */
export class ModelManager {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private modelsCache: Map<string, IModelInfo> = new Map();

  /** Maximum number of retries for operations */
  private static readonly MAX_RETRIES = 3;
  /** Delay between retries in milliseconds */
  private static readonly RETRY_DELAY = 1000;

  /**
   * Creates an instance of ModelManager.
   *
   * @param {vscode.ExtensionContext} context - The extension context
   * @param {vscode.OutputChannel} outputChannel - The output channel for logging
   */
  constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.context = context;
    this.outputChannel = outputChannel;
  }

  /**
   * Execute an operation with retry logic
   *
   * @private
   * @template T
   * @param {() => Promise<T>} operation - The operation to execute
   * @param {string} operationName - The name of the operation for logging
   * @param {number} [maxRetries=ModelManager.MAX_RETRIES] - Maximum number of retries
   * @param {number} [delay=ModelManager.RETRY_DELAY] - Delay between retries in milliseconds
   * @returns {Promise<T>} The result of the operation
   * @throws {ModelError} If the operation fails after all retries
   * @implements REQ-MODEL-022 Add retry mechanisms for transient errors
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = ModelManager.MAX_RETRIES,
    delay: number = ModelManager.RETRY_DELAY
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        if (attempt > 1) {
          this.outputChannel.appendLine(`Retry attempt ${attempt - 1} for ${operationName}...`);
        }

        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt <= maxRetries) {
          // Only retry for connection errors
          if (error instanceof ModelError && error.type !== ModelErrorType.CONNECTION) {
            throw error;
          }

          this.outputChannel.appendLine(
            `Operation ${operationName} failed (attempt ${attempt}/${maxRetries + 1}): ${lastError.message}`
          );

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If we get here, all retries failed
    if (lastError instanceof ModelError) {
      throw lastError;
    } else {
      throw new ModelError(
        `Operation ${operationName} failed after ${maxRetries} retries: ${lastError?.message || 'Unknown error'}`,
        ModelErrorType.UNKNOWN,
        'Check your network connection and try again later.',
        lastError
      );
    }
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
   * Discover local models
   *
   * @async
   * @returns {Promise<IModelInfo[]>} Array of discovered models
   */
  public async discoverLocalModels(): Promise<IModelInfo[]> {
    this.outputChannel.appendLine('Discovering local models...');

    const models: IModelInfo[] = [];
    const storagePath = this.getStoragePath();

    // Check for models in the storage path
    if (fs.existsSync(storagePath)) {
      const files = fs.readdirSync(storagePath);

      for (const file of files) {
        if (file.endsWith('.onnx') || file.endsWith('.bin') || file.endsWith('.pt')) {
          const filePath = path.join(storagePath, file);
          const stats = fs.statSync(filePath);

          models.push({
            id: file,
            name: file.replace(/\.[^/.]+$/, ''), // Remove extension
            version: '1.0.0', // Default version
            size: stats.size,
            localPath: filePath,
            isLocal: true,
            capabilities: ['text-generation'], // Default capability
            provider: 'local',
          });
        }
      }
    }

    // Discover Ollama models
    try {
      const ollamaModels = await this.discoverOllamaModels();
      models.push(...ollamaModels);
    } catch (error) {
      this.outputChannel.appendLine(`Error discovering Ollama models: ${error}`);
    }

    // TODO: Add discovery for Hugging Face models

    this.outputChannel.appendLine(`Discovered ${models.length} local models`);

    // Cache the models
    models.forEach(model => this.modelsCache.set(model.id, model));

    return models;
  }

  /**
   * Download a model from a remote source
   *
   * @async
   * @param {string} modelId - The model ID
   * @param {string} modelUrl - The URL to download the model from
   * @returns {Promise<string>} The local path to the downloaded model
   */
  public async downloadModel(modelId: string, modelUrl: string): Promise<string> {
    this.outputChannel.appendLine(`Downloading model ${modelId} from ${modelUrl}...`);

    const storagePath = this.getStoragePath();
    const modelPath = path.join(storagePath, modelId);

    // Check if model already exists
    if (fs.existsSync(modelPath)) {
      this.outputChannel.appendLine(`Model ${modelId} already exists at ${modelPath}`);
      return modelPath;
    }

    // Create progress notification
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Downloading ${modelId}...`,
        cancellable: true,
      },
      async (progress, token) => {
        try {
          // Download file
          const response = await axios({
            method: 'GET',
            url: modelUrl,
            responseType: 'stream',
            onDownloadProgress: progressEvent => {
              // Check if total is defined before using it
              if (progressEvent.total !== undefined) {
                const percentComplete = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                progress.report({
                  message: `${percentComplete}%`,
                  increment: percentComplete,
                });
              } else {
                // If total is undefined, just report the loaded bytes
                progress.report({
                  message: `Downloaded ${Math.round(progressEvent.loaded / 1024 / 1024)} MB`,
                  increment: 1,
                });
              }
            },
          });

          // Save to file
          const writer = fs.createWriteStream(modelPath);
          response.data.pipe(writer);

          await new Promise<void>((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
            token.onCancellationRequested(() => {
              writer.close();
              if (fs.existsSync(modelPath)) {
                fs.unlinkSync(modelPath);
              }
              reject(new Error('Download cancelled'));
            });
          });

          this.outputChannel.appendLine(`Model ${modelId} downloaded to ${modelPath}`);

          // Update cache
          const stats = fs.statSync(modelPath);
          this.modelsCache.set(modelId, {
            id: modelId,
            name: modelId.replace(/\.[^/.]+$/, ''), // Remove extension
            version: '1.0.0', // Default version
            size: stats.size,
            localPath: modelPath,
            isLocal: true,
            capabilities: ['text-generation'], // Default capability
            provider: 'downloaded',
          });

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
    // Check cache first
    if (this.modelsCache.has(modelId)) {
      return this.modelsCache.get(modelId);
    }

    // If not in cache, try to discover it
    await this.discoverLocalModels();

    return this.modelsCache.get(modelId);
  }

  /**
   * List all available models
   *
   * @async
   * @returns {Promise<IModelInfo[]>} Array of all available models
   */
  public async listModels(): Promise<IModelInfo[]> {
    // Refresh the cache
    await this.discoverLocalModels();

    return Array.from(this.modelsCache.values());
  }

  /**
   * Discover Ollama models
   *
   * @async
   * @returns {Promise<IModelInfo[]>} Array of discovered Ollama models
   * @implements REQ-MODEL-020 Improve error handling for model operations
   * @implements REQ-MODEL-021 Provide detailed error messages with recovery suggestions
   * @implements REQ-MODEL-022 Add retry mechanisms for transient errors
   */
  public async discoverOllamaModels(): Promise<IModelInfo[]> {
    this.outputChannel.appendLine('Discovering Ollama models...');

    try {
      return await this.executeWithRetry(async () => {
        // Get Ollama endpoint from settings or use default
        const ollamaEndpoint = this.getOllamaEndpoint();

        try {
          // Call Ollama API to get models
          const response = await fetch(`${ollamaEndpoint}/api/tags`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            // Handle different error status codes
            switch (response.status) {
              case 404:
                throw new ModelError(
                  `Ollama API endpoint not found: ${ollamaEndpoint}/api/tags`,
                  ModelErrorType.NOT_FOUND,
                  'Check that Ollama is installed and running. You can start it with "Adamize Models: Start Ollama Server".'
                );
              case 401:
              case 403:
                throw new ModelError(
                  'Unauthorized access to Ollama API',
                  ModelErrorType.PERMISSION,
                  'Check your Ollama API credentials in settings.'
                );
              case 500:
              case 502:
              case 503:
              case 504:
                throw new ModelError(
                  `Ollama server error: ${response.status} ${response.statusText}`,
                  ModelErrorType.SERVER,
                  'The Ollama server is experiencing issues. Try restarting it with "Adamize Models: Start Ollama Server".'
                );
              default:
                throw new ModelError(
                  `Ollama API error: ${response.status} ${response.statusText}`,
                  ModelErrorType.CONNECTION,
                  'Check that Ollama is running and accessible at the configured URL.'
                );
            }
          }

          const data = await response.json();

          if (!data.models || !Array.isArray(data.models)) {
            this.outputChannel.appendLine('No Ollama models found or invalid response format');
            return [];
          }

          // Convert Ollama models to IModelInfo
          const models: IModelInfo[] = data.models.map((model: any) => ({
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
          // Handle fetch errors (network errors)
          if (
            !(error instanceof ModelError) &&
            error instanceof Error &&
            error.message.includes('fetch')
          ) {
            throw new ModelError(
              `Failed to connect to Ollama server at ${ollamaEndpoint}`,
              ModelErrorType.CONNECTION,
              'Check that Ollama is running and accessible. You can start it with "Adamize Models: Start Ollama Server".',
              error
            );
          }
          throw error;
        }
      }, 'discoverOllamaModels');
    } catch (error) {
      // Log the error with recovery suggestion
      if (error instanceof ModelError) {
        this.outputChannel.appendLine(
          `Error discovering Ollama models: ${error.message}\nRecovery suggestion: ${error.recoverySuggestion}`
        );
      } else {
        this.outputChannel.appendLine(`Error discovering Ollama models: ${error}`);
      }

      // Return empty array instead of throwing to avoid breaking the UI
      return [];
    }
  }

  /**
   * Pull an Ollama model
   *
   * @async
   * @param {string} modelName - The name of the model to pull
   * @returns {Promise<void>}
   * @implements REQ-MODEL-020 Improve error handling for model operations
   * @implements REQ-MODEL-021 Provide detailed error messages with recovery suggestions
   * @implements REQ-MODEL-022 Add retry mechanisms for transient errors
   */
  public async pullOllamaModel(modelName: string): Promise<void> {
    this.outputChannel.appendLine(`Pulling Ollama model: ${modelName}`);

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Pulling Ollama model: ${modelName}`,
        cancellable: true,
      },
      async (progress, token) => {
        try {
          await this.executeWithRetry(async () => {
            // Get Ollama endpoint from settings or use default
            const ollamaEndpoint = this.getOllamaEndpoint();

            try {
              // Check disk space before pulling
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

              // Call Ollama API to pull the model
              const response = await fetch(`${ollamaEndpoint}/api/pull`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: modelName,
                  stream: false,
                }),
              });

              if (!response.ok) {
                // Handle different error status codes
                switch (response.status) {
                  case 404:
                    throw new ModelError(
                      `Ollama API endpoint not found: ${ollamaEndpoint}/api/pull`,
                      ModelErrorType.NOT_FOUND,
                      'Check that Ollama is installed and running. You can start it with "Adamize Models: Start Ollama Server".'
                    );
                  case 401:
                  case 403:
                    throw new ModelError(
                      'Unauthorized access to Ollama API',
                      ModelErrorType.PERMISSION,
                      'Check your Ollama API credentials in settings.'
                    );
                  case 500:
                  case 502:
                  case 503:
                  case 504:
                    throw new ModelError(
                      `Ollama server error: ${response.status} ${response.statusText}`,
                      ModelErrorType.SERVER,
                      'The Ollama server is experiencing issues. Try restarting it with "Adamize Models: Start Ollama Server".'
                    );
                  default:
                    throw new ModelError(
                      `Ollama API error: ${response.status} ${response.statusText}`,
                      ModelErrorType.CONNECTION,
                      'Check that Ollama is running and accessible at the configured URL.'
                    );
                }
              }

              const data = await response.json();

              if (data.status !== 'success') {
                // Handle specific error messages
                const errorMsg = data.error || 'Unknown error';

                if (errorMsg.includes('not found')) {
                  throw new ModelError(
                    `Model "${modelName}" not found in Ollama registry`,
                    ModelErrorType.NOT_FOUND,
                    'Check the model name and try again. Visit https://ollama.com/library to see available models.'
                  );
                } else if (errorMsg.includes('disk space')) {
                  throw new ModelError(
                    `Insufficient disk space to pull model "${modelName}"`,
                    ModelErrorType.DOWNLOAD,
                    'Free up disk space and try again.'
                  );
                } else {
                  throw new ModelError(
                    `Failed to pull model: ${errorMsg}`,
                    ModelErrorType.DOWNLOAD,
                    'Check the Ollama logs for more details.'
                  );
                }
              }

              progress.report({ increment: 100 });
              this.outputChannel.appendLine(`Successfully pulled Ollama model: ${modelName}`);

              // Refresh the model cache
              await this.discoverOllamaModels();
            } catch (error) {
              // Handle fetch errors (network errors)
              if (
                !(error instanceof ModelError) &&
                error instanceof Error &&
                error.message.includes('fetch')
              ) {
                throw new ModelError(
                  `Failed to connect to Ollama server at ${ollamaEndpoint}`,
                  ModelErrorType.CONNECTION,
                  'Check that Ollama is running and accessible. You can start it with "Adamize Models: Start Ollama Server".',
                  error
                );
              }
              throw error;
            }
          }, 'pullOllamaModel');
        } catch (error) {
          // Log the error with recovery suggestion
          if (error instanceof ModelError) {
            const errorMessage = `Error pulling Ollama model: ${error.message}\nRecovery suggestion: ${error.recoverySuggestion}`;
            this.outputChannel.appendLine(errorMessage);

            // Show error message to user with recovery suggestion
            await vscode.window.showErrorMessage(error.getUserFriendlyMessage());
          } else {
            this.outputChannel.appendLine(`Error pulling Ollama model: ${error}`);
            await vscode.window.showErrorMessage(`Error pulling Ollama model: ${error}`);
          }

          throw error;
        }
      }
    );
  }

  /**
   * Check available disk space
   *
   * @private
   * @async
   * @returns {Promise<{free: number, total: number}>} Free and total disk space in bytes
   */
  private async checkDiskSpace(): Promise<{ free: number; total: number }> {
    try {
      const storagePath = this.getStoragePath();

      // Use node's fs.statfs if available, otherwise fallback
      if (fs.statfs) {
        const stats = await fs.promises.statfs(storagePath);
        return {
          free: stats.bfree * stats.bsize,
          total: stats.blocks * stats.bsize,
        };
      } else {
        // Fallback method - get disk usage of the directory
        const stats = await fs.promises.stat(storagePath);
        // This is not accurate but better than nothing
        return {
          free: 1024 * 1024 * 1024 * 10, // Assume 10GB free
          total: 1024 * 1024 * 1024 * 100, // Assume 100GB total
        };
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error checking disk space: ${error}`);
      // Return default values
      return {
        free: 1024 * 1024 * 1024 * 10, // Assume 10GB free
        total: 1024 * 1024 * 1024 * 100, // Assume 100GB total
      };
    }
  }

  /**
   * Format bytes to human-readable string
   *
   * @private
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Remove an Ollama model
   *
   * @async
   * @param {string} modelName - The name of the model to remove
   * @returns {Promise<void>}
   * @implements REQ-MODEL-020 Improve error handling for model operations
   * @implements REQ-MODEL-021 Provide detailed error messages with recovery suggestions
   * @implements REQ-MODEL-022 Add retry mechanisms for transient errors
   */
  public async removeOllamaModel(modelName: string): Promise<void> {
    this.outputChannel.appendLine(`Removing Ollama model: ${modelName}`);

    try {
      await this.executeWithRetry(async () => {
        // Get Ollama endpoint from settings or use default
        const ollamaEndpoint = this.getOllamaEndpoint();

        try {
          // Call Ollama API to delete the model
          const response = await fetch(`${ollamaEndpoint}/api/delete`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: modelName,
            }),
          });

          if (!response.ok) {
            // Handle different error status codes
            switch (response.status) {
              case 404:
                throw new ModelError(
                  `Ollama API endpoint not found: ${ollamaEndpoint}/api/delete`,
                  ModelErrorType.NOT_FOUND,
                  'Check that Ollama is installed and running. You can start it with "Adamize Models: Start Ollama Server".'
                );
              case 401:
              case 403:
                throw new ModelError(
                  'Unauthorized access to Ollama API',
                  ModelErrorType.PERMISSION,
                  'Check your Ollama API credentials in settings.'
                );
              case 500:
              case 502:
              case 503:
              case 504:
                throw new ModelError(
                  `Ollama server error: ${response.status} ${response.statusText}`,
                  ModelErrorType.SERVER,
                  'The Ollama server is experiencing issues. Try restarting it with "Adamize Models: Start Ollama Server".'
                );
              default:
                throw new ModelError(
                  `Ollama API error: ${response.status} ${response.statusText}`,
                  ModelErrorType.CONNECTION,
                  'Check that Ollama is running and accessible at the configured URL.'
                );
            }
          }

          const data = await response.json();

          if (data.status !== 'success') {
            // Handle specific error messages
            const errorMsg = data.error || 'Unknown error';

            if (errorMsg.includes('not found')) {
              throw new ModelError(
                `Model "${modelName}" not found in Ollama`,
                ModelErrorType.NOT_FOUND,
                'Check the model name and try again. The model may have already been removed.'
              );
            } else if (errorMsg.includes('in use')) {
              throw new ModelError(
                `Model "${modelName}" is currently in use and cannot be removed`,
                ModelErrorType.SERVER,
                'Stop any running instances of this model and try again.'
              );
            } else {
              throw new ModelError(
                `Failed to remove model: ${errorMsg}`,
                ModelErrorType.UNKNOWN,
                'Check the Ollama logs for more details.'
              );
            }
          }

          this.outputChannel.appendLine(`Successfully removed Ollama model: ${modelName}`);

          // Remove the model from the cache
          this.modelsCache.delete(modelName);
        } catch (error) {
          // Handle fetch errors (network errors)
          if (
            !(error instanceof ModelError) &&
            error instanceof Error &&
            error.message.includes('fetch')
          ) {
            throw new ModelError(
              `Failed to connect to Ollama server at ${ollamaEndpoint}`,
              ModelErrorType.CONNECTION,
              'Check that Ollama is running and accessible. You can start it with "Adamize Models: Start Ollama Server".',
              error
            );
          }
          throw error;
        }
      }, 'removeOllamaModel');
    } catch (error) {
      // Log the error with recovery suggestion
      if (error instanceof ModelError) {
        const errorMessage = `Error removing Ollama model: ${error.message}\nRecovery suggestion: ${error.recoverySuggestion}`;
        this.outputChannel.appendLine(errorMessage);

        // Show error message to user with recovery suggestion
        vscode.window.showErrorMessage(error.getUserFriendlyMessage());
      } else {
        this.outputChannel.appendLine(`Error removing Ollama model: ${error}`);
        vscode.window.showErrorMessage(`Error removing Ollama model: ${error}`);
      }

      throw error;
    }
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
}

export default ModelManager;
