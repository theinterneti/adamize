/**
 * MCP Bridge Manager Validation Tests
 *
 * @implements TEST-MCP-084 Test that the manager can validate bridge configuration
 * @implements TEST-MCP-085 Test that the manager can handle configuration errors
 * @implements TEST-MCP-086 Test that the manager can recover from errors
 */

import * as vscode from 'vscode';
import { MCPBridgeManager, BridgeStatus, BridgeManagerEventType } from '../../../mcp/mcpBridgeManager';
import { LLMProvider } from '../../../mcp/llmClient';
import { MCPBridge } from '../../../mcp/mcpBridge';

// Mock MCPBridge
jest.mock('../../../mcp/mcpBridge');

describe('MCP Bridge Manager Validation', () => {
  let manager: MCPBridgeManager;
  let outputChannel: vscode.OutputChannel;
  let context: vscode.ExtensionContext;

  beforeEach(() => {
    // Mock output channel
    outputChannel = {
      appendLine: jest.fn(),
      append: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      name: 'Test Output Channel',
    };

    // Mock extension context
    context = {
      subscriptions: [],
      workspaceState: {} as vscode.Memento,
      globalState: {} as vscode.Memento,
      extensionPath: '',
      asAbsolutePath: jest.fn(),
      storagePath: '',
      globalStoragePath: '',
      logPath: '',
      extensionUri: {} as vscode.Uri,
      environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
      extensionMode: 1, // Use numeric value instead of enum
      storageUri: null,
      globalStorageUri: {} as vscode.Uri,
      logUri: {} as vscode.Uri,
    };

    // Create manager
    manager = new MCPBridgeManager(context, outputChannel as vscode.OutputChannel);

    // Mock MCPBridge implementation
    (MCPBridge as jest.Mock).mockImplementation(() => {
      return {
        start: jest.fn(),
        stop: jest.fn(),
        sendPrompt: jest.fn().mockResolvedValue('Test response'),
        streamMessage: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        registerTool: jest.fn(),
        unregisterTool: jest.fn(),
        getAllTools: jest.fn().mockReturnValue([]),
        getToolRegistry: jest.fn().mockReturnValue({}),
        clearConversationHistory: jest.fn(),
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * @test TEST-MCP-084 Test that the manager can validate bridge configuration
   */
  test('should validate bridge configuration', () => {
    // Valid configuration
    const validConfig = {
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions',
    };

    const validationResult = manager.validateConfiguration(validConfig);
    expect(validationResult).toEqual([]);

    // Invalid configuration - missing required fields
    const invalidConfig1 = {
      llmProvider: LLMProvider.Ollama,
      // Missing llmModel
      llmEndpoint: 'http://localhost:11434/v1/chat/completions',
    };

    const validationResult1 = manager.validateConfiguration(invalidConfig1 as any);
    expect(validationResult1.length).toBeGreaterThan(0);
    expect(validationResult1[0].field).toBe('llmModel');

    // Invalid configuration - invalid URL
    const invalidConfig2 = {
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'invalid-url',
    };

    const validationResult2 = manager.validateConfiguration(invalidConfig2);
    expect(validationResult2.length).toBeGreaterThan(0);
    expect(validationResult2[0].field).toBe('llmEndpoint');

    // Invalid configuration - invalid temperature
    const invalidConfig3 = {
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions',
      temperature: 2.0, // Should be between 0 and 1
    };

    const validationResult3 = manager.validateConfiguration(invalidConfig3);
    expect(validationResult3.length).toBeGreaterThan(0);
    expect(validationResult3[0].field).toBe('temperature');
  });

  /**
   * @test TEST-MCP-085 Test that the manager can handle configuration errors
   */
  test('should handle configuration errors when creating a bridge', () => {
    // Invalid configuration
    const invalidConfig = {
      llmProvider: LLMProvider.Ollama,
      // Missing llmModel
      llmEndpoint: 'http://localhost:11434/v1/chat/completions',
    };

    // Create bridge with invalid config
    const bridgeId = manager.createBridge(invalidConfig as any);
    expect(bridgeId).toBeNull();

    // Create bridge with invalid config and throwOnError=true
    expect(() => {
      manager.createBridge(invalidConfig as any, true);
    }).toThrow();
  });

  /**
   * @test TEST-MCP-086 Test that the manager can recover from errors
   */
  test('should handle bridge errors and attempt reconnection', () => {
    // Create a bridge
    const bridgeId = manager.createBridge({
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions',
    });

    expect(bridgeId).not.toBeNull();

    // Set up event listener
    const errorListener = jest.fn();
    manager.addEventListenerManager(BridgeManagerEventType.BridgeError, errorListener);

    // Mock error in bridge
    const mockBridge = manager.getBridge(bridgeId!);
    const mockErrorEvent = {
      type: 'error',
      data: { error: new Error('Test error') },
      timestamp: Date.now(),
    };

    // Trigger error event
    const errorCallback = (mockBridge as any).addEventListener.mock.calls.find(
      call => call[0] === 'error'
    )[1];
    errorCallback(mockErrorEvent);

    // Check that error was handled
    expect(errorListener).toHaveBeenCalled();
    expect(manager.getBridgeStatus(bridgeId!)).toBe(BridgeStatus.Reconnecting);

    // Fast-forward time to trigger reconnect
    jest.advanceTimersByTime(5000);

    // Check that reconnect was attempted
    expect(mockBridge?.stop).toHaveBeenCalled();
    expect(MCPBridge).toHaveBeenCalledTimes(2); // Initial creation + reconnect
  });
});
