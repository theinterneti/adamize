/**
 * Simple Ollama Client Tests
 * 
 * Basic tests for the Ollama Client implementation.
 * 
 * @implements TEST-REFACTOR-001 Test Ollama Client implementation
 */

import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { OllamaClient } from '../../../ollama/ollamaClient';
import { ModelError, ModelErrorType } from '../../../utils/modelError';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('OllamaClient', () => {
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
      replace: jest.fn(),
    } as unknown as vscode.OutputChannel;

    // Create Ollama client
    ollamaClient = new OllamaClient('http://localhost:11434', mockOutputChannel);
  });

  it('should get the endpoint', () => {
    expect(ollamaClient.getEndpoint()).toBe('http://localhost:11434');
  });

  it('should list models', async () => {
    // Mock fetch to return a list of models
    mockFetch.mockResolvedValue({
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
        ],
      }),
    });

    // Call listModels
    const models = await ollamaClient.listModels();

    // Check that fetch was called with the correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.any(Object)
    );

    // Check that the models were returned correctly
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('llama3');
  });

  it('should handle API errors when listing models', async () => {
    // Mock fetch to return a 404 error
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    // Call listModels and expect it to throw
    await expect(ollamaClient.listModels()).rejects.toThrow(ModelError);
    await expect(ollamaClient.listModels()).rejects.toThrow('Ollama API endpoint not found');
  });
});
