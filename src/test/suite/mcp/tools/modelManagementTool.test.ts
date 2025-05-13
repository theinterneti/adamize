/**
 * @file Test suite for Model Management Tool
 * @description Tests for the Model Management Tool component
 *
 * @requirement REQ-MODEL-030 Create a dedicated ModelManagementTool class
 * @requirement REQ-MODEL-031 Implement tool methods for model discovery, pulling, and removal
 * @requirement REQ-MODEL-032 Add conversation context tracking for models
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';
import { ModelManagementTool } from '../../../../mcp/tools/modelManagementTool';
import ModelManager, { IModelInfo } from '../../../../utils/modelManager';

// Mock the ModelManager
jest.mock('../../../../utils/modelManager');

describe('ModelManagementTool', () => {
  let modelManagementTool: ModelManagementTool;
  let mockModelManager: jest.Mocked<ModelManager>;
  let mockOutputChannel: vscode.OutputChannel;
  
  // Sample model data for testing
  const sampleModels: IModelInfo[] = [
    {
      id: 'model1',
      name: 'model1',
      version: '1.0.0',
      size: 1000,
      isLocal: true,
      capabilities: ['text-generation'],
      provider: 'ollama'
    },
    {
      id: 'model2',
      name: 'model2',
      version: '1.0.0',
      size: 2000,
      isLocal: true,
      capabilities: ['text-generation'],
      provider: 'ollama'
    }
  ];
  
  beforeEach(() => {
    // Create mock output channel
    mockOutputChannel = {
      name: 'Test Output Channel',
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    };
    
    // Create mock model manager
    mockModelManager = new ModelManager({} as vscode.ExtensionContext, mockOutputChannel) as jest.Mocked<ModelManager>;
    
    // Create model management tool
    modelManagementTool = new ModelManagementTool(mockModelManager, mockOutputChannel);
  });
  
  /**
   * @test TEST-MODEL-030 Test that the tool has the correct name and description
   */
  test('should have the correct name and description', () => {
    expect(modelManagementTool.name).toBe('model-management');
    expect(modelManagementTool.description).toBe('Tool for managing LLM models');
  });
  
  /**
   * @test TEST-MODEL-031a Test that the tool schema has the correct functions
   */
  test('should have the correct schema with functions', () => {
    expect(modelManagementTool.schema.name).toBe('model-management');
    expect(modelManagementTool.schema.version).toBe('1.0.0');
    expect(modelManagementTool.schema.functions).toHaveLength(4);
    
    // Check function names
    const functionNames = modelManagementTool.schema.functions.map(f => f.name);
    expect(functionNames).toContain('listModels');
    expect(functionNames).toContain('getModel');
    expect(functionNames).toContain('pullModel');
    expect(functionNames).toContain('removeModel');
  });
  
  /**
   * @test TEST-MODEL-031b Test that the listModels function returns the correct result
   */
  test('should list models correctly', async () => {
    // Setup mock
    mockModelManager.listModels = jest.fn().mockResolvedValue(sampleModels);
    
    // Execute function
    const result = await modelManagementTool.execute('listModels', {});
    
    // Verify result
    expect(result.status).toBe('success');
    expect(result.result).toHaveProperty('models');
    expect(Array.isArray(result.result.models)).toBe(true);
    expect(result.result.models).toHaveLength(2);
    expect(result.result.models[0].id).toBe('model1');
    expect(result.result.models[1].id).toBe('model2');
    
    // Verify mock was called
    expect(mockModelManager.listModels).toHaveBeenCalledTimes(1);
  });
  
  /**
   * @test TEST-MODEL-031c Test that the getModel function returns the correct result
   */
  test('should get model details correctly', async () => {
    // Setup mock
    mockModelManager.getModel = jest.fn().mockResolvedValue(sampleModels[0]);
    
    // Execute function
    const result = await modelManagementTool.execute('getModel', { modelId: 'model1' });
    
    // Verify result
    expect(result.status).toBe('success');
    expect(result.result).toHaveProperty('id', 'model1');
    expect(result.result).toHaveProperty('name', 'model1');
    expect(result.result).toHaveProperty('version', '1.0.0');
    
    // Verify mock was called
    expect(mockModelManager.getModel).toHaveBeenCalledTimes(1);
    expect(mockModelManager.getModel).toHaveBeenCalledWith('model1');
  });
  
  /**
   * @test TEST-MODEL-031d Test that the getModel function handles errors correctly
   */
  test('should handle errors when getting model details', async () => {
    // Setup mock
    mockModelManager.getModel = jest.fn().mockResolvedValue(null);
    
    // Execute function
    const result = await modelManagementTool.execute('getModel', { modelId: 'nonexistent' });
    
    // Verify result
    expect(result.status).toBe('error');
    expect(result.error).toContain('not found');
    
    // Verify mock was called
    expect(mockModelManager.getModel).toHaveBeenCalledTimes(1);
    expect(mockModelManager.getModel).toHaveBeenCalledWith('nonexistent');
  });
  
  /**
   * @test TEST-MODEL-031e Test that the pullModel function works correctly
   */
  test('should pull model correctly', async () => {
    // Setup mocks
    mockModelManager.pullOllamaModel = jest.fn().mockResolvedValue(undefined);
    mockModelManager.listModels = jest.fn().mockResolvedValue(sampleModels);
    
    // Execute function
    const result = await modelManagementTool.execute('pullModel', { modelName: 'new-model' });
    
    // Verify result
    expect(result.status).toBe('success');
    expect(result.result).toHaveProperty('message');
    expect(result.result.message).toContain('Successfully pulled model');
    
    // Verify mocks were called
    expect(mockModelManager.pullOllamaModel).toHaveBeenCalledTimes(1);
    expect(mockModelManager.pullOllamaModel).toHaveBeenCalledWith('new-model');
    expect(mockModelManager.listModels).toHaveBeenCalledTimes(1);
  });
  
  /**
   * @test TEST-MODEL-031f Test that the removeModel function works correctly
   */
  test('should remove model correctly', async () => {
    // Setup mocks
    mockModelManager.removeOllamaModel = jest.fn().mockResolvedValue(undefined);
    mockModelManager.listModels = jest.fn().mockResolvedValue(sampleModels.slice(0, 1));
    
    // Execute function
    const result = await modelManagementTool.execute('removeModel', { modelName: 'model2' });
    
    // Verify result
    expect(result.status).toBe('success');
    expect(result.result).toHaveProperty('message');
    expect(result.result.message).toContain('Successfully removed model');
    
    // Verify mocks were called
    expect(mockModelManager.removeOllamaModel).toHaveBeenCalledTimes(1);
    expect(mockModelManager.removeOllamaModel).toHaveBeenCalledWith('model2');
    expect(mockModelManager.listModels).toHaveBeenCalledTimes(1);
  });
  
  /**
   * @test TEST-MODEL-032 Test that the tool maintains conversation context
   */
  test('should maintain conversation context', async () => {
    // Setup mock
    mockModelManager.listModels = jest.fn().mockResolvedValue(sampleModels);
    
    // Execute function
    await modelManagementTool.execute('listModels', {});
    
    // Verify conversation context
    const context = modelManagementTool.getConversationContext('models');
    expect(context).toBeDefined();
    expect(Array.isArray(context)).toBe(true);
    expect(context).toHaveLength(2);
    expect(context[0].id).toBe('model1');
    expect(context[1].id).toBe('model2');
  });
  
  /**
   * @test TEST-MODEL-031g Test that the tool handles unknown functions
   */
  test('should handle unknown functions', async () => {
    // Execute function
    const result = await modelManagementTool.execute('unknownFunction', {});
    
    // Verify result
    expect(result.status).toBe('error');
    expect(result.error).toContain('Unknown function');
  });
});
