/**
 * Ollama Client Interface
 * 
 * This module defines the interface for interacting with the Ollama API.
 * 
 * @module ollama/ollamaClient.interface
 * @implements REQ-REFACTOR-001 Extract Ollama API interaction
 */

import { 
  OllamaModel, 
  PullOptions, 
  PullResponse, 
  RemoveResponse, 
  ModelInfoResponse, 
  ServerResponse 
} from './types';

/**
 * Ollama Client Interface
 * 
 * @interface IOllamaClient
 */
export interface IOllamaClient {
  /**
   * List all available models
   * 
   * @returns {Promise<OllamaModel[]>} List of models
   * @throws {ModelError} If the operation fails
   */
  listModels(): Promise<OllamaModel[]>;
  
  /**
   * Pull a model from Ollama
   * 
   * @param {string} modelName - Model name
   * @param {PullOptions} [options] - Pull options
   * @returns {Promise<PullResponse>} Pull response
   * @throws {ModelError} If the operation fails
   */
  pullModel(modelName: string, options?: PullOptions): Promise<PullResponse>;
  
  /**
   * Remove a model from Ollama
   * 
   * @param {string} modelName - Model name
   * @returns {Promise<RemoveResponse>} Remove response
   * @throws {ModelError} If the operation fails
   */
  removeModel(modelName: string): Promise<RemoveResponse>;
  
  /**
   * Get model information
   * 
   * @param {string} modelName - Model name
   * @returns {Promise<ModelInfoResponse>} Model information
   * @throws {ModelError} If the operation fails
   */
  getModelInfo(modelName: string): Promise<ModelInfoResponse>;
  
  /**
   * Start the Ollama server
   * 
   * @returns {Promise<ServerResponse>} Server response
   * @throws {ModelError} If the operation fails
   */
  startServer(): Promise<ServerResponse>;
  
  /**
   * Stop the Ollama server
   * 
   * @returns {Promise<ServerResponse>} Server response
   * @throws {ModelError} If the operation fails
   */
  stopServer(): Promise<ServerResponse>;
  
  /**
   * Get the Ollama endpoint
   * 
   * @returns {string} The Ollama endpoint
   */
  getEndpoint(): string;
}
