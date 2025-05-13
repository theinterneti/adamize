/**
 * @file Test suite for ModelManagementService
 * @description Tests for the ModelManagementService component
 *
 * @requirement REQ-REFACTOR-003 Implement Service Layer
 * @requirement IMPL-REFACTOR-003 Implement ModelManagementService
 */

import { expect } from '@jest/globals';
import * as vscode from 'vscode';
import { ModelManagementService } from '../../../services/ModelManagementService';
import { ModelHandlerFactory } from '../../../handlers/ModelHandlerFactory';
import { IModelOperationHandler, ModelProviderType } from '../../../handlers/IModelOperationHandler';
import { IModelInfo } from '../../../utils/modelManager';
import { ModelOperationStatus } from '../../../types/modelTypes';
import { ModelError, ModelErrorType } from '../../../utils/modelError';

// Mock the ModelOperationHandler
const mockOllamaHandler: jest.Mocked<IModelOperationHandler> = {
  getProviderType: jest.fn().mockReturnValue(ModelProviderType.OLLAMA),
  discoverModels: jest.fn(),
  getModel: jest.fn(),
  pullModel: jest.fn(),
  removeModel: jest.fn(),
};

// Mock the ModelHandlerFactory
const mockHandlerFactory: jest.Mocked<ModelHandlerFactory> = {
  createHandler: jest.fn(),
  getAllHandlers: jest.fn(),
} as any;

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

describe('ModelManagementService', () => {
  let service: ModelManagementService;
  let mockModel: IModelInfo;
  let mockProgressCallback: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock model
    mockModel = {
      id: 'model1',
      name: 'Model 1',
      version: '1.0.0',
      size: 1000000000,
      isLocal: true,
      capabilities: ['text-generation'],
      provider: 'ollama',
      details: {
        parameter_size: '7B',
        quantization_level: 'Q4_0',
      },
    };

    // Setup mock handler factory
    mockHandlerFactory.createHandler.mockReturnValue(mockOllamaHandler);

    // Setup mock progress callback
    mockProgressCallback = jest.fn();

    // Create service
    service = new ModelManagementService(mockHandlerFactory, mockOutputChannel);
  });

  /**
   * @test TEST-REFACTOR-003g Test that the service pulls a model correctly
   */
  test('should pull a model correctly', async () => {
    // Setup mock
    mockOllamaHandler.pullModel.mockResolvedValue(undefined);
    mockOllamaHandler.getModel.mockResolvedValue(mockModel);

    // Call the method
    const result = await service.pullModel(
      'model1',
      ModelProviderType.OLLAMA,
      undefined,
      mockProgressCallback
    );

    // Verify the result
    expect(result.status).toBe(ModelOperationStatus.SUCCESS);
    expect(result.message).toContain('Successfully pulled model');
    expect(result.model).toEqual(mockModel);

    // Verify that the handler was called
    expect(mockHandlerFactory.createHandler).toHaveBeenCalledTimes(1);
    expect(mockHandlerFactory.createHandler).toHaveBeenCalledWith(ModelProviderType.OLLAMA);
    expect(mockOllamaHandler.pullModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaHandler.pullModel).toHaveBeenCalledWith('model1', undefined);
    expect(mockOllamaHandler.getModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaHandler.getModel).toHaveBeenCalledWith('model1');

    // Verify that the progress callback was called
    expect(mockProgressCallback).toHaveBeenCalledTimes(2);
    expect(mockProgressCallback).toHaveBeenCalledWith({
      status: ModelOperationStatus.IN_PROGRESS,
      message: 'Pulling model: model1',
      percentage: 0,
    });
    expect(mockProgressCallback).toHaveBeenCalledWith({
      status: ModelOperationStatus.SUCCESS,
      message: 'Successfully pulled model: model1',
      percentage: 100,
    });
  });

  /**
   * @test TEST-REFACTOR-003h Test that the service handles errors when pulling a model
   */
  test('should handle errors when pulling a model', async () => {
    // Setup mock
    const error = new ModelError(
      'Failed to pull model: model1',
      ModelErrorType.DOWNLOAD,
      'Check your network connection and try again.'
    );
    mockOllamaHandler.pullModel.mockRejectedValue(error);

    // Call the method
    const result = await service.pullModel(
      'model1',
      ModelProviderType.OLLAMA,
      undefined,
      mockProgressCallback
    );

    // Verify the result
    expect(result.status).toBe(ModelOperationStatus.ERROR);
    expect(result.message).toContain('Error pulling model');
    expect(result.error).toBe(error);

    // Verify that the handler was called
    expect(mockHandlerFactory.createHandler).toHaveBeenCalledTimes(1);
    expect(mockHandlerFactory.createHandler).toHaveBeenCalledWith(ModelProviderType.OLLAMA);
    expect(mockOllamaHandler.pullModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaHandler.pullModel).toHaveBeenCalledWith('model1', undefined);

    // Verify that the progress callback was called
    expect(mockProgressCallback).toHaveBeenCalledTimes(2);
    expect(mockProgressCallback).toHaveBeenCalledWith({
      status: ModelOperationStatus.IN_PROGRESS,
      message: 'Pulling model: model1',
      percentage: 0,
    });
    expect(mockProgressCallback).toHaveBeenCalledWith({
      status: ModelOperationStatus.ERROR,
      message: 'Error pulling model: Failed to pull model: model1',
      percentage: 0,
    });
  });

  /**
   * @test TEST-REFACTOR-003i Test that the service removes a model correctly
   */
  test('should remove a model correctly', async () => {
    // Setup mock
    mockOllamaHandler.removeModel.mockResolvedValue(undefined);

    // Call the method
    const result = await service.removeModel(
      'model1',
      ModelProviderType.OLLAMA,
      mockProgressCallback
    );

    // Verify the result
    expect(result.status).toBe(ModelOperationStatus.SUCCESS);
    expect(result.message).toContain('Successfully removed model');

    // Verify that the handler was called
    expect(mockHandlerFactory.createHandler).toHaveBeenCalledTimes(1);
    expect(mockHandlerFactory.createHandler).toHaveBeenCalledWith(ModelProviderType.OLLAMA);
    expect(mockOllamaHandler.removeModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaHandler.removeModel).toHaveBeenCalledWith('model1');

    // Verify that the progress callback was called
    expect(mockProgressCallback).toHaveBeenCalledTimes(2);
    expect(mockProgressCallback).toHaveBeenCalledWith({
      status: ModelOperationStatus.IN_PROGRESS,
      message: 'Removing model: model1',
      percentage: 0,
    });
    expect(mockProgressCallback).toHaveBeenCalledWith({
      status: ModelOperationStatus.SUCCESS,
      message: 'Successfully removed model: model1',
      percentage: 100,
    });
  });

  /**
   * @test TEST-REFACTOR-003j Test that the service handles errors when removing a model
   */
  test('should handle errors when removing a model', async () => {
    // Setup mock
    const error = new ModelError(
      'Failed to remove model: model1',
      ModelErrorType.PERMISSION,
      'Check that you have permission to remove the model.'
    );
    mockOllamaHandler.removeModel.mockRejectedValue(error);

    // Call the method
    const result = await service.removeModel(
      'model1',
      ModelProviderType.OLLAMA,
      mockProgressCallback
    );

    // Verify the result
    expect(result.status).toBe(ModelOperationStatus.ERROR);
    expect(result.message).toContain('Error removing model');
    expect(result.error).toBe(error);

    // Verify that the handler was called
    expect(mockHandlerFactory.createHandler).toHaveBeenCalledTimes(1);
    expect(mockHandlerFactory.createHandler).toHaveBeenCalledWith(ModelProviderType.OLLAMA);
    expect(mockOllamaHandler.removeModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaHandler.removeModel).toHaveBeenCalledWith('model1');

    // Verify that the progress callback was called
    expect(mockProgressCallback).toHaveBeenCalledTimes(2);
    expect(mockProgressCallback).toHaveBeenCalledWith({
      status: ModelOperationStatus.IN_PROGRESS,
      message: 'Removing model: model1',
      percentage: 0,
    });
    expect(mockProgressCallback).toHaveBeenCalledWith({
      status: ModelOperationStatus.ERROR,
      message: 'Error removing model: Failed to remove model: model1',
      percentage: 0,
    });
  });
});
