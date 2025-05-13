/**
 * @file Test suite for ModelHandlerFactory
 * @description Tests for the ModelHandlerFactory component
 *
 * @requirement REQ-REFACTOR-002 Define a clear IModelOperationHandler interface
 * @requirement IMPL-REFACTOR-002 Implement ModelHandlerFactory
 */

import { expect } from '@jest/globals';
import * as vscode from 'vscode';
import { ModelHandlerFactory } from '../../../handlers/ModelHandlerFactory';
import { ModelProviderType } from '../../../handlers/IModelOperationHandler';
import { OllamaModelHandler } from '../../../handlers/OllamaModelHandler';
import { LocalModelHandler } from '../../../handlers/LocalModelHandler';
import { IOllamaClient } from '../../../ollama/ollamaClient.interface';

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

// Mock the ExtensionContext
const mockContext: jest.Mocked<vscode.ExtensionContext> = {
  subscriptions: [],
  workspaceState: {} as any,
  globalState: {} as any,
  extensionUri: {} as any,
  extensionPath: '',
  asAbsolutePath: jest.fn(),
  storagePath: '',
  globalStoragePath: '',
  logPath: '',
  extensionMode: vscode.ExtensionMode.Test,
  environmentVariableCollection: {} as any,
  storageUri: {} as any,
  globalStorageUri: {} as any,
  logUri: {} as any,
  secrets: {} as any,
  extension: {} as any,
};

describe('ModelHandlerFactory', () => {
  let factory: ModelHandlerFactory;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create factory
    factory = new ModelHandlerFactory(mockContext, mockOutputChannel, mockOllamaClient);
  });

  /**
   * @test TEST-REFACTOR-002j Test that the factory creates an Ollama handler correctly
   */
  test('should create an Ollama handler correctly', () => {
    // Call the method
    const handler = factory.createHandler(ModelProviderType.OLLAMA);

    // Verify the result
    expect(handler).toBeDefined();
    expect(handler).toBeInstanceOf(OllamaModelHandler);
    expect(handler.getProviderType()).toBe(ModelProviderType.OLLAMA);
  });

  /**
   * @test TEST-REFACTOR-002k Test that the factory creates a Local handler correctly
   */
  test('should create a Local handler correctly', () => {
    // Call the method
    const handler = factory.createHandler(ModelProviderType.LOCAL);

    // Verify the result
    expect(handler).toBeDefined();
    expect(handler).toBeInstanceOf(LocalModelHandler);
    expect(handler.getProviderType()).toBe(ModelProviderType.LOCAL);
  });

  /**
   * @test TEST-REFACTOR-002l Test that the factory throws an error for unsupported provider types
   */
  test('should throw an error for unsupported provider types', () => {
    // Call the method and expect it to throw
    expect(() => factory.createHandler(ModelProviderType.HUGGINGFACE)).toThrow(
      'HuggingFace handler not implemented yet'
    );
  });

  /**
   * @test TEST-REFACTOR-002m Test that the factory caches handlers
   */
  test('should cache handlers', () => {
    // Call the method twice
    const handler1 = factory.createHandler(ModelProviderType.OLLAMA);
    const handler2 = factory.createHandler(ModelProviderType.OLLAMA);

    // Verify that the same instance is returned
    expect(handler1).toBe(handler2);
  });

  /**
   * @test TEST-REFACTOR-002n Test that the factory returns all available handlers
   */
  test('should return all available handlers', () => {
    // Call the method
    const handlers = factory.getAllHandlers();

    // Verify the result
    expect(handlers).toHaveLength(2);
    expect(handlers[0].getProviderType()).toBe(ModelProviderType.OLLAMA);
    expect(handlers[1].getProviderType()).toBe(ModelProviderType.LOCAL);
  });
});
