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
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

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
            provider: 'local'
          });
        }
      }
    }

    // TODO: Add discovery for Ollama models
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
        cancellable: true
      },
      async (progress, token) => {
        try {
          // Download file
          const response = await axios({
            method: 'GET',
            url: modelUrl,
            responseType: 'stream',
            onDownloadProgress: (progressEvent) => {
              // Check if total is defined before using it
              if (progressEvent.total !== undefined) {
                const percentComplete = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                progress.report({
                  message: `${percentComplete}%`,
                  increment: percentComplete
                });
              } else {
                // If total is undefined, just report the loaded bytes
                progress.report({
                  message: `Downloaded ${Math.round(progressEvent.loaded / 1024 / 1024)} MB`,
                  increment: 1
                });
              }
            }
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
            provider: 'downloaded'
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
}

export default ModelManager;
