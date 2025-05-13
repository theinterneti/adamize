/**
 * @file Integration tests for ModelManager with OllamaClient
 * @description Tests the integration between ModelManager and OllamaClient
 *
 * @requirement REQ-MODEL-INT-001 Test ModelManager integration with OllamaClient
 */

import { expect } from '@jest/globals';
import * as vscode from 'vscode';
import ModelManager from '../../../utils/modelManager';

// Mock fetch
global.fetch = jest.fn();

describe('ModelManager Integration Tests', () => {
  let modelManager: ModelManager;
  let mockOutputChannel: vscode.OutputChannel;
  let mockContext: vscode.ExtensionContext;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    // Create mock output channel
    mockOutputChannel = {
      name: 'Adamize',
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    } as unknown as jest.Mocked<vscode.OutputChannel>;

    // Create mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/path',
      globalState: {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        keys: jest.fn().mockReturnValue([]),
      } as unknown as vscode.Memento,
      workspaceState: {} as vscode.Memento,
      extensionUri: vscode.Uri.file('/test/path'),
      environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
      asAbsolutePath: jest.fn().mockImplementation(path => `/test/path/${path}`),
      storageUri: vscode.Uri.file('/test/storage'),
      globalStorageUri: vscode.Uri.file('/test/global-storage'),
      logUri: vscode.Uri.file('/test/log'),
      extensionMode: 1, // 1 corresponds to ExtensionMode.Test
      extension: {} as vscode.Extension<any>,
    } as unknown as vscode.ExtensionContext;

    // Reset and mock fetch
    mockFetch = global.fetch as jest.Mock;
    mockFetch.mockReset();

    // Create model manager
    modelManager = new ModelManager(mockContext, mockOutputChannel);
  });

  /**
   * @test TEST-MODEL-INT-001a Test that ModelManager correctly discovers Ollama models
   */
  test('should discover Ollama models correctly', async () => {
    // Setup mock response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [
          {
            name: 'model1',
            modified_at: '2023-01-01T00:00:00Z',
            size: 1000000000,
            details: {
              parameter_size: '7B',
              quantization_level: 'Q4_0',
            },
          },
          {
            name: 'model2',
            modified_at: '2023-01-02T00:00:00Z',
            size: 2000000000,
            details: {
              parameter_size: '13B',
              quantization_level: 'Q4_K_M',
            },
          },
        ],
      }),
    });

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
      quantization_level: 'Q4_0',
    });

    expect(models[1].id).toBe('model2');
    expect(models[1].name).toBe('model2');
    expect(models[1].version).toBe('2023-01-02');
    expect(models[1].size).toBe(2000000000);

    // Verify that fetch was called with the correct URL
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags', expect.any(Object));
  });

  /**
   * @test TEST-MODEL-INT-001b Test that ModelManager correctly pulls Ollama models
   */
  test('should pull Ollama models correctly', async () => {
    // Setup mock response for successful pull
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
      }),
    });

    // Mock the progress API
    const mockProgress = {
      report: jest.fn(),
    };

    // Mock the window.withProgress method
    const mockWithProgress = jest.fn().mockImplementation(async (options, task) => {
      return task(mockProgress, {} as vscode.CancellationToken);
    });

    // @ts-ignore - Mock the window.withProgress method
    vscode.window.withProgress = mockWithProgress;

    // Mock the checkDiskSpace method (private method)
    jest.spyOn(modelManager as any, 'checkDiskSpace').mockResolvedValue({
      free: 10 * 1024 * 1024 * 1024, // 10GB free
      total: 100 * 1024 * 1024 * 1024, // 100GB total
    });

    // Setup mock response for model discovery after pull
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [
          {
            name: 'new-model',
            modified_at: '2023-01-01T00:00:00Z',
            size: 1000000000,
          },
        ],
      }),
    });

    // Call the method
    await modelManager.pullOllamaModel('new-model');

    // Verify that fetch was called with the correct URL and body
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'new-model',
        stream: false,
      }),
    });

    // Verify that progress was reported
    expect(mockProgress.report).toHaveBeenCalled();

    // No need to restore the mock as it's not a spy
  });

  /**
   * @test TEST-MODEL-INT-001c Test that ModelManager correctly removes Ollama models
   */
  test('should remove Ollama models correctly', async () => {
    // Setup mock response for successful delete
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
      }),
    });

    // Call the method
    await modelManager.removeOllamaModel('model1');

    // Verify that fetch was called with the correct URL and body
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'model1',
      }),
    });
  });

  /**
   * @test TEST-MODEL-INT-001d Test that ModelManager handles Ollama API errors correctly
   */
  test('should handle Ollama API errors correctly', async () => {
    // Setup mock response for a network error
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch: Connection failed'));

    // Call the method and expect it to return an empty array (error handling)
    const models = await modelManager.discoverOllamaModels();

    // Verify that the result is an empty array
    expect(models).toEqual([]);

    // Verify that the error was logged
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Error discovering Ollama models')
    );
  });
});
