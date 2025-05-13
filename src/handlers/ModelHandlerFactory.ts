/**
 * Model Handler Factory
 *
 * This module provides a factory for creating model operation handlers.
 *
 * @module handlers/ModelHandlerFactory
 * @requires vscode
 *
 * @implements REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 * @implements IMPL-REFACTOR-002 Implement ModelHandlerFactory
 */

import * as vscode from 'vscode';
import { IModelOperationHandler, ModelProviderType } from './IModelOperationHandler';
import OllamaModelHandler from './OllamaModelHandler';
import LocalModelHandler from './LocalModelHandler';
import { IOllamaClient } from '../ollama/ollamaClient.interface';

/**
 * Model handler factory
 *
 * @class ModelHandlerFactory
 * @implements REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 * @implements IMPL-REFACTOR-002 Implement ModelHandlerFactory
 */
export class ModelHandlerFactory {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private ollamaClient: IOllamaClient;
  private handlers: Map<ModelProviderType, IModelOperationHandler> = new Map();

  /**
   * Creates an instance of ModelHandlerFactory.
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @param {vscode.OutputChannel} outputChannel - Output channel for logging
   * @param {IOllamaClient} ollamaClient - Ollama client
   */
  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel,
    ollamaClient: IOllamaClient
  ) {
    this.context = context;
    this.outputChannel = outputChannel;
    this.ollamaClient = ollamaClient;
  }

  /**
   * Create a handler for the specified provider type
   *
   * @param {ModelProviderType} providerType - Provider type
   * @returns {IModelOperationHandler} Model operation handler
   */
  public createHandler(providerType: ModelProviderType): IModelOperationHandler {
    // Check if handler already exists
    if (this.handlers.has(providerType)) {
      return this.handlers.get(providerType)!;
    }

    // Create new handler
    let handler: IModelOperationHandler;

    switch (providerType) {
      case ModelProviderType.OLLAMA:
        handler = new OllamaModelHandler(this.ollamaClient, this.outputChannel);
        break;
      case ModelProviderType.LOCAL:
        handler = new LocalModelHandler(this.context, this.outputChannel);
        break;
      case ModelProviderType.HUGGINGFACE:
        // TODO: Implement HuggingFace handler
        throw new Error('HuggingFace handler not implemented yet');
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }

    // Cache handler
    this.handlers.set(providerType, handler);

    return handler;
  }

  /**
   * Get all available handlers
   *
   * @returns {IModelOperationHandler[]} Array of all available handlers
   */
  public getAllHandlers(): IModelOperationHandler[] {
    // Create handlers for all provider types
    const handlers: IModelOperationHandler[] = [];

    // Add Ollama handler
    try {
      handlers.push(this.createHandler(ModelProviderType.OLLAMA));
    } catch (error) {
      this.outputChannel.appendLine(`Error creating Ollama handler: ${error}`);
    }

    // Add Local handler
    try {
      handlers.push(this.createHandler(ModelProviderType.LOCAL));
    } catch (error) {
      this.outputChannel.appendLine(`Error creating Local handler: ${error}`);
    }

    // TODO: Add HuggingFace handler when implemented

    return handlers;
  }
}

export default ModelHandlerFactory;
