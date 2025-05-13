/**
 * MCP Bridge Manager Tests
 *
 * @implements TEST-MCP-080 Test that the manager can create and manage MCP bridges
 * @implements TEST-MCP-081 Test that the manager can configure MCP bridge settings
 * @implements TEST-MCP-082 Test that the manager can integrate with VS Code extension
 * @implements TEST-MCP-083 Test that the manager can handle multiple MCP bridges
 */

import * as vscode from 'vscode';
import { MCPBridge, MCPBridgeOptions } from '../../../mcp/mcpBridge';
import { MCPBridgeManager } from '../../../mcp/mcpBridgeManager';
import { LLMProvider } from '../../../mcp/llmClient';
import { MCPTool } from '../../../mcp/mcpTypes';

// Mock MCPBridge
jest.mock('../../../mcp/mcpBridge');

describe('MCP Bridge Manager Tests', () => {
  let manager: MCPBridgeManager;
  let context: vscode.ExtensionContext;
  let outputChannel: vscode.OutputChannel;

  beforeEach(() => {
    // Create mock context
    context = {
      subscriptions: [],
      extensionPath: '/test/path',
      extensionUri: vscode.Uri.file('/test/path'),
      environmentVariableCollection: {} as any,
      extensionMode: vscode.ExtensionMode.Development,
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
        setKeysForSync: jest.fn(),
        keys: jest.fn().mockReturnValue([]),
      } as any,
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn().mockReturnValue([]),
      } as any,
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn(),
      } as any,
      logPath: '/test/log/path',
      storageUri: vscode.Uri.file('/test/storage/path'),
      globalStorageUri: vscode.Uri.file('/test/global/storage/path'),
      asAbsolutePath: jest.fn().mockImplementation(path => `/test/path/${path}`),
    };

    // Create mock output channel
    outputChannel = {
      name: 'Test Output Channel',
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      replace: jest.fn(),
    } as vscode.OutputChannel;

    // Set up MCPBridge mock
    (MCPBridge as jest.Mock).mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      registerTool: jest.fn(),
      unregisterTool: jest.fn(),
      getAllTools: jest.fn().mockReturnValue([]),
      sendPrompt: jest.fn().mockImplementation(async () => 'Test response'),
      streamMessage: jest.fn().mockImplementation(async (message, handlers) => {
        handlers.onContent('Test content');
        handlers.onComplete();
      }),
      clearConversationHistory: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getToolRegistry: jest.fn().mockReturnValue({}),
      callTool: jest.fn().mockImplementation(async () => ({ result: 'Test result' })),
    }));

    // Create the manager
    manager = new MCPBridgeManager(context, outputChannel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * @test TEST-MCP-080 Test that the manager can create and manage MCP bridges
   */
  test('should create and manage MCP bridges', () => {
    // Create a bridge
    const bridgeId = manager.createBridge({
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions',
      systemPrompt: 'You are a helpful assistant.'
    });

    // Verify that the bridge was created
    expect(bridgeId).toBeDefined();
    expect(MCPBridge).toHaveBeenCalledWith(
      expect.objectContaining({
        llmProvider: LLMProvider.Ollama,
        llmModel: 'llama2',
        llmEndpoint: 'http://localhost:11434/v1/chat/completions',
        systemPrompt: 'You are a helpful assistant.'
      }),
      outputChannel
    );

    // Get the bridge
    const bridge = manager.getBridge(bridgeId);
    expect(bridge).toBeDefined();

    // Start the bridge
    manager.startBridge(bridgeId);
    expect(bridge?.start).toHaveBeenCalled();

    // Stop the bridge
    manager.stopBridge(bridgeId);
    expect(bridge?.stop).toHaveBeenCalled();

    // Remove the bridge
    manager.removeBridge(bridgeId);
    expect(manager.getBridge(bridgeId)).toBeUndefined();
  });

  /**
   * @test TEST-MCP-081 Test that the manager can configure MCP bridge settings
   */
  test('should configure MCP bridge settings', () => {
    // Create a bridge
    const bridgeId = manager.createBridge({
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions'
    });

    // Update the bridge settings
    manager.updateBridgeSettings(bridgeId, {
      systemPrompt: 'You are a helpful assistant.',
      temperature: 0.7,
      maxTokens: 1000
    });

    // Verify that a new bridge was created with the updated settings
    expect(MCPBridge).toHaveBeenCalledWith(
      expect.objectContaining({
        llmProvider: LLMProvider.Ollama,
        llmModel: 'llama2',
        llmEndpoint: 'http://localhost:11434/v1/chat/completions',
        systemPrompt: 'You are a helpful assistant.',
        temperature: 0.7,
        maxTokens: 1000
      }),
      outputChannel
    );
  });

  /**
   * @test TEST-MCP-082 Test that the manager can integrate with VS Code extension
   */
  test('should integrate with VS Code extension', () => {
    // Register a command
    const callback = jest.fn();
    manager.registerCommand('test.command', callback);

    // Verify that the command was registered
    expect(context.subscriptions).toHaveLength(1);

    // Create a bridge
    const bridgeId = manager.createBridge({
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions'
    });

    // Register a tool
    const tool: MCPTool = {
      name: 'test-tool',
      description: 'A test tool',
      functions: [
        {
          name: 'testFunction',
          description: 'A test function',
          parameters: {
            type: 'object',
            properties: {
              param1: {
                type: 'string',
                description: 'A test parameter',
              },
            },
            required: ['param1'],
          },
          execute: async (params: any) => {
            return { result: 'Test result' };
          },
        },
      ],
    } as any;

    manager.registerTool(bridgeId, tool);

    // Verify that the tool was registered
    const bridge = manager.getBridge(bridgeId);
    expect(bridge?.registerTool).toHaveBeenCalledWith(tool);

    // Unregister the tool
    manager.unregisterTool(bridgeId, 'test-tool');

    // Verify that the tool was unregistered
    expect(bridge?.unregisterTool).toHaveBeenCalledWith('test-tool');

    // Dispose the manager
    manager.dispose();

    // Verify that all bridges were stopped
    expect(bridge?.stop).toHaveBeenCalled();
  });

  /**
   * @test TEST-MCP-083 Test that the manager can handle multiple MCP bridges
   */
  test('should handle multiple MCP bridges', () => {
    // Create multiple bridges
    const bridgeId1 = manager.createBridge({
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions'
    });

    const bridgeId2 = manager.createBridge({
      llmProvider: LLMProvider.HuggingFace,
      llmModel: 'gpt2',
      llmEndpoint: 'http://localhost:8080/v1/chat/completions'
    });

    // Verify that both bridges were created
    expect(manager.getBridge(bridgeId1)).toBeDefined();
    expect(manager.getBridge(bridgeId2)).toBeDefined();

    // Get all bridges
    const bridges = manager.getAllBridges();
    expect(bridges).toHaveLength(2);

    // Start all bridges
    manager.startAllBridges();
    expect(manager.getBridge(bridgeId1)?.start).toHaveBeenCalled();
    expect(manager.getBridge(bridgeId2)?.start).toHaveBeenCalled();

    // Stop all bridges
    manager.stopAllBridges();
    expect(manager.getBridge(bridgeId1)?.stop).toHaveBeenCalled();
    expect(manager.getBridge(bridgeId2)?.stop).toHaveBeenCalled();
  });

  /**
   * @test TEST-MCP-084 Test that the manager can send prompts to bridges
   */
  test('should send prompts to bridges', async () => {
    // Create a bridge
    const bridgeId = manager.createBridge({
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions'
    });

    // Start the bridge
    manager.startBridge(bridgeId);

    // Send a prompt
    const response = await manager.sendPrompt(bridgeId, 'Hello');

    // Verify that the prompt was sent
    const bridge = manager.getBridge(bridgeId);
    expect(bridge?.sendPrompt).toHaveBeenCalledWith('Hello');
    expect(response).toBe('Test response');
  });

  /**
   * @test TEST-MCP-085 Test that the manager can stream messages to bridges
   */
  test('should stream messages to bridges', async () => {
    // Create a bridge
    const bridgeId = manager.createBridge({
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions'
    });

    // Start the bridge
    manager.startBridge(bridgeId);

    // Create handlers
    const handlers = {
      onContent: jest.fn(),
      onToolCall: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    // Stream a message
    await manager.streamMessage(bridgeId, 'Hello', handlers);

    // Verify that the message was streamed
    const bridge = manager.getBridge(bridgeId);
    expect(bridge?.streamMessage).toHaveBeenCalledWith('Hello', handlers);
  });
});
