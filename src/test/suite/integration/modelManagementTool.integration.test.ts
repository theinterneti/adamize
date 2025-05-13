/**
 * @file Integration tests for ModelManagementTool with MCP Bridge
 * @description Tests the integration between ModelManagementTool and MCP Bridge
 *
 * @requirement REQ-MODEL-INT-003 Test ModelManagementTool integration with MCP Bridge
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';
import { ModelManagementTool } from '../../../mcp/tools/modelManagementTool';
import ModelManager, { IModelInfo } from '../../../utils/modelManager';
import { MCPBridge } from '../../../mcp/bridge/mcpBridge';
import { MCPToolRegistry } from '../../../mcp/bridge/toolRegistry';
import { VSCodeLogger } from '../../../mcp/bridge/vscodeLogger';
import { LLMProvider } from '../../../types/llmTypes';

// Mock the ModelManager
jest.mock('../../../utils/modelManager');

// Mock the MCPBridge
jest.mock('../../../mcp/bridge/mcpBridge');

describe('ModelManagementTool Integration Tests', () => {
  let modelManagementTool: ModelManagementTool;
  let mockModelManager: jest.Mocked<ModelManager>;
  let mockOutputChannel: vscode.OutputChannel;
  let mockMCPBridge: jest.Mocked<MCPBridge>;
  let mockToolRegistry: MCPToolRegistry;
  let mockLogger: VSCodeLogger;
  
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
      name: 'Adamize',
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    } as unknown as jest.Mocked<vscode.OutputChannel>;
    
    // Create mock model manager
    mockModelManager = new ModelManager({} as vscode.ExtensionContext, mockOutputChannel) as jest.Mocked<ModelManager>;
    mockModelManager.listModels = jest.fn().mockResolvedValue(sampleModels);
    mockModelManager.getModel = jest.fn().mockImplementation((id) => {
      return Promise.resolve(sampleModels.find(model => model.id === id));
    });
    mockModelManager.pullOllamaModel = jest.fn().mockResolvedValue(undefined);
    mockModelManager.removeOllamaModel = jest.fn().mockResolvedValue(undefined);
    
    // Create mock logger
    mockLogger = new VSCodeLogger(mockOutputChannel);
    
    // Create mock tool registry
    mockToolRegistry = new MCPToolRegistry(mockOutputChannel);
    
    // Create mock MCP bridge
    mockMCPBridge = new MCPBridge({
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions',
      systemPrompt: 'You are a helpful assistant.'
    }, mockOutputChannel) as jest.Mocked<MCPBridge>;
    
    // Create model management tool
    modelManagementTool = new ModelManagementTool(mockModelManager, mockOutputChannel);
  });
  
  /**
   * @test TEST-MODEL-INT-003a Test that the tool registers with the MCP Bridge correctly
   */
  test('should register with MCP Bridge correctly', () => {
    // Register the tool
    mockToolRegistry.registerTool(modelManagementTool);
    
    // Verify that the tool was registered
    expect(mockToolRegistry.getTools()).toContain(modelManagementTool);
    expect(mockToolRegistry.getToolByName('model-management')).toBe(modelManagementTool);
  });
  
  /**
   * @test TEST-MODEL-INT-003b Test that the tool can be called through the MCP Bridge
   */
  test('should be callable through MCP Bridge', async () => {
    // Register the tool
    mockToolRegistry.registerTool(modelManagementTool);
    
    // Set up the bridge to use our tool registry
    (mockMCPBridge as any).toolRegistry = mockToolRegistry;
    
    // Call the tool through the bridge
    const result = await mockMCPBridge.callTool('model-management', 'listModels', {});
    
    // Verify the result
    expect(result).toHaveProperty('status', 'success');
    expect(result).toHaveProperty('result.models');
    expect(Array.isArray(result.result.models)).toBe(true);
    expect(result.result.models).toHaveLength(2);
    
    // Verify that the model manager was called
    expect(mockModelManager.listModels).toHaveBeenCalledTimes(1);
  });
  
  /**
   * @test TEST-MODEL-INT-003c Test that the tool updates conversation context correctly
   */
  test('should update conversation context correctly', async () => {
    // Mock the updateConversationContext method
    const updateContextSpy = jest.spyOn(modelManagementTool as any, 'updateConversationContext');
    
    // Call the tool
    await modelManagementTool.execute('listModels', {});
    
    // Verify that updateConversationContext was called
    expect(updateContextSpy).toHaveBeenCalledWith('models', expect.any(Array));
    expect(updateContextSpy).toHaveBeenCalledTimes(1);
    
    // Call the tool again with a different function
    await modelManagementTool.execute('pullModel', { modelName: 'new-model' });
    
    // Verify that updateConversationContext was called again
    expect(updateContextSpy).toHaveBeenCalledTimes(2);
    
    // Restore the spy
    updateContextSpy.mockRestore();
  });
});
