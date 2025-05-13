/**
 * Model Management Tool
 * 
 * This module provides an MCP tool for managing LLM models.
 * It allows LLM agents to discover, pull, and remove models.
 * 
 * @module mcp/tools/modelManagementTool
 * @requires vscode
 * @requires modelManager
 * 
 * @implements REQ-MODEL-030 Create a dedicated ModelManagementTool class
 * @implements REQ-MODEL-031 Implement tool methods for model discovery, pulling, and removal
 * @implements REQ-MODEL-032 Add conversation context tracking for models
 */

import * as vscode from 'vscode';
import { MCPTool, IMCPToolSchema, IMCPFunctionCallResult } from '../mcpTypes';
import ModelManager, { IModelInfo } from '../../utils/modelManager';

/**
 * Model Management Tool
 * 
 * @class ModelManagementTool
 * @implements {MCPTool}
 * @implements REQ-MODEL-030 Create a dedicated ModelManagementTool class
 */
export class ModelManagementTool implements MCPTool {
  /** Tool name */
  public readonly name: string = 'model-management';
  
  /** Tool description */
  public readonly description: string = 'Tool for managing LLM models';
  
  /** Tool schema */
  public readonly schema: IMCPToolSchema = {
    name: 'model-management',
    description: 'Tool for managing LLM models',
    version: '1.0.0',
    functions: [
      {
        name: 'listModels',
        description: 'List all available models',
        parameters: [],
        returnType: 'object'
      },
      {
        name: 'getModel',
        description: 'Get details about a specific model',
        parameters: [
          {
            name: 'modelId',
            description: 'Model ID',
            type: 'string',
            required: true
          }
        ],
        returnType: 'object'
      },
      {
        name: 'pullModel',
        description: 'Pull a new model',
        parameters: [
          {
            name: 'modelName',
            description: 'Model name',
            type: 'string',
            required: true
          }
        ],
        returnType: 'object'
      },
      {
        name: 'removeModel',
        description: 'Remove an existing model',
        parameters: [
          {
            name: 'modelName',
            description: 'Model name',
            type: 'string',
            required: true
          }
        ],
        returnType: 'object'
      }
    ]
  };
  
  private modelManager: ModelManager;
  private outputChannel: vscode.OutputChannel;
  private conversationContext: Map<string, any> = new Map();
  
  /**
   * Create a new Model Management Tool
   * @param modelManager Model manager
   * @param outputChannel Output channel
   */
  constructor(modelManager: ModelManager, outputChannel: vscode.OutputChannel) {
    this.modelManager = modelManager;
    this.outputChannel = outputChannel;
  }
  
  /**
   * Execute a function
   * @param functionName Function name
   * @param parameters Function parameters
   * @returns Function result
   * @implements REQ-MODEL-031 Implement tool methods for model discovery, pulling, and removal
   */
  public async execute(functionName: string, parameters: Record<string, unknown>): Promise<IMCPFunctionCallResult> {
    try {
      this.log(`Executing function: ${functionName}`);
      
      switch (functionName) {
        case 'listModels':
          return await this.listModels();
        case 'getModel':
          return await this.getModel(parameters.modelId as string);
        case 'pullModel':
          return await this.pullModel(parameters.modelName as string);
        case 'removeModel':
          return await this.removeModel(parameters.modelName as string);
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    } catch (error) {
      this.log(`Error executing function: ${error instanceof Error ? error.message : String(error)}`);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * List all available models
   * @returns List of models
   * @implements REQ-MODEL-031 Implement tool methods for model discovery, pulling, and removal
   * @implements REQ-MODEL-032 Add conversation context tracking for models
   */
  private async listModels(): Promise<IMCPFunctionCallResult> {
    try {
      const models = await this.modelManager.listModels();
      
      // Store models in conversation context
      this.updateConversationContext('models', models);
      
      return {
        status: 'success',
        result: {
          models: models.map(model => this.formatModelInfo(model))
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get details about a specific model
   * @param modelId Model ID
   * @returns Model details
   * @implements REQ-MODEL-031 Implement tool methods for model discovery, pulling, and removal
   */
  private async getModel(modelId: string): Promise<IMCPFunctionCallResult> {
    try {
      if (!modelId) {
        throw new Error('Model ID is required');
      }
      
      const model = await this.modelManager.getModel(modelId);
      
      if (!model) {
        return {
          status: 'error',
          error: `Model not found: ${modelId}`
        };
      }
      
      return {
        status: 'success',
        result: this.formatModelInfo(model)
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Pull a new model
   * @param modelName Model name
   * @returns Result of the operation
   * @implements REQ-MODEL-031 Implement tool methods for model discovery, pulling, and removal
   */
  private async pullModel(modelName: string): Promise<IMCPFunctionCallResult> {
    try {
      if (!modelName) {
        throw new Error('Model name is required');
      }
      
      await this.modelManager.pullOllamaModel(modelName);
      
      // Refresh models in conversation context
      const models = await this.modelManager.listModels();
      this.updateConversationContext('models', models);
      
      return {
        status: 'success',
        result: {
          message: `Successfully pulled model: ${modelName}`
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Remove an existing model
   * @param modelName Model name
   * @returns Result of the operation
   * @implements REQ-MODEL-031 Implement tool methods for model discovery, pulling, and removal
   */
  private async removeModel(modelName: string): Promise<IMCPFunctionCallResult> {
    try {
      if (!modelName) {
        throw new Error('Model name is required');
      }
      
      await this.modelManager.removeOllamaModel(modelName);
      
      // Refresh models in conversation context
      const models = await this.modelManager.listModels();
      this.updateConversationContext('models', models);
      
      return {
        status: 'success',
        result: {
          message: `Successfully removed model: ${modelName}`
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Format model info for response
   * @param model Model info
   * @returns Formatted model info
   */
  private formatModelInfo(model: IModelInfo): any {
    return {
      id: model.id,
      name: model.name,
      version: model.version,
      size: model.size,
      isLocal: model.isLocal,
      capabilities: model.capabilities,
      provider: model.provider
    };
  }
  
  /**
   * Update conversation context
   * @param key Context key
   * @param value Context value
   * @implements REQ-MODEL-032 Add conversation context tracking for models
   */
  private updateConversationContext(key: string, value: any): void {
    this.conversationContext.set(key, value);
  }
  
  /**
   * Get conversation context
   * @param key Context key
   * @returns Context value
   * @implements REQ-MODEL-032 Add conversation context tracking for models
   */
  public getConversationContext(key: string): any {
    return this.conversationContext.get(key);
  }
  
  /**
   * Log a message
   * @param message Message to log
   */
  private log(message: string): void {
    this.outputChannel.appendLine(`[ModelManagementTool] ${message}`);
  }
}

export default ModelManagementTool;
