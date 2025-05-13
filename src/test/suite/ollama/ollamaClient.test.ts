/**
 * Ollama Client Tests
 * 
 * Tests for the Ollama Client implementation.
 * 
 * @implements TEST-REFACTOR-001 Test Ollama Client implementation
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as vscode from 'vscode';
import { OllamaClient } from '../../../ollama/ollamaClient';
import { ModelError, ModelErrorType } from '../../../utils/modelError';

// Mock fetch
global.fetch = jest.fn();

describe('Ollama Client', () => {
  let ollamaClient: OllamaClient;
  let mockOutputChannel: vscode.OutputChannel;

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

    // Create Ollama client
    ollamaClient = new OllamaClient('http://localhost:11434', mockOutputChannel);
  });

  /**
   * Test that the client can list models
   */
  test('should list models', async () => {
    // Mock fetch to return a list of models
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [
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
        ],
      }),
    });

    // Call listModels
    const models = await ollamaClient.listModels();

    // Check that fetch was called with the correct URL
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.any(Object)
    );

    // Check that the models were returned correctly
    expect(models).toHaveLength(2);
    expect(models[0].name).toBe('llama3');
    expect(models[1].name).toBe('codellama');
  });

  /**
   * Test that the client can pull models
   */
  test('should pull models', async () => {
    // Mock fetch to return a successful pull
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
      }),
    });

    // Call pullModel
    const response = await ollamaClient.pullModel('llama3');

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

    // Check that the response was returned correctly
    expect(response.status).toBe('success');
  });

  /**
   * Test that the client can remove models
   */
  test('should remove models', async () => {
    // Mock fetch to return a successful deletion
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
      }),
    });

    // Call removeModel
    const response = await ollamaClient.removeModel('llama3');

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

    // Check that the response was returned correctly
    expect(response.status).toBe('success');
  });

  /**
   * Test that the client handles API errors gracefully
   */
  test('should handle API errors', async () => {
    // Mock fetch to return a 404 error
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    // Call listModels and expect it to throw
    await expect(ollamaClient.listModels()).rejects.toThrow(ModelError);
    await expect(ollamaClient.listModels()).rejects.toThrow('Ollama API endpoint not found');

    // Call pullModel and expect it to throw
    await expect(ollamaClient.pullModel('llama3')).rejects.toThrow(ModelError);
    await expect(ollamaClient.pullModel('llama3')).rejects.toThrow('Ollama API endpoint not found');

    // Call removeModel and expect it to throw
    await expect(ollamaClient.removeModel('llama3')).rejects.toThrow(ModelError);
    await expect(ollamaClient.removeModel('llama3')).rejects.toThrow('Ollama API endpoint not found');
  });

  /**
   * Test that the client retries on connection errors
   */
  test('should retry on connection errors', async () => {
    // Mock fetch to fail with a connection error on first call, then succeed
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          models: [{ name: 'llama3' }],
        }),
      });

    // Call listModels
    const models = await ollamaClient.listModels();

    // Check that fetch was called twice
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Check that the models were returned correctly
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('llama3');
  });
});
