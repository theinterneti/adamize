/**
 * @file Integration tests for ModelManagerViewProvider with ModelManager
 * @description Tests the integration between ModelManagerViewProvider and ModelManager
 *
 * @requirement REQ-MODEL-INT-002 Test ModelManagerViewProvider integration with ModelManager
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';
import { ModelManagerViewProvider } from '../../../ui/modelManagerView';
import ModelManager, { IModelInfo } from '../../../utils/modelManager';
import { ModelOperationStatus } from '../../../types/modelTypes';

// Mock the ModelManager
jest.mock('../../../utils/modelManager');

describe('ModelManagerViewProvider Integration Tests', () => {
  let provider: ModelManagerViewProvider;
  let mockModelManager: jest.Mocked<ModelManager>;
  let mockOutputChannel: vscode.OutputChannel;
  let mockWebviewView: vscode.WebviewView;
  let mockExtensionUri: vscode.Uri;
  
  // Sample model data for testing
  const sampleModels: IModelInfo[] = [
    {
      id: 'model1',
      name: 'model1',
      version: '1.0.0',
      size: 1000,
      isLocal: true,
      capabilities: ['text-generation'],
      provider: 'ollama'
    },
    {
      id: 'model2',
      name: 'model2',
      version: '1.0.0',
      size: 2000,
      isLocal: true,
      capabilities: ['text-generation'],
      provider: 'ollama'
    }
  ];
  
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
    
    // Create mock extension URI
    mockExtensionUri = vscode.Uri.file('/test/path');
    
    // Create mock model manager
    mockModelManager = new ModelManager({} as vscode.ExtensionContext, mockOutputChannel) as jest.Mocked<ModelManager>;
    mockModelManager.listModels = jest.fn().mockResolvedValue(sampleModels);
    mockModelManager.getModel = jest.fn().mockImplementation((id) => {
      return Promise.resolve(sampleModels.find(model => model.id === id));
    });
    mockModelManager.pullOllamaModel = jest.fn().mockResolvedValue(undefined);
    mockModelManager.removeOllamaModel = jest.fn().mockResolvedValue(undefined);
    
    // Create mock webview view
    mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: jest.fn(),
        postMessage: jest.fn().mockResolvedValue(true),
        asWebviewUri: jest.fn().mockImplementation(uri => uri),
        cspSource: 'https://test.com'
      },
      onDidChangeVisibility: jest.fn(),
      onDidDispose: jest.fn(),
      visible: true,
      viewType: 'adamize.modelManagerView',
      title: 'Model Manager',
      description: 'Manage LLM models',
      badge: undefined,
      show: jest.fn()
    } as unknown as vscode.WebviewView;
    
    // Create provider
    provider = new ModelManagerViewProvider(mockExtensionUri, mockModelManager, mockOutputChannel);
  });
  
  /**
   * @test TEST-MODEL-INT-002a Test that the provider refreshes models correctly
   */
  test('should refresh models correctly', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Verify that the model manager was called
    expect(mockModelManager.listModels).toHaveBeenCalledTimes(1);
    
    // Verify that the webview was updated
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateModels',
        models: sampleModels
      })
    );
    
    // Verify that the status was updated
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        refreshStatus: ModelOperationStatus.SUCCESS
      })
    );
  });
  
  /**
   * @test TEST-MODEL-INT-002b Test that the provider pulls models correctly
   */
  test('should pull models correctly', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mock calls
    mockWebviewView.webview.postMessage = jest.fn().mockResolvedValue(true);
    mockModelManager.listModels = jest.fn().mockResolvedValue(sampleModels);
    
    // Simulate message from webview
    const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    await messageHandler({ command: 'pull', modelName: 'new-model' });
    
    // Verify that the model manager was called
    expect(mockModelManager.pullOllamaModel).toHaveBeenCalledTimes(1);
    expect(mockModelManager.pullOllamaModel).toHaveBeenCalledWith('new-model');
    
    // Verify that the models were refreshed
    expect(mockModelManager.listModels).toHaveBeenCalledTimes(1);
    
    // Verify that the status was updated
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        pullStatus: ModelOperationStatus.SUCCESS
      })
    );
  });
  
  /**
   * @test TEST-MODEL-INT-002c Test that the provider removes models correctly
   */
  test('should remove models correctly', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mock calls
    mockWebviewView.webview.postMessage = jest.fn().mockResolvedValue(true);
    mockModelManager.listModels = jest.fn().mockResolvedValue(sampleModels);
    
    // Simulate message from webview
    const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    await messageHandler({ command: 'remove', modelName: 'model1' });
    
    // Verify that the model manager was called
    expect(mockModelManager.removeOllamaModel).toHaveBeenCalledTimes(1);
    expect(mockModelManager.removeOllamaModel).toHaveBeenCalledWith('model1');
    
    // Verify that the models were refreshed
    expect(mockModelManager.listModels).toHaveBeenCalledTimes(1);
    
    // Verify that the status was updated
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        removeStatus: ModelOperationStatus.SUCCESS
      })
    );
  });
});
