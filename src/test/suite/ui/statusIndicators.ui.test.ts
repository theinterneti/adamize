/**
 * @file UI tests for Status Indicators
 * @description Tests the UI status indicators for model operations
 *
 * @requirement REQ-MODEL-UI-004 Test status indicators for model operations
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';
import { ModelManagerViewProvider } from '../../../ui/modelManagerView';
import ModelManager, { IModelInfo } from '../../../utils/modelManager';
import { ModelOperationStatus } from '../../../types/modelTypes';
import * as sinon from 'sinon';

// Mock the ModelManager
jest.mock('../../../utils/modelManager');

describe('Status Indicators UI Tests', () => {
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
   * @test TEST-MODEL-UI-004a Test that the view shows refresh status indicators
   */
  test('should show refresh status indicators', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mock calls
    mockWebviewView.webview.postMessage = jest.fn().mockResolvedValue(true);
    
    // Simulate message from webview
    const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    await messageHandler({ command: 'refresh' });
    
    // Verify that the status was updated to in progress
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        refreshStatus: ModelOperationStatus.IN_PROGRESS,
        statusMessage: 'Refreshing models...'
      })
    );
    
    // Verify that the status was updated to success
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        refreshStatus: ModelOperationStatus.SUCCESS,
        statusMessage: 'Found 2 models'
      })
    );
  });
  
  /**
   * @test TEST-MODEL-UI-004b Test that the view shows pull status indicators
   */
  test('should show pull status indicators', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mock calls
    mockWebviewView.webview.postMessage = jest.fn().mockResolvedValue(true);
    
    // Simulate message from webview
    const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    await messageHandler({ command: 'pull', modelName: 'new-model' });
    
    // Verify that the status was updated to in progress
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        pullStatus: ModelOperationStatus.IN_PROGRESS,
        statusMessage: 'Pulling model: new-model...'
      })
    );
    
    // Verify that the status was updated to success
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        pullStatus: ModelOperationStatus.SUCCESS,
        statusMessage: 'Successfully pulled model: new-model'
      })
    );
  });
  
  /**
   * @test TEST-MODEL-UI-004c Test that the view shows remove status indicators
   */
  test('should show remove status indicators', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mock calls
    mockWebviewView.webview.postMessage = jest.fn().mockResolvedValue(true);
    
    // Simulate message from webview
    const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    await messageHandler({ command: 'remove', modelName: 'model1' });
    
    // Verify that the status was updated to in progress
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        removeStatus: ModelOperationStatus.IN_PROGRESS,
        statusMessage: 'Removing model: model1...'
      })
    );
    
    // Verify that the status was updated to success
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        removeStatus: ModelOperationStatus.SUCCESS,
        statusMessage: 'Successfully removed model: model1'
      })
    );
  });
  
  /**
   * @test TEST-MODEL-UI-004d Test that the view shows error status indicators
   */
  test('should show error status indicators', async () => {
    // Mock model manager to throw an error
    mockModelManager.pullOllamaModel = jest.fn().mockRejectedValue(new Error('Failed to pull model'));
    
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mock calls
    mockWebviewView.webview.postMessage = jest.fn().mockResolvedValue(true);
    
    // Simulate message from webview
    const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    await messageHandler({ command: 'pull', modelName: 'new-model' });
    
    // Verify that the status was updated to in progress
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        pullStatus: ModelOperationStatus.IN_PROGRESS,
        statusMessage: 'Pulling model: new-model...'
      })
    );
    
    // Verify that the status was updated to error
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        pullStatus: ModelOperationStatus.ERROR,
        statusMessage: 'Error pulling model: Failed to pull model'
      })
    );
  });
});
