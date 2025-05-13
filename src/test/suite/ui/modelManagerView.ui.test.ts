/**
 * @file UI tests for Model Manager View
 * @description Tests the UI interactions with the Model Manager View
 *
 * @requirement REQ-MODEL-UI-001 Test user interactions with the Model Manager view
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';
import { ModelManagerViewProvider } from '../../../ui/modelManagerView';
import ModelManager, { IModelInfo } from '../../../utils/modelManager';
import { ModelOperationStatus } from '../../../types/modelTypes';
import * as sinon from 'sinon';

// Mock the ModelManager
jest.mock('../../../utils/modelManager');

describe('ModelManagerView UI Tests', () => {
  let provider: ModelManagerViewProvider;
  let mockModelManager: jest.Mocked<ModelManager>;
  let mockOutputChannel: vscode.OutputChannel;
  let mockWebviewView: vscode.WebviewView;
  let mockExtensionUri: vscode.Uri;
  let sandbox: sinon.SinonSandbox;
  
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
    sandbox = sinon.createSandbox();
    
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
  
  afterEach(() => {
    sandbox.restore();
  });
  
  /**
   * @test TEST-MODEL-UI-001a Test that the view shows the model list
   */
  test('should show the model list', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Verify that the webview HTML was set
    expect(mockWebviewView.webview.html).toBeTruthy();
    expect(mockWebviewView.webview.html).toContain('model-list');
    
    // Verify that the model manager was called
    expect(mockModelManager.listModels).toHaveBeenCalledTimes(1);
    
    // Verify that the webview was updated with models
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateModels',
        models: sampleModels
      })
    );
  });
  
  /**
   * @test TEST-MODEL-UI-001b Test that the view handles refresh button click
   */
  test('should handle refresh button click', async () => {
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
    await messageHandler({ command: 'refresh' });
    
    // Verify that the model manager was called
    expect(mockModelManager.listModels).toHaveBeenCalledTimes(1);
    
    // Verify that the status was updated
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        refreshStatus: ModelOperationStatus.IN_PROGRESS
      })
    );
    
    // Verify that the status was updated again
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        refreshStatus: ModelOperationStatus.SUCCESS
      })
    );
    
    // Verify that the models were updated
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateModels',
        models: sampleModels
      })
    );
  });
  
  /**
   * @test TEST-MODEL-UI-001c Test that the view handles pull button click
   */
  test('should handle pull button click', async () => {
    // Mock window.showInputBox
    const showInputBoxMock = sandbox.stub(vscode.window, 'showInputBox').resolves('new-model');
    
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
    
    // Verify that the status was updated
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        pullStatus: ModelOperationStatus.IN_PROGRESS
      })
    );
    
    // Verify that the status was updated again
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        pullStatus: ModelOperationStatus.SUCCESS
      })
    );
  });
});
