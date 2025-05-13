/**
 * @file Integration tests for ModelManager with OllamaClient
 * @description Tests the integration between ModelManager and OllamaClient
 *
 * @requirement REQ-MODEL-INT-001 Test ModelManager integration with OllamaClient
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';
import ModelManager from '../../../utils/modelManager';
import { OllamaClient } from '../../../ollama/ollamaClient';

// Mock the OllamaClient
jest.mock('../../../ollama/ollamaClient');

describe('ModelManager Integration Tests', () => {
  let modelManager: ModelManager;
  let mockOutputChannel: vscode.OutputChannel;
  let mockContext: vscode.ExtensionContext;
  let mockOllamaClient: jest.Mocked<OllamaClient>;
  
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
    
    // Create mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/path',
      globalState: {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        keys: jest.fn().mockReturnValue([])
      } as unknown as vscode.Memento,
      workspaceState: {} as vscode.Memento,
      extensionUri: vscode.Uri.file('/test/path'),
      environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
      asAbsolutePath: jest.fn().mockImplementation(path => `/test/path/${path}`),
      storageUri: vscode.Uri.file('/test/storage'),
      globalStorageUri: vscode.Uri.file('/test/global-storage'),
      logUri: vscode.Uri.file('/test/log'),
      extensionMode: vscode.ExtensionMode.Test,
      extension: {} as vscode.Extension<any>
    } as unknown as vscode.ExtensionContext;
    
    // Create model manager
    modelManager = new ModelManager(mockContext, mockOutputChannel);
    
    // Get the mocked OllamaClient instance
    mockOllamaClient = (OllamaClient as jest.Mock).mock.instances[0] as jest.Mocked<OllamaClient>;
  });
  
  /**
   * @test TEST-MODEL-INT-001a Test that ModelManager correctly discovers Ollama models
   */
  test('should discover Ollama models correctly', async () => {
    // Setup mock response
    mockOllamaClient.listModels.mockResolvedValue([
      {
        name: 'model1',
        modified_at: '2023-01-01T00:00:00Z',
        size: 1000000000,
        details: {
          parameter_size: '7B',
          quantization_level: 'Q4_0'
        }
      },
      {
        name: 'model2',
        modified_at: '2023-01-02T00:00:00Z',
        size: 2000000000,
        details: {
          parameter_size: '13B',
          quantization_level: 'Q4_K_M'
        }
      }
    ]);
    
    // Call the method
    const models = await modelManager.discoverOllamaModels();
    
    // Verify the result
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('model1');
    expect(models[0].name).toBe('model1');
    expect(models[0].version).toBe('2023-01-01');
    expect(models[0].size).toBe(1000000000);
    expect(models[0].provider).toBe('ollama');
    expect(models[0].isLocal).toBe(true);
    expect(models[0].capabilities).toContain('text-generation');
    expect(models[0].details).toEqual({
      parameter_size: '7B',
      quantization_level: 'Q4_0'
    });
    
    expect(models[1].id).toBe('model2');
    expect(models[1].name).toBe('model2');
    expect(models[1].version).toBe('2023-01-02');
    expect(models[1].size).toBe(2000000000);
    
    // Verify that the OllamaClient was called correctly
    expect(mockOllamaClient.listModels).toHaveBeenCalledTimes(1);
  });
  
  /**
   * @test TEST-MODEL-INT-001b Test that ModelManager correctly pulls Ollama models
   */
  test('should pull Ollama models correctly', async () => {
    // Setup mock response
    mockOllamaClient.pullModel.mockResolvedValue(undefined);
    
    // Mock the progress API
    const mockProgress = {
      report: jest.fn()
    };
    
    const mockProgressAPI = jest.spyOn(vscode.window, 'withProgress').mockImplementation(
      async (options, task) => {
        return task(mockProgress, {} as vscode.CancellationToken);
      }
    );
    
    // Call the method
    await modelManager.pullOllamaModel('new-model');
    
    // Verify that the OllamaClient was called correctly
    expect(mockOllamaClient.pullModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaClient.pullModel).toHaveBeenCalledWith('new-model', expect.any(Function));
    
    // Verify that progress was reported
    expect(mockProgress.report).toHaveBeenCalled();
    
    // Restore the mock
    mockProgressAPI.mockRestore();
  });
  
  /**
   * @test TEST-MODEL-INT-001c Test that ModelManager correctly removes Ollama models
   */
  test('should remove Ollama models correctly', async () => {
    // Setup mock response
    mockOllamaClient.deleteModel.mockResolvedValue(undefined);
    
    // Call the method
    await modelManager.removeOllamaModel('model1');
    
    // Verify that the OllamaClient was called correctly
    expect(mockOllamaClient.deleteModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaClient.deleteModel).toHaveBeenCalledWith('model1');
  });
  
  /**
   * @test TEST-MODEL-INT-001d Test that ModelManager handles Ollama API errors correctly
   */
  test('should handle Ollama API errors correctly', async () => {
    // Setup mock response
    mockOllamaClient.listModels.mockRejectedValue(new Error('Connection failed'));
    
    // Call the method and expect it to throw
    await expect(modelManager.discoverOllamaModels()).rejects.toThrow('Connection failed');
    
    // Verify that the error was logged
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('Error discovering Ollama models'));
  });
});
