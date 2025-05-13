/**
 * Model Manager Ollama Tests
 *
 * Tests for the Model Manager Ollama integration.
 *
 * Requirements being tested:
 * - REQ-OLLAMA-013: Add model management features (pulling, removing models)
 *
 * Test tags:
 * - TEST-OLLAMA-013-001: Test that the manager can discover Ollama models
 * - TEST-OLLAMA-013-002: Test that the manager can pull Ollama models
 * - TEST-OLLAMA-013-003: Test that the manager can remove Ollama models
 * - TEST-OLLAMA-013-004: Test that the manager handles Ollama API errors gracefully
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as vscode from 'vscode';
import { ModelManager } from '../../../utils/modelManager';

// Mock fetch
global.fetch = jest.fn();

describe('Model Manager Ollama Integration', () => {
  let modelManager: ModelManager;
  let mockOutputChannel: vscode.OutputChannel;
  let mockExtensionContext: vscode.ExtensionContext;

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

    // Create model manager
    modelManager = new ModelManager(mockExtensionContext, mockOutputChannel);
  });

  /**
   * @test TEST-OLLAMA-013-001: Test that the manager can discover Ollama models
   */
  test('should discover Ollama models', async () => {
    // Mock fetch to return a list of models
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [
          {
            name: 'llama3',
            model: 'llama3',
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
            model: 'codellama',
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
        ],
      }),
    });

    // Call discoverOllamaModels
    const models = await modelManager.discoverOllamaModels();

    // Check that fetch was called with the correct URL
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.any(Object)
    );

    // Check that the models were returned correctly
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('llama3');
    expect(models[0].name).toBe('llama3');
    expect(models[0].provider).toBe('ollama');
    expect(models[0].isLocal).toBe(true);
    expect(models[1].id).toBe('codellama');
    expect(models[1].name).toBe('codellama');
    expect(models[1].provider).toBe('ollama');
    expect(models[1].isLocal).toBe(true);
  });

  /**
   * @test TEST-OLLAMA-013-002: Test that the manager can pull Ollama models
   */
  test('should pull Ollama models', async () => {
    // Mock fetch to return a successful pull
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
      }),
    });

    // Create a mock progress
    const mockProgress = {
      report: jest.fn(),
    };

    // Create a mock token
    const mockToken = {
      isCancellationRequested: false,
      onCancellationRequested: jest.fn(),
    };

    // Mock window.withProgress
    vscode.window.withProgress = jest.fn().mockImplementation((options, task) => {
      return task(mockProgress, mockToken);
    });

    // Call pullOllamaModel
    await modelManager.pullOllamaModel('llama3');

    // Check that fetch was called with the correct URL and body
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/pull',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'llama3',
          stream: false,
        }),
      })
    );

    // Check that the progress was reported
    expect(mockProgress.report).toHaveBeenCalled();
  });

  /**
   * @test TEST-OLLAMA-013-003: Test that the manager can remove Ollama models
   */
  test('should remove Ollama models', async () => {
    // Mock fetch to return a successful deletion
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
      }),
    });

    // Call removeOllamaModel
    await modelManager.removeOllamaModel('llama3');

    // Check that fetch was called with the correct URL and body
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/delete',
      expect.objectContaining({
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'llama3',
        }),
      })
    );
  });

  /**
   * @test TEST-OLLAMA-013-004: Test that the manager handles Ollama API errors gracefully
   */
  test('should handle Ollama API errors gracefully', async () => {
    // Mock fetch to return an error
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    // Call discoverOllamaModels and expect it to return an empty array
    const models = await modelManager.discoverOllamaModels();
    expect(models).toEqual([]);

    // For pullOllamaModel, we need to mock withProgress to make the test work
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

    // Now test pullOllamaModel
    try {
      await modelManager.pullOllamaModel('llama3');
      // If we get here, the test should fail
      expect('This should not be reached').toBe('The function should have thrown');
    } catch (error) {
      expect(error.message).toContain('Ollama API endpoint not found');
    }

    // Test removeOllamaModel
    try {
      await modelManager.removeOllamaModel('llama3');
      // If we get here, the test should fail
      expect('This should not be reached').toBe('The function should have thrown');
    } catch (error) {
      expect(error.message).toContain('Ollama API endpoint not found');
    }
  });
});
