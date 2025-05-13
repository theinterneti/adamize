/**
 * @file UI tests for Model Filtering
 * @description Tests the UI interactions for model filtering functionality
 *
 * @requirement REQ-MODEL-UI-003 Test model filtering functionality with various filter criteria
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';
import { ModelFilterViewProvider, ModelSortOption, IModelFilterCriteria } from '../../../ui/modelFilterView';
import { IModelInfo } from '../../../utils/modelManager';
import * as sinon from 'sinon';

describe('Model Filtering UI Tests', () => {
  let provider: ModelFilterViewProvider;
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
      capabilities: ['text-generation', 'code-generation'],
      provider: 'ollama'
    },
    {
      id: 'model3',
      name: 'model3',
      version: '1.0.0',
      size: 3000,
      isLocal: true,
      capabilities: ['text-generation', 'image-generation'],
      provider: 'huggingface'
    },
    {
      id: 'local-model',
      name: 'local-model',
      version: '1.0.0',
      size: 4000,
      isLocal: true,
      capabilities: ['text-generation'],
      provider: 'local'
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
      viewType: 'adamize.modelFilterView',
      title: 'Model Filter',
      description: 'Filter models',
      badge: undefined,
      show: jest.fn()
    } as unknown as vscode.WebviewView;
    
    // Create provider
    provider = new ModelFilterViewProvider(mockExtensionUri, mockOutputChannel);
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  /**
   * @test TEST-MODEL-UI-003a Test that the filter panel renders correctly
   */
  test('should render filter panel correctly', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Verify that the webview HTML was set
    expect(mockWebviewView.webview.html).toBeTruthy();
    expect(mockWebviewView.webview.html).toContain('filter-panel');
    expect(mockWebviewView.webview.html).toContain('searchInput');
    expect(mockWebviewView.webview.html).toContain('providerFilter');
    expect(mockWebviewView.webview.html).toContain('capabilityFilter');
    expect(mockWebviewView.webview.html).toContain('sortOption');
    expect(mockWebviewView.webview.html).toContain('localOnlyFilter');
    expect(mockWebviewView.webview.html).toContain('clearFilters');
  });
  
  /**
   * @test TEST-MODEL-UI-003b Test that the filter panel handles search input
   */
  test('should handle search input', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Simulate message from webview
    const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    await messageHandler({
      command: 'applyFilters',
      criteria: {
        searchTerm: 'model1'
      },
      models: sampleModels
    });
    
    // Verify that the webview was updated with filtered models
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateFilteredModels',
        models: expect.arrayContaining([
          expect.objectContaining({ id: 'model1' })
        ])
      })
    );
    
    // Verify that only model1 is in the filtered list
    const postMessageCall = (mockWebviewView.webview.postMessage as jest.Mock).mock.calls[0][0];
    expect(postMessageCall.models).toHaveLength(1);
    expect(postMessageCall.models[0].id).toBe('model1');
  });
  
  /**
   * @test TEST-MODEL-UI-003c Test that the filter panel handles provider filter
   */
  test('should handle provider filter', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Simulate message from webview
    const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    await messageHandler({
      command: 'applyFilters',
      criteria: {
        provider: 'ollama'
      },
      models: sampleModels
    });
    
    // Verify that the webview was updated with filtered models
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateFilteredModels',
        models: expect.arrayContaining([
          expect.objectContaining({ id: 'model1' }),
          expect.objectContaining({ id: 'model2' })
        ])
      })
    );
    
    // Verify that only ollama models are in the filtered list
    const postMessageCall = (mockWebviewView.webview.postMessage as jest.Mock).mock.calls[0][0];
    expect(postMessageCall.models).toHaveLength(2);
    expect(postMessageCall.models[0].provider).toBe('ollama');
    expect(postMessageCall.models[1].provider).toBe('ollama');
  });
  
  /**
   * @test TEST-MODEL-UI-003d Test that the filter panel handles capability filter
   */
  test('should handle capability filter', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Simulate message from webview
    const messageHandler = (mockWebviewView.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    await messageHandler({
      command: 'applyFilters',
      criteria: {
        capability: 'code-generation'
      },
      models: sampleModels
    });
    
    // Verify that the webview was updated with filtered models
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'updateFilteredModels',
        models: expect.arrayContaining([
          expect.objectContaining({ id: 'model2' })
        ])
      })
    );
    
    // Verify that only models with code-generation capability are in the filtered list
    const postMessageCall = (mockWebviewView.webview.postMessage as jest.Mock).mock.calls[0][0];
    expect(postMessageCall.models).toHaveLength(1);
    expect(postMessageCall.models[0].id).toBe('model2');
    expect(postMessageCall.models[0].capabilities).toContain('code-generation');
  });
});
