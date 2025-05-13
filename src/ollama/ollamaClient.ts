/**
 * Ollama Client
 *
 * This module provides a client for interacting with the Ollama API.
 *
 * @module ollama/ollamaClient
 * @implements REQ-REFACTOR-001 Extract Ollama API interaction
 * @implements IMPL-REFACTOR-001 Implement Ollama Client
 */

import { ChildProcess, exec } from 'child_process';
import * as vscode from 'vscode';
import { ModelError, ModelErrorType } from '../utils/modelError';
import { IOllamaClient } from './ollamaClient.interface';
import {
  ListModelsResponse,
  ModelInfoResponse,
  OllamaModel,
  PullOptions,
  PullResponse,
  RemoveResponse,
  ServerResponse,
} from './types';

/**
 * Ollama Client
 *
 * @class OllamaClient
 * @implements {IOllamaClient}
 */
export class OllamaClient implements IOllamaClient {
  private endpoint: string;
  private outputChannel: vscode.OutputChannel;
  private ollamaProcess: ChildProcess | null = null;

  /** Maximum number of retries for operations */
  private static readonly MAX_RETRIES = 3;
  /** Delay between retries in milliseconds */
  private static readonly RETRY_DELAY = 1000;

  /**
   * Creates an instance of OllamaClient.
   *
   * @param {string} endpoint - Ollama API endpoint
   * @param {vscode.OutputChannel} outputChannel - Output channel for logging
   */
  constructor(endpoint: string, outputChannel: vscode.OutputChannel) {
    this.endpoint = endpoint;
    this.outputChannel = outputChannel;
  }

  /**
   * Execute an operation with retry logic
   *
   * @private
   * @template T
   * @param {() => Promise<T>} operation - The operation to execute
   * @param {string} operationName - The name of the operation for logging
   * @param {number} [maxRetries=OllamaClient.MAX_RETRIES] - Maximum number of retries
   * @param {number} [delay=OllamaClient.RETRY_DELAY] - Delay between retries in milliseconds
   * @returns {Promise<T>} The result of the operation
   * @throws {ModelError} If the operation fails after all retries
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = OllamaClient.MAX_RETRIES,
    delay: number = OllamaClient.RETRY_DELAY
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
   * Get the Ollama endpoint
   *
   * @returns {string} The Ollama endpoint
   */
  public getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * List all available models
   *
   * @returns {Promise<OllamaModel[]>} List of models
   * @throws {ModelError} If the operation fails
   */
  public async listModels(): Promise<OllamaModel[]> {
    this.outputChannel.appendLine('Listing Ollama models...');

    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${this.endpoint}/api/tags`, {
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
                `Ollama API endpoint not found: ${this.endpoint}/api/tags`,
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

        const data = (await response.json()) as ListModelsResponse;

        if (!data.models || !Array.isArray(data.models)) {
          this.outputChannel.appendLine('No Ollama models found or invalid response format');
          return [];
        }

        this.outputChannel.appendLine(`Found ${data.models.length} Ollama models`);
        return data.models;
      } catch (error) {
        // Handle fetch errors (network errors)
        if (
          !(error instanceof ModelError) &&
          error instanceof Error &&
          error.message.includes('fetch')
        ) {
          throw new ModelError(
            `Failed to connect to Ollama server at ${this.endpoint}`,
            ModelErrorType.CONNECTION,
            'Check that Ollama is running and accessible. You can start it with "Adamize Models: Start Ollama Server".',
            error
          );
        }
        throw error;
      }
    }, 'listModels');
  }

  /**
   * Pull a model from Ollama
   *
   * @param {string} modelName - Model name
   * @param {PullOptions} [options] - Pull options
   * @returns {Promise<PullResponse>} Pull response
   * @throws {ModelError} If the operation fails
   */
  public async pullModel(modelName: string, options?: PullOptions): Promise<PullResponse> {
    this.outputChannel.appendLine(`Pulling Ollama model: ${modelName}`);

    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${this.endpoint}/api/pull`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: modelName,
            stream: options?.stream || false,
            insecure: options?.insecure || false,
          }),
        });

        if (!response.ok) {
          // Handle different error status codes
          switch (response.status) {
            case 404:
              throw new ModelError(
                `Ollama API endpoint not found: ${this.endpoint}/api/pull`,
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

        const data = (await response.json()) as PullResponse;

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

        this.outputChannel.appendLine(`Successfully pulled Ollama model: ${modelName}`);
        return data;
      } catch (error) {
        // Handle fetch errors (network errors)
        if (
          !(error instanceof ModelError) &&
          error instanceof Error &&
          error.message.includes('fetch')
        ) {
          throw new ModelError(
            `Failed to connect to Ollama server at ${this.endpoint}`,
            ModelErrorType.CONNECTION,
            'Check that Ollama is running and accessible. You can start it with "Adamize Models: Start Ollama Server".',
            error
          );
        }
        throw error;
      }
    }, 'pullModel');
  }

  /**
   * Remove a model from Ollama
   *
   * @param {string} modelName - Model name
   * @returns {Promise<RemoveResponse>} Remove response
   * @throws {ModelError} If the operation fails
   */
  public async removeModel(modelName: string): Promise<RemoveResponse> {
    this.outputChannel.appendLine(`Removing Ollama model: ${modelName}`);

    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${this.endpoint}/api/delete`, {
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
                `Ollama API endpoint not found: ${this.endpoint}/api/delete`,
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

        const data = (await response.json()) as RemoveResponse;

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
        return data;
      } catch (error) {
        // Handle fetch errors (network errors)
        if (
          !(error instanceof ModelError) &&
          error instanceof Error &&
          error.message.includes('fetch')
        ) {
          throw new ModelError(
            `Failed to connect to Ollama server at ${this.endpoint}`,
            ModelErrorType.CONNECTION,
            'Check that Ollama is running and accessible. You can start it with "Adamize Models: Start Ollama Server".',
            error
          );
        }
        throw error;
      }
    }, 'removeModel');
  }

  /**
   * Get model information
   *
   * @param {string} modelName - Model name
   * @returns {Promise<ModelInfoResponse>} Model information
   * @throws {ModelError} If the operation fails
   */
  public async getModelInfo(modelName: string): Promise<ModelInfoResponse> {
    this.outputChannel.appendLine(`Getting info for Ollama model: ${modelName}`);

    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${this.endpoint}/api/show`, {
          method: 'POST',
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
                `Ollama API endpoint not found: ${this.endpoint}/api/show`,
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

        const data = (await response.json()) as ModelInfoResponse;
        return data;
      } catch (error) {
        // Handle fetch errors (network errors)
        if (
          !(error instanceof ModelError) &&
          error instanceof Error &&
          error.message.includes('fetch')
        ) {
          throw new ModelError(
            `Failed to connect to Ollama server at ${this.endpoint}`,
            ModelErrorType.CONNECTION,
            'Check that Ollama is running and accessible. You can start it with "Adamize Models: Start Ollama Server".',
            error
          );
        }
        throw error;
      }
    }, 'getModelInfo');
  }

  /**
   * Start the Ollama server
   *
   * @returns {Promise<ServerResponse>} Server response
   * @throws {ModelError} If the operation fails
   */
  public async startServer(): Promise<ServerResponse> {
    this.outputChannel.appendLine('Starting Ollama server...');

    // Check if server is already running
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        this.outputChannel.appendLine('Ollama server is already running');
        return { status: 'success' };
      }
    } catch (error) {
      // Server is not running, continue with startup
      this.outputChannel.appendLine('Ollama server is not running, starting it...');
    }

    // Start Ollama
    if (!this.ollamaProcess) {
      this.ollamaProcess = exec('ollama serve', { windowsHide: true });

      this.ollamaProcess.stdout?.on('data', data => {
        this.outputChannel.appendLine(`Ollama stdout: ${data.toString()}`);
      });

      this.ollamaProcess.stderr?.on('data', data => {
        this.outputChannel.appendLine(`Ollama stderr: ${data.toString()}`);
      });

      this.ollamaProcess.on('error', error => {
        this.outputChannel.appendLine(`Error starting Ollama: ${error.message}`);
      });

      this.ollamaProcess.on('exit', code => {
        this.outputChannel.appendLine(`Ollama process exited with code ${code}`);
        this.ollamaProcess = null;
      });

      // Wait for Ollama to start
      for (let i = 0; i < 10; i++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const response = await fetch(`${this.endpoint}/api/tags`);
          if (response.ok) {
            this.outputChannel.appendLine('Ollama server is ready');
            return { status: 'success' };
          }
        } catch (error) {
          this.outputChannel.appendLine(`Waiting for Ollama server... attempt ${i + 1}`);
        }
      }

      throw new ModelError(
        'Failed to start Ollama server',
        ModelErrorType.SERVER,
        'Check that Ollama is installed correctly and try again.'
      );
    }

    return { status: 'success' };
  }

  /**
   * Stop the Ollama server
   *
   * @returns {Promise<ServerResponse>} Server response
   * @throws {ModelError} If the operation fails
   */
  public async stopServer(): Promise<ServerResponse> {
    this.outputChannel.appendLine('Stopping Ollama server...');

    if (this.ollamaProcess) {
      this.ollamaProcess.kill();
      this.ollamaProcess = null;
      this.outputChannel.appendLine('Ollama server stopped');
      return { status: 'success' };
    } else {
      // Try to find and kill the Ollama process
      try {
        if (process.platform === 'win32') {
          exec('taskkill /f /im ollama.exe');
        } else {
          exec('pkill -f ollama');
        }
        this.outputChannel.appendLine('Ollama server stopped');
        return { status: 'success' };
      } catch (error) {
        throw new ModelError(
          'Failed to stop Ollama server',
          ModelErrorType.SERVER,
          'Try stopping the Ollama server manually.',
          error instanceof Error ? error : undefined
        );
      }
    }
  }
}
