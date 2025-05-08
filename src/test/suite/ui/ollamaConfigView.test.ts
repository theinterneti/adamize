/**
 * Ollama Configuration View Tests
 *
 * Tests for the Ollama Configuration View component.
 *
 * @requirement REQ-UI-201 Display a configuration interface for Ollama
 * @requirement REQ-UI-202 Allow configuring Ollama model
 * @requirement REQ-UI-203 Allow configuring Ollama endpoint
 * @requirement REQ-UI-204 Allow configuring Ollama temperature
 * @requirement REQ-UI-205 Allow configuring Ollama max tokens
 * @requirement REQ-UI-206 Allow configuring Ollama system prompt
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { OllamaConfigViewProvider } from '../../../ui/ollamaConfigView';

suite('Ollama Configuration View Tests', () => {
  let context: vscode.ExtensionContext;
  let provider: OllamaConfigViewProvider;
  let sandbox: sinon.SinonSandbox;
  let webviewPanelStub: sinon.SinonStubbedInstance<vscode.WebviewPanel>;
  let webviewStub: sinon.SinonStubbedInstance<vscode.Webview>;
  let configurationStub: sinon.SinonStubbedInstance<vscode.WorkspaceConfiguration>;

  setup(() => {
    sandbox = sinon.createSandbox();

    // Create stubs
    webviewStub = {
      html: '',
      onDidReceiveMessage: sandbox.stub(),
      postMessage: sandbox.stub(),
      asWebviewUri: sandbox.stub(),
      cspSource: '',
      options: {}
    } as unknown as sinon.SinonStubbedInstance<vscode.Webview>;

    webviewPanelStub = {
      webview: webviewStub,
      onDidDispose: sandbox.stub(),
      onDidChangeViewState: sandbox.stub(),
      reveal: sandbox.stub(),
      dispose: sandbox.stub()
    } as unknown as sinon.SinonStubbedInstance<vscode.WebviewPanel>;

    configurationStub = {
      get: sandbox.stub(),
      has: sandbox.stub(),
      update: sandbox.stub(),
      inspect: sandbox.stub()
    } as unknown as sinon.SinonStubbedInstance<vscode.WorkspaceConfiguration>;

    // Stub VS Code API
    sandbox.stub(vscode.window, 'createWebviewPanel').returns(webviewPanelStub as unknown as vscode.WebviewPanel);
    sandbox.stub(vscode.workspace, 'getConfiguration').returns(configurationStub as unknown as vscode.WorkspaceConfiguration);
    sandbox.stub(vscode.commands, 'registerCommand').returns({ dispose: () => {} });
    sandbox.stub(vscode.window, 'showInformationMessage');
    sandbox.stub(vscode.window, 'showErrorMessage');

    // No need to mock ViewColumn enum anymore

    // Create mock context
    context = {
      subscriptions: [],
      extensionPath: '/test/path',
      extensionUri: vscode.Uri.file('/test/path'),
      globalState: {
        get: sandbox.stub(),
        update: sandbox.stub(),
        setKeysForSync: sandbox.stub()
      } as unknown as vscode.Memento,
      workspaceState: {
        get: sandbox.stub(),
        update: sandbox.stub(),
        setKeysForSync: sandbox.stub()
      } as unknown as vscode.Memento,
      secrets: {
        get: sandbox.stub(),
        store: sandbox.stub(),
        delete: sandbox.stub()
      },
      extensionMode: 1, // vscode.ExtensionMode.Development
      logPath: '/test/log/path',
      storageUri: vscode.Uri.file('/test/storage'),
      globalStorageUri: vscode.Uri.file('/test/global-storage'),
      asAbsolutePath: (path) => `/test/path/${path}`
    };

    // Create provider
    provider = new OllamaConfigViewProvider(context);
  });

  teardown(() => {
    sandbox.restore();
  });

  /**
   * @test TEST-UI-201 Test that the provider can create a webview panel
   */
  test('should create a webview panel', async () => {
    // Act
    await provider.createOrShowPanel();

    // Assert
    assert.strictEqual(vscode.window.createWebviewPanel.calledOnce, true);
    assert.strictEqual(webviewStub.onDidReceiveMessage.calledOnce, true);
    assert.strictEqual(webviewPanelStub.onDidDispose.calledOnce, true);
  });

  /**
   * @test TEST-UI-202 Test that the provider loads configuration values
   */
  test('should load configuration values', async () => {
    // Arrange
    (configurationStub.get as sinon.SinonStub).withArgs('enabled').returns(true);
    (configurationStub.get as sinon.SinonStub).withArgs('model').returns('test-model');
    (configurationStub.get as sinon.SinonStub).withArgs('baseUrl').returns('http://test-url');
    (configurationStub.get as sinon.SinonStub).withArgs('endpoint').returns('http://test-url/v1/chat/completions');
    (configurationStub.get as sinon.SinonStub).withArgs('temperature').returns(0.5);
    (configurationStub.get as sinon.SinonStub).withArgs('maxTokens').returns(1000);
    (configurationStub.get as sinon.SinonStub).withArgs('systemPrompt').returns('Test prompt');

    // Act
    await provider.createOrShowPanel();

    // Assert
    assert.strictEqual(vscode.workspace.getConfiguration.calledOnce, true);
    assert.strictEqual(webviewStub.html.includes('test-model'), true);
    assert.strictEqual(webviewStub.html.includes('http://test-url'), true);
    assert.strictEqual(webviewStub.html.includes('http://test-url/v1/chat/completions'), true);
    assert.strictEqual(webviewStub.html.includes('0.5'), true);
    assert.strictEqual(webviewStub.html.includes('1000'), true);
    assert.strictEqual(webviewStub.html.includes('Test prompt'), true);
  });

  /**
   * @test TEST-UI-203 Test that the provider handles save configuration message
   */
  test('should handle save configuration message', async () => {
    // Arrange
    const message = {
      command: 'saveConfig',
      enabled: true,
      provider: 'ollama',
      model: 'test-model',
      baseUrl: 'http://test-url',
      endpoint: 'http://test-url/v1/chat/completions',
      temperature: 0.5,
      maxTokens: 1000,
      systemPrompt: 'Test prompt'
    };

    // Get the message handler
    await provider.createOrShowPanel();
    const messageHandler = webviewStub.onDidReceiveMessage.getCall(0).args[0];

    // Act
    await messageHandler(message);

    // Assert
    assert.strictEqual(configurationStub.update.callCount, 8); // Now includes provider
    assert.strictEqual(vscode.window.showInformationMessage.calledOnce, true);
  });

  /**
   * @test TEST-UI-204 Test that the provider handles test connection message
   */
  test('should handle test connection message', async () => {
    // Arrange
    const message = {
      command: 'testConnection',
      provider: 'ollama',
      baseUrl: 'http://test-url'
    };

    // Mock fetch
    global.fetch = sandbox.stub().resolves({
      ok: true,
      json: async () => ({ models: [{ name: 'test-model' }] })
    } as Response);

    // Get the message handler
    await provider.createOrShowPanel();
    const messageHandler = webviewStub.onDidReceiveMessage.getCall(0).args[0];

    // Act
    await messageHandler(message);

    // Assert
    assert.strictEqual(global.fetch.calledOnce, true);
    assert.strictEqual(global.fetch.getCall(0).args[0], 'http://test-url/api/tags');
    assert.strictEqual(webviewStub.postMessage.calledOnce, true);
    assert.strictEqual(vscode.window.showInformationMessage.calledOnce, true);
  });

  /**
   * @test TEST-UI-205 Test that the provider handles list models message
   */
  test('should handle list models message', async () => {
    // Arrange
    const message = {
      command: 'listModels',
      provider: 'ollama',
      baseUrl: 'http://test-url'
    };

    // Mock fetch
    global.fetch = sandbox.stub().resolves({
      ok: true,
      json: async () => ({ models: [{ name: 'test-model-1' }, { name: 'test-model-2' }] })
    } as Response);

    // Get the message handler
    await provider.createOrShowPanel();
    const messageHandler = webviewStub.onDidReceiveMessage.getCall(0).args[0];

    // Act
    await messageHandler(message);

    // Assert
    assert.strictEqual(global.fetch.calledOnce, true);
    assert.strictEqual(global.fetch.getCall(0).args[0], 'http://test-url/api/tags');
    assert.strictEqual(webviewStub.postMessage.calledOnce, true);

    const postMessage = webviewStub.postMessage.getCall(0).args[0];
    assert.strictEqual(postMessage.command, 'modelsList');
    assert.strictEqual(postMessage.models.length, 2);
    assert.strictEqual(postMessage.models[0], 'test-model-1');
    assert.strictEqual(postMessage.models[1], 'test-model-2');
  });
});
