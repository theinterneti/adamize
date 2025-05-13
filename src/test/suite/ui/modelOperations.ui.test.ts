/**
 * @file UI tests for Model Operations
 * @description Tests the UI interactions for model pulling and removing operations
 *
 * @requirement REQ-MODEL-UI-002 Test model pulling/removing operations through the UI
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';
import { ModelManagerViewProvider } from '../../../ui/modelManagerView';
import ModelManager, { IModelInfo } from '../../../utils/modelManager';
import { ModelOperationStatus } from '../../../types/modelTypes';
import * as sinon from 'sinon';

// Mock the ModelManager
jest.mock('../../../utils/modelManager');

describe('Model Operations UI Tests', () => {
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
   * @test TEST-MODEL-UI-002a Test that the view handles pull model command
   */
  test('should handle pull model command', async () => {
    // Mock window.showInputBox
    const showInputBoxMock = sandbox.stub(vscode.window, 'showInputBox').resolves('new-model');
    
    // Mock window.withProgress
    const withProgressMock = sandbox.stub(vscode.window, 'withProgress').callsFake(
      async (options, task) => {
        return task({ report: jest.fn() }, {} as vscode.CancellationToken);
      }
    );
    
    // Mock window.showInformationMessage
    const showInfoMock = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
    
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mock calls
    mockWebviewView.webview.postMessage = jest.fn().mockResolvedValue(true);
    
    // Call the pull model command
    await vscode.commands.executeCommand('adamize.pullOllamaModel');
    
    // Verify that the input box was shown
    expect(showInputBoxMock.called).toBe(true);
    expect(showInputBoxMock.firstCall.args[0]).toHaveProperty('prompt', 'Enter the name of the model to pull');
    
    // Verify that the model manager was called
    expect(mockModelManager.pullOllamaModel).toHaveBeenCalledTimes(1);
    expect(mockModelManager.pullOllamaModel).toHaveBeenCalledWith('new-model');
    
    // Verify that the information message was shown
    expect(showInfoMock.called).toBe(true);
    expect(showInfoMock.firstCall.args[0]).toContain('Successfully pulled model');
  });
  
  /**
   * @test TEST-MODEL-UI-002b Test that the view handles remove model command
   */
  test('should handle remove model command', async () => {
    // Mock window.showQuickPick
    const showQuickPickMock = sandbox.stub(vscode.window, 'showQuickPick').resolves({
      label: 'model1',
      description: 'Ollama model',
      detail: '1.0.0',
      model: sampleModels[0]
    } as vscode.QuickPickItem);
    
    // Mock window.showInformationMessage
    const showInfoMock = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
    
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mock calls
    mockWebviewView.webview.postMessage = jest.fn().mockResolvedValue(true);
    
    // Call the remove model command
    await vscode.commands.executeCommand('adamize.removeOllamaModel');
    
    // Verify that the quick pick was shown
    expect(showQuickPickMock.called).toBe(true);
    
    // Verify that the model manager was called
    expect(mockModelManager.removeOllamaModel).toHaveBeenCalledTimes(1);
    expect(mockModelManager.removeOllamaModel).toHaveBeenCalledWith('model1');
    
    // Verify that the information message was shown
    expect(showInfoMock.called).toBe(true);
    expect(showInfoMock.firstCall.args[0]).toContain('Successfully removed model');
  });
  
  /**
   * @test TEST-MODEL-UI-002c Test that the view handles pull model error
   */
  test('should handle pull model error', async () => {
    // Mock window.showInputBox
    const showInputBoxMock = sandbox.stub(vscode.window, 'showInputBox').resolves('new-model');
    
    // Mock window.showErrorMessage
    const showErrorMock = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
    
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
    
    // Call the pull model command
    await vscode.commands.executeCommand('adamize.pullOllamaModel');
    
    // Verify that the error message was shown
    expect(showErrorMock.called).toBe(true);
    expect(showErrorMock.firstCall.args[0]).toContain('Failed to pull model');
    
    // Verify that the status was updated
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateStatus',
        pullStatus: ModelOperationStatus.ERROR
      })
    );
  });
});
