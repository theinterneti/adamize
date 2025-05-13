/**
 * Model Manager Refactored Tests
 * 
 * Tests for the refactored Model Manager class.
 * 
 * @implements TEST-REFACTOR-002 Test refactored ModelManager
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as vscode from 'vscode';
import { ModelManager } from '../../../utils/modelManager.refactored';
import { OllamaClient } from '../../../ollama/ollamaClient';
import { ModelError, ModelErrorType } from '../../../utils/modelError';

// Mock OllamaClient
jest.mock('../../../ollama/ollamaClient');

describe('Refactored Model Manager', () => {
  let modelManager: ModelManager;
  let mockOutputChannel: vscode.OutputChannel;
  let mockExtensionContext: vscode.ExtensionContext;
  let mockOllamaClient: jest.Mocked<OllamaClient>;

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();

    // Create mock output channel
    mockOutputChannel = {
      appendLine: jest.fn(),
      append: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      name: 'Test Output Channel',
      replace: jest.fn(),
    } as unknown as vscode.OutputChannel;

    // Create mock extension context
    mockExtensionContext = {
      subscriptions: [],
      extensionPath: '/test/extension/path',
      globalStorageUri: { fsPath: '/test/global/storage/path' },
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      extensionUri: { fsPath: '/test/extension/path' },
      environmentVariableCollection: {} as any,
      asAbsolutePath: (relativePath: string) => `/test/extension/path/${relativePath}`,
      storageUri: { fsPath: '/test/storage/path' },
      logUri: { fsPath: '/test/log/path' },
      extensionMode: 1, // Use 1 for Development mode
      logPath: '/test/log/path',
    } as unknown as vscode.ExtensionContext;

    // Mock OllamaClient
    mockOllamaClient = new OllamaClient('http://localhost:11434', mockOutputChannel) as jest.Mocked<OllamaClient>;
    (OllamaClient as jest.Mock).mockImplementation(() => mockOllamaClient);

    // Create model manager
    modelManager = new ModelManager(mockExtensionContext, mockOutputChannel);
  });

  /**
   * Test that the manager can discover Ollama models
   */
  test('should discover Ollama models', async () => {
    // Mock OllamaClient.listModels to return a list of models
    mockOllamaClient.listModels.mockResolvedValue([
      {
        name: 'llama3',
        modified_at: '2023-01-01T00:00:00Z',
        size: 4000000000,
        digest: 'sha256:1234567890',
        details: {
          format: 'gguf',
          family: 'llama',
          families: ['llama'],
          parameter_size: '8B',
          quantization_level: 'Q4_0',
        },
      },
      {
        name: 'codellama',
        modified_at: '2023-01-01T00:00:00Z',
        size: 5000000000,
        digest: 'sha256:0987654321',
        details: {
          format: 'gguf',
          family: 'llama',
          families: ['llama'],
          parameter_size: '7B',
          quantization_level: 'Q4_0',
        },
      },
    ]);

    // Call discoverOllamaModels
    const models = await modelManager.discoverOllamaModels();

    // Check that OllamaClient.listModels was called
    expect(mockOllamaClient.listModels).toHaveBeenCalled();

    // Check that the models were returned correctly
    expect(models).toHaveLength(2);
    expect(models[0].name).toBe('llama3');
    expect(models[1].name).toBe('codellama');
  });

  /**
   * Test that the manager can pull Ollama models
   */
  test('should pull Ollama models', async () => {
    // Mock OllamaClient.pullModel to return a successful pull
    mockOllamaClient.pullModel.mockResolvedValue({
      status: 'success',
    });

    // Mock window.withProgress
    vscode.window.withProgress = jest.fn().mockImplementation((options, task) => {
      // Create a mock progress
      const mockProgress = {
        report: jest.fn(),
      };

      // Create a mock token
      const mockToken = {
        isCancellationRequested: false,
        onCancellationRequested: jest.fn(),
      };

      // Execute the task and return the promise
      return task(mockProgress, mockToken);
    });

    // Call pullOllamaModel
    await modelManager.pullOllamaModel('llama3');

    // Check that OllamaClient.pullModel was called with the correct parameters
    expect(mockOllamaClient.pullModel).toHaveBeenCalledWith('llama3', expect.any(Object));
  });

  /**
   * Test that the manager can remove Ollama models
   */
  test('should remove Ollama models', async () => {
    // Mock OllamaClient.removeModel to return a successful removal
    mockOllamaClient.removeModel.mockResolvedValue({
      status: 'success',
    });

    // Call removeOllamaModel
    await modelManager.removeOllamaModel('llama3');

    // Check that OllamaClient.removeModel was called with the correct parameters
    expect(mockOllamaClient.removeModel).toHaveBeenCalledWith('llama3');
  });
});
