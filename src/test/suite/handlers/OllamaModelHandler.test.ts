/**
 * @file Test suite for OllamaModelHandler
 * @description Tests for the OllamaModelHandler component
 *
 * @requirement REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 * @requirement IMPL-REFACTOR-002 Implement OllamaModelHandler
 */

import { expect } from '@jest/globals';
import * as vscode from 'vscode';
import { OllamaModelHandler } from '../../../handlers/OllamaModelHandler';
import { IOllamaClient } from '../../../ollama/ollamaClient.interface';
import { ModelProviderType } from '../../../handlers/IModelOperationHandler';
import { ModelError, ModelErrorType } from '../../../utils/modelError';
import { OllamaModel } from '../../../ollama/types';

// Mock the OllamaClient
const mockOllamaClient: jest.Mocked<IOllamaClient> = {
  listModels: jest.fn(),
  pullModel: jest.fn(),
  removeModel: jest.fn(),
  getModelInfo: jest.fn(),
  startServer: jest.fn(),
  stopServer: jest.fn(),
  getEndpoint: jest.fn(),
};

// Mock the OutputChannel
const mockOutputChannel: jest.Mocked<vscode.OutputChannel> = {
  name: 'Test Output Channel',
  append: jest.fn(),
  appendLine: jest.fn(),
  clear: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  dispose: jest.fn(),
};

describe('OllamaModelHandler', () => {
  let handler: OllamaModelHandler;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create handler
    handler = new OllamaModelHandler(mockOllamaClient, mockOutputChannel);
  });

  /**
   * @test TEST-REFACTOR-002a Test that the handler returns the correct provider type
   */
  test('should return the correct provider type', () => {
    expect(handler.getProviderType()).toBe(ModelProviderType.OLLAMA);
  });

  /**
   * @test TEST-REFACTOR-002b Test that the handler discovers models correctly
   */
  test('should discover models correctly', async () => {
    // Setup mock
    const mockModels: OllamaModel[] = [
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
        modified_at: '2023-02-01T00:00:00Z',
        size: 2000000000,
        details: {
          parameter_size: '13B',
          quantization_level: 'Q5_K',
        },
      },
    ];

    mockOllamaClient.listModels.mockResolvedValue(mockModels);

    // Call the method
    const models = await handler.discoverModels();

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
    expect(models[1].version).toBe('2023-02-01');
    expect(models[1].size).toBe(2000000000);
    expect(models[1].provider).toBe('ollama');
    expect(models[1].isLocal).toBe(true);
    expect(models[1].capabilities).toContain('text-generation');
    expect(models[1].details).toEqual({
      parameter_size: '13B',
      quantization_level: 'Q5_K',
    });

    // Verify that the client was called
    expect(mockOllamaClient.listModels).toHaveBeenCalledTimes(1);
  });

  /**
   * @test TEST-REFACTOR-002c Test that the handler handles errors when discovering models
   */
  test('should handle errors when discovering models', async () => {
    // Setup mock
    mockOllamaClient.listModels.mockRejectedValue(
      new ModelError(
        'Failed to connect to Ollama server',
        ModelErrorType.CONNECTION,
        'Check that Ollama is running and accessible.'
      )
    );

    // Call the method and expect it to throw
    await expect(handler.discoverModels()).rejects.toThrow('Failed to connect to Ollama server');

    // Verify that the client was called
    expect(mockOllamaClient.listModels).toHaveBeenCalledTimes(1);
  });

  /**
   * @test TEST-REFACTOR-002d Test that the handler gets a model by ID correctly
   */
  test('should get a model by ID correctly', async () => {
    // Setup mock
    mockOllamaClient.getModelInfo.mockResolvedValue({
      name: 'model1',
      modified_at: '2023-01-01T00:00:00Z',
      size: 1000000000,
      details: {
        parameter_size: '7B',
        quantization_level: 'Q4_0',
      },
    });

    // Call the method
    const model = await handler.getModel('model1');

    // Verify the result
    expect(model).toBeDefined();
    expect(model?.id).toBe('model1');
    expect(model?.name).toBe('model1');
    expect(model?.version).toBe('2023-01-01');
    expect(model?.size).toBe(1000000000);
    expect(model?.provider).toBe('ollama');
    expect(model?.isLocal).toBe(true);
    expect(model?.capabilities).toContain('text-generation');
    expect(model?.details).toEqual({
      parameter_size: '7B',
      quantization_level: 'Q4_0',
    });

    // Verify that the client was called
    expect(mockOllamaClient.getModelInfo).toHaveBeenCalledTimes(1);
    expect(mockOllamaClient.getModelInfo).toHaveBeenCalledWith('model1');
  });

  /**
   * @test TEST-REFACTOR-002e Test that the handler returns undefined when a model is not found
   */
  test('should return undefined when a model is not found', async () => {
    // Setup mock
    mockOllamaClient.getModelInfo.mockRejectedValue(
      new ModelError(
        'Model not found: model1',
        ModelErrorType.NOT_FOUND,
        'Check the model name and try again.'
      )
    );

    // Call the method
    const model = await handler.getModel('model1');

    // Verify the result
    expect(model).toBeUndefined();

    // Verify that the client was called
    expect(mockOllamaClient.getModelInfo).toHaveBeenCalledTimes(1);
    expect(mockOllamaClient.getModelInfo).toHaveBeenCalledWith('model1');
  });

  /**
   * @test TEST-REFACTOR-002f Test that the handler pulls a model correctly
   */
  test('should pull a model correctly', async () => {
    // Setup mock
    mockOllamaClient.pullModel.mockResolvedValue({ status: 'success' });

    // Call the method
    await handler.pullModel('model1');

    // Verify that the client was called
    expect(mockOllamaClient.pullModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaClient.pullModel).toHaveBeenCalledWith('model1', undefined);
  });

  /**
   * @test TEST-REFACTOR-002g Test that the handler handles errors when pulling a model
   */
  test('should handle errors when pulling a model', async () => {
    // Setup mock
    mockOllamaClient.pullModel.mockRejectedValue(
      new ModelError(
        'Failed to pull model: model1',
        ModelErrorType.DOWNLOAD,
        'Check your network connection and try again.'
      )
    );

    // Call the method and expect it to throw
    await expect(handler.pullModel('model1')).rejects.toThrow('Failed to pull model: model1');

    // Verify that the client was called
    expect(mockOllamaClient.pullModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaClient.pullModel).toHaveBeenCalledWith('model1', undefined);
  });

  /**
   * @test TEST-REFACTOR-002h Test that the handler removes a model correctly
   */
  test('should remove a model correctly', async () => {
    // Setup mock
    mockOllamaClient.removeModel.mockResolvedValue({ status: 'success' });

    // Call the method
    await handler.removeModel('model1');

    // Verify that the client was called
    expect(mockOllamaClient.removeModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaClient.removeModel).toHaveBeenCalledWith('model1');
  });

  /**
   * @test TEST-REFACTOR-002i Test that the handler handles errors when removing a model
   */
  test('should handle errors when removing a model', async () => {
    // Setup mock
    mockOllamaClient.removeModel.mockRejectedValue(
      new ModelError(
        'Failed to remove model: model1',
        ModelErrorType.PERMISSION,
        'Check that you have permission to remove the model.'
      )
    );

    // Call the method and expect it to throw
    await expect(handler.removeModel('model1')).rejects.toThrow('Failed to remove model: model1');

    // Verify that the client was called
    expect(mockOllamaClient.removeModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaClient.removeModel).toHaveBeenCalledWith('model1');
  });
});
