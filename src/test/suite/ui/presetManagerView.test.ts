/**
 * @file Test suite for Preset Manager View
 * @description Tests for the Preset Manager View component
 *
 * @requirement REQ-MODEL-040 Create a ModelConfigurationPreset interface with fields for model name, parameters, and metadata
 */

import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { expect } from '@jest/globals';
import { PresetManagerViewProvider } from '../../../ui/presetManagerView';
import PresetManager, { IModelConfigurationPreset } from '../../../utils/presetManager';
import ModelManager from '../../../utils/modelManager';

// Mock dependencies
jest.mock('../../../utils/presetManager');
jest.mock('../../../utils/modelManager');

describe('PresetManagerViewProvider', () => {
  let provider: PresetManagerViewProvider;
  let mockPresetManager: jest.Mocked<PresetManager>;
  let mockModelManager: jest.Mocked<ModelManager>;
  let mockOutputChannel: vscode.OutputChannel;
  let mockExtensionUri: vscode.Uri;
  let mockWebviewView: vscode.WebviewView;
  let webviewStub: any;
  
  // Sample preset for testing
  const samplePreset: IModelConfigurationPreset = {
    id: 'preset1',
    name: 'Test Preset',
    description: 'A test preset',
    modelName: 'test-model',
    provider: 'ollama',
    parameters: {
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful assistant.'
    },
    metadata: {
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      createdBy: 'test-user',
      tags: ['test', 'sample']
    }
  };
  
  beforeEach(() => {
    // Create mock output channel
    mockOutputChannel = {
      name: 'Test Output Channel',
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    };
    
    // Create mock extension URI
    mockExtensionUri = {
      scheme: 'file',
      authority: '',
      path: '/test',
      query: '',
      fragment: '',
      fsPath: '/test',
      with: jest.fn().mockReturnThis(),
      toJSON: jest.fn()
    } as unknown as vscode.Uri;
    
    // Create mock preset manager
    mockPresetManager = new PresetManager({} as vscode.ExtensionContext, mockOutputChannel) as jest.Mocked<PresetManager>;
    mockPresetManager.getPresets = jest.fn().mockReturnValue([samplePreset]);
    mockPresetManager.getPreset = jest.fn().mockImplementation((id: string) => {
      return id === 'preset1' ? samplePreset : undefined;
    });
    mockPresetManager.createPreset = jest.fn().mockResolvedValue(true);
    mockPresetManager.updatePreset = jest.fn().mockResolvedValue(true);
    mockPresetManager.deletePreset = jest.fn().mockResolvedValue(true);
    mockPresetManager.exportPresets = jest.fn().mockResolvedValue(true);
    mockPresetManager.importPresets = jest.fn().mockResolvedValue(1);
    
    // Create mock model manager
    mockModelManager = new ModelManager({} as vscode.ExtensionContext, mockOutputChannel) as jest.Mocked<ModelManager>;
    mockModelManager.listModels = jest.fn().mockResolvedValue([
      {
        id: 'model1',
        name: 'model1',
        version: '1.0.0',
        size: 1000,
        isLocal: true,
        capabilities: ['text-generation'],
        provider: 'ollama'
      }
    ]);
    
    // Create mock webview
    webviewStub = {
      onDidReceiveMessage: sinon.stub(),
      postMessage: sinon.stub().resolves(true),
      asWebviewUri: sinon.stub().callsFake((uri: vscode.Uri) => uri),
      html: '',
      options: {},
      cspSource: 'https://test'
    };
    
    // Create mock webview view
    mockWebviewView = {
      webview: webviewStub as unknown as vscode.Webview,
      onDidChangeVisibility: jest.fn(),
      onDidDispose: jest.fn(),
      title: 'Test View',
      description: 'Test Description',
      badge: undefined,
      visible: true,
      viewType: 'test.view',
      show: jest.fn()
    } as unknown as vscode.WebviewView;
    
    // Create provider
    provider = new PresetManagerViewProvider(
      mockExtensionUri,
      mockPresetManager,
      mockModelManager,
      mockOutputChannel
    );
    
    // Reset mocks
    jest.clearAllMocks();
    sinon.resetHistory();
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  /**
   * @test TEST-MODEL-040h Test that the provider resolves the webview correctly
   */
  test('should resolve webview correctly', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Verify that the webview was set up
    expect(webviewStub.options).toHaveProperty('enableScripts', true);
    expect(webviewStub.html).toBeTruthy();
    expect(webviewStub.onDidReceiveMessage.calledOnce).toBe(true);
    
    // Verify that presets were refreshed
    expect(mockPresetManager.getPresets).toHaveBeenCalledTimes(1);
    expect(webviewStub.postMessage.calledOnce).toBe(true);
    expect(webviewStub.postMessage.firstCall.args[0]).toHaveProperty('command', 'updatePresets');
    expect(webviewStub.postMessage.firstCall.args[0]).toHaveProperty('presets');
  });
  
  /**
   * @test TEST-MODEL-040i Test that the provider handles refresh message
   */
  test('should handle refresh message', async () => {
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mocks
    webviewStub.postMessage.resetHistory();
    mockPresetManager.getPresets.mockClear();
    
    // Get the message handler
    const messageHandler = webviewStub.onDidReceiveMessage.firstCall.args[0];
    
    // Send refresh message
    await messageHandler({ command: 'refresh' });
    
    // Verify that presets were refreshed
    expect(mockPresetManager.getPresets).toHaveBeenCalledTimes(1);
    expect(webviewStub.postMessage.calledOnce).toBe(true);
    expect(webviewStub.postMessage.firstCall.args[0]).toHaveProperty('command', 'updatePresets');
  });
  
  /**
   * @test TEST-MODEL-040j Test that the provider handles create preset message
   */
  test('should handle create preset message', async () => {
    // Mock window.showInformationMessage
    const showInfoMock = jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation(() => Promise.resolve(''));
    
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mocks
    webviewStub.postMessage.resetHistory();
    mockPresetManager.createPreset.mockClear();
    
    // Get the message handler
    const messageHandler = webviewStub.onDidReceiveMessage.firstCall.args[0];
    
    // Send create preset message
    await messageHandler({
      command: 'createPreset',
      preset: {
        ...samplePreset,
        id: 'new-preset',
        name: 'New Preset'
      }
    });
    
    // Verify that the preset was created
    expect(mockPresetManager.createPreset).toHaveBeenCalledTimes(1);
    expect(mockPresetManager.createPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-preset',
        name: 'New Preset'
      })
    );
    
    // Verify that a message was shown
    expect(showInfoMock).toHaveBeenCalledWith(expect.stringContaining('Created preset'));
    
    // Verify that presets were refreshed
    expect(mockPresetManager.getPresets).toHaveBeenCalledTimes(2); // Once on initial load, once after create
    
    // Restore mock
    showInfoMock.mockRestore();
  });
  
  /**
   * @test TEST-MODEL-040k Test that the provider handles update preset message
   */
  test('should handle update preset message', async () => {
    // Mock window.showInformationMessage
    const showInfoMock = jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation(() => Promise.resolve(''));
    
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mocks
    webviewStub.postMessage.resetHistory();
    mockPresetManager.updatePreset.mockClear();
    
    // Get the message handler
    const messageHandler = webviewStub.onDidReceiveMessage.firstCall.args[0];
    
    // Send update preset message
    await messageHandler({
      command: 'updatePreset',
      presetId: 'preset1',
      preset: {
        ...samplePreset,
        name: 'Updated Preset'
      }
    });
    
    // Verify that the preset was updated
    expect(mockPresetManager.updatePreset).toHaveBeenCalledTimes(1);
    expect(mockPresetManager.updatePreset).toHaveBeenCalledWith(
      'preset1',
      expect.objectContaining({
        name: 'Updated Preset'
      })
    );
    
    // Verify that a message was shown
    expect(showInfoMock).toHaveBeenCalledWith(expect.stringContaining('Updated preset'));
    
    // Verify that presets were refreshed
    expect(mockPresetManager.getPresets).toHaveBeenCalledTimes(2); // Once on initial load, once after update
    
    // Restore mock
    showInfoMock.mockRestore();
  });
  
  /**
   * @test TEST-MODEL-040l Test that the provider handles delete preset message
   */
  test('should handle delete preset message', async () => {
    // Mock window.showWarningMessage and window.showInformationMessage
    const showWarningMock = jest.spyOn(vscode.window, 'showWarningMessage').mockImplementation(() => Promise.resolve('Delete'));
    const showInfoMock = jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation(() => Promise.resolve(''));
    
    // Resolve webview
    await provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );
    
    // Reset mocks
    webviewStub.postMessage.resetHistory();
    mockPresetManager.deletePreset.mockClear();
    
    // Get the message handler
    const messageHandler = webviewStub.onDidReceiveMessage.firstCall.args[0];
    
    // Send delete preset message
    await messageHandler({
      command: 'deletePreset',
      presetId: 'preset1'
    });
    
    // Verify that confirmation was requested
    expect(showWarningMock).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure'),
      { modal: true },
      'Delete'
    );
    
    // Verify that the preset was deleted
    expect(mockPresetManager.deletePreset).toHaveBeenCalledTimes(1);
    expect(mockPresetManager.deletePreset).toHaveBeenCalledWith('preset1');
    
    // Verify that a message was shown
    expect(showInfoMock).toHaveBeenCalledWith(expect.stringContaining('Deleted preset'));
    
    // Verify that presets were refreshed
    expect(mockPresetManager.getPresets).toHaveBeenCalledTimes(2); // Once on initial load, once after delete
    
    // Restore mocks
    showWarningMock.mockRestore();
    showInfoMock.mockRestore();
  });
});
