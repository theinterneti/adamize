/**
 * @file Test suite for ModelDiscoveryService
 * @description Tests for the ModelDiscoveryService component
 *
 * @requirement REQ-REFACTOR-003 Implement Service Layer
 * @requirement IMPL-REFACTOR-003 Implement ModelDiscoveryService
 */

import { expect } from '@jest/globals';
import * as vscode from 'vscode';
import { ModelDiscoveryService, ModelSortOption } from '../../../services/ModelDiscoveryService';
import { ModelHandlerFactory } from '../../../handlers/ModelHandlerFactory';
import { IModelOperationHandler, ModelProviderType } from '../../../handlers/IModelOperationHandler';
import { IModelInfo } from '../../../utils/modelManager';

// Mock the ModelOperationHandler
const mockOllamaHandler: jest.Mocked<IModelOperationHandler> = {
  getProviderType: jest.fn().mockReturnValue(ModelProviderType.OLLAMA),
  discoverModels: jest.fn(),
  getModel: jest.fn(),
  pullModel: jest.fn(),
  removeModel: jest.fn(),
};

const mockLocalHandler: jest.Mocked<IModelOperationHandler> = {
  getProviderType: jest.fn().mockReturnValue(ModelProviderType.LOCAL),
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

describe('ModelDiscoveryService', () => {
  let service: ModelDiscoveryService;
  let mockModels: IModelInfo[];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock models
    mockModels = [
      {
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
      },
      {
        id: 'model2',
        name: 'Model 2',
        version: '2.0.0',
        size: 2000000000,
        isLocal: true,
        capabilities: ['text-generation', 'embeddings'],
        provider: 'ollama',
        details: {
          parameter_size: '13B',
          quantization_level: 'Q5_K',
        },
      },
      {
        id: 'model3.bin',
        name: 'model3',
        version: '1.0.0',
        size: 500000000,
        localPath: '/path/to/model3.bin',
        isLocal: true,
        capabilities: ['text-generation'],
        provider: 'local',
      },
    ];

    // Setup mock handlers
    mockOllamaHandler.discoverModels.mockResolvedValue([mockModels[0], mockModels[1]]);
    mockLocalHandler.discoverModels.mockResolvedValue([mockModels[2]]);
    mockHandlerFactory.getAllHandlers.mockReturnValue([mockOllamaHandler, mockLocalHandler]);
    mockHandlerFactory.createHandler.mockImplementation((providerType: ModelProviderType) => {
      if (providerType === ModelProviderType.OLLAMA) {
        return mockOllamaHandler;
      } else if (providerType === ModelProviderType.LOCAL) {
        return mockLocalHandler;
      }
      throw new Error(`Unknown provider type: ${providerType}`);
    });

    // Create service
    service = new ModelDiscoveryService(mockHandlerFactory, mockOutputChannel);
  });

  /**
   * @test TEST-REFACTOR-003a Test that the service discovers all models correctly
   */
  test('should discover all models correctly', async () => {
    // Call the method
    const models = await service.discoverAllModels();

    // Verify the result
    expect(models).toHaveLength(3);
    expect(models).toContainEqual(mockModels[0]);
    expect(models).toContainEqual(mockModels[1]);
    expect(models).toContainEqual(mockModels[2]);

    // Verify that the handlers were called
    expect(mockHandlerFactory.getAllHandlers).toHaveBeenCalledTimes(1);
    expect(mockOllamaHandler.discoverModels).toHaveBeenCalledTimes(1);
    expect(mockLocalHandler.discoverModels).toHaveBeenCalledTimes(1);
  });

  /**
   * @test TEST-REFACTOR-003b Test that the service caches models
   */
  test('should cache models', async () => {
    // Call the method twice
    await service.discoverAllModels();
    await service.discoverAllModels();

    // Verify that the handlers were called only once
    expect(mockHandlerFactory.getAllHandlers).toHaveBeenCalledTimes(1);
    expect(mockOllamaHandler.discoverModels).toHaveBeenCalledTimes(1);
    expect(mockLocalHandler.discoverModels).toHaveBeenCalledTimes(1);
  });

  /**
   * @test TEST-REFACTOR-003c Test that the service forces a refresh when requested
   */
  test('should force a refresh when requested', async () => {
    // Call the method twice with forceRefresh
    await service.discoverAllModels();
    await service.discoverAllModels(true);

    // Verify that the handlers were called twice
    expect(mockHandlerFactory.getAllHandlers).toHaveBeenCalledTimes(2);
    expect(mockOllamaHandler.discoverModels).toHaveBeenCalledTimes(2);
    expect(mockLocalHandler.discoverModels).toHaveBeenCalledTimes(2);
  });

  /**
   * @test TEST-REFACTOR-003d Test that the service gets a model by ID correctly
   */
  test('should get a model by ID correctly', async () => {
    // Setup mock
    mockOllamaHandler.getModel.mockResolvedValue(mockModels[0]);

    // Call the method
    const model = await service.getModel('model1');

    // Verify the result
    expect(model).toBeDefined();
    expect(model).toEqual(mockModels[0]);

    // Verify that the handlers were called
    expect(mockHandlerFactory.getAllHandlers).toHaveBeenCalledTimes(1);
    expect(mockOllamaHandler.getModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaHandler.getModel).toHaveBeenCalledWith('model1');
    expect(mockLocalHandler.getModel).toHaveBeenCalledTimes(1);
    expect(mockLocalHandler.getModel).toHaveBeenCalledWith('model1');
  });

  /**
   * @test TEST-REFACTOR-003e Test that the service returns undefined when a model is not found
   */
  test('should return undefined when a model is not found', async () => {
    // Setup mock
    mockOllamaHandler.getModel.mockResolvedValue(undefined);
    mockLocalHandler.getModel.mockResolvedValue(undefined);

    // Call the method
    const model = await service.getModel('unknown-model');

    // Verify the result
    expect(model).toBeUndefined();

    // Verify that the handlers were called
    expect(mockHandlerFactory.getAllHandlers).toHaveBeenCalledTimes(1);
    expect(mockOllamaHandler.getModel).toHaveBeenCalledTimes(1);
    expect(mockOllamaHandler.getModel).toHaveBeenCalledWith('unknown-model');
    expect(mockLocalHandler.getModel).toHaveBeenCalledTimes(1);
    expect(mockLocalHandler.getModel).toHaveBeenCalledWith('unknown-model');
  });

  /**
   * @test TEST-REFACTOR-003f Test that the service filters and sorts models correctly
   */
  test('should filter and sort models correctly', async () => {
    // Call the method to discover models first
    await service.discoverAllModels();

    // Filter by provider
    const ollamaModels = service.filterAndSortModels(
      mockModels,
      { provider: 'ollama' },
      ModelSortOption.NAME_ASC
    );
    expect(ollamaModels).toHaveLength(2);
    expect(ollamaModels[0].id).toBe('model1');
    expect(ollamaModels[1].id).toBe('model2');

    // Filter by capability
    const embeddingsModels = service.filterAndSortModels(
      mockModels,
      { capability: 'embeddings' },
      ModelSortOption.NAME_ASC
    );
    expect(embeddingsModels).toHaveLength(1);
    expect(embeddingsModels[0].id).toBe('model2');

    // Filter by search term
    const searchModels = service.filterAndSortModels(
      mockModels,
      { searchTerm: 'model1' },
      ModelSortOption.NAME_ASC
    );
    expect(searchModels).toHaveLength(1);
    expect(searchModels[0].id).toBe('model1');

    // Sort by size (descending)
    const sortedBySize = service.filterAndSortModels(
      mockModels,
      {},
      ModelSortOption.SIZE_DESC
    );
    expect(sortedBySize).toHaveLength(3);
    expect(sortedBySize[0].id).toBe('model2');
    expect(sortedBySize[1].id).toBe('model1');
    expect(sortedBySize[2].id).toBe('model3.bin');

    // Sort by provider (ascending)
    const sortedByProvider = service.filterAndSortModels(
      mockModels,
      {},
      ModelSortOption.PROVIDER_ASC
    );
    expect(sortedByProvider).toHaveLength(3);
    expect(sortedByProvider[0].provider).toBe('local');
    expect(sortedByProvider[1].provider).toBe('ollama');
    expect(sortedByProvider[2].provider).toBe('ollama');
  });
});
