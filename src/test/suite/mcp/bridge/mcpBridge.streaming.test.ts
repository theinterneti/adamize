/**
 * MCP Bridge Streaming Tests
 *
 * Tests for the MCP Bridge streaming implementation.
 *
 * Requirements being tested:
 * - REQ-OLLAMA-012: Support streaming responses from Ollama
 *
 * Test tags:
 * - TEST-OLLAMA-012-005: Test that the bridge can stream responses from Ollama
 * - TEST-OLLAMA-012-006: Test that the bridge handles streaming errors gracefully
 * - TEST-OLLAMA-012-007: Test that the bridge emits streaming events correctly
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as vscode from 'vscode';
import { LLMClient, LLMProvider } from '../../../../mcp/llmClient';
import { MCPBridge, MCPBridgeEventType } from '../../../../mcp/mcpBridge';
import { MCPToolRegistry } from '../../../../mcp/mcpToolRegistry';

// Mock the LLMClient and MCPToolRegistry classes
jest.mock('../../../../mcp/llmClient');
jest.mock('../../../../mcp/mcpToolRegistry');

describe('MCP Bridge Streaming', () => {
  let bridge: MCPBridge;
  let outputChannel: vscode.OutputChannel;
  let llmClientMock: jest.Mocked<LLMClient>;
  let toolRegistryMock: jest.Mocked<MCPToolRegistry>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a mock output channel
    outputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
    } as unknown as vscode.OutputChannel;

    // Set up mocks
    (LLMClient as jest.Mock).mockImplementation(() => ({
      sendPrompt: jest.fn().mockImplementation(async () => 'Test response'),
      clearConversationHistory: jest.fn(),
      streamPrompt: jest.fn().mockImplementation(async (prompt, handlers) => {
        // Simulate streaming by calling the handlers
        handlers.onContent('Hello');
        handlers.onContent(' world');
        handlers.onContent('!');
        handlers.onComplete();
      }),
    }));

    (MCPToolRegistry as jest.Mock).mockImplementation(() => ({
      registerTool: jest.fn(),
      unregisterTool: jest.fn(),
      getAllTools: jest.fn().mockReturnValue([]),
      executeFunction: jest.fn().mockResolvedValue({ result: 'Tool execution result' }),
    }));

    // Create the bridge options
    const options = {
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama3',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions',
      systemPrompt: 'You are a helpful assistant.',
      temperature: 0.7,
      maxTokens: 1000,
    };

    // Create the bridge
    bridge = new MCPBridge(options, outputChannel);

    // Get the mocked instances
    llmClientMock = (bridge as any).llmClient;
    toolRegistryMock = (bridge as any).toolRegistry;

    // Start the bridge
    bridge.start();
  });

  /**
   * @test TEST-OLLAMA-012-005: Test that the bridge can stream responses from Ollama
   */
  test('should stream responses from Ollama', async () => {
    // Set up the mock
    llmClientMock.streamPrompt.mockImplementation(async (prompt, handlers) => {
      // Simulate streaming
      handlers.onContent('Hello');
      handlers.onContent(' world');
      handlers.onContent('!');
      handlers.onComplete();
    });

    // Create event handlers
    const onContent = jest.fn();
    const onToolCall = jest.fn();
    const onComplete = jest.fn();

    // Call streamMessage
    await bridge.streamMessage('Test prompt', {
      onContent,
      onToolCall,
      onComplete,
    });

    // Check that streamPrompt was called with the correct parameters
    expect(llmClientMock.streamPrompt).toHaveBeenCalledWith(
      'Test prompt',
      expect.objectContaining({
        onContent: expect.any(Function),
        onToolCall: expect.any(Function),
        onComplete: expect.any(Function),
        onError: expect.any(Function),
      })
    );

    // Check that the event handlers were called correctly
    expect(onContent).toHaveBeenCalledTimes(3);
    expect(onContent).toHaveBeenNthCalledWith(1, 'Hello');
    expect(onContent).toHaveBeenNthCalledWith(2, ' world');
    expect(onContent).toHaveBeenNthCalledWith(3, '!');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  /**
   * @test TEST-OLLAMA-012-006: Test that the bridge handles streaming errors gracefully
   */
  test('should handle streaming errors gracefully', async () => {
    // Set up the mock to throw an error
    llmClientMock.streamPrompt.mockRejectedValue(new Error('Network error'));

    // Create event handlers
    const onContent = jest.fn();
    const onToolCall = jest.fn();
    const onComplete = jest.fn();
    const onError = jest.fn();

    // Call streamMessage and expect it to throw
    await expect(
      bridge.streamMessage('Test prompt', {
        onContent,
        onToolCall,
        onComplete,
        onError,
      })
    ).rejects.toThrow('Network error');

    // Check that the error handler was called
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  /**
   * @test TEST-OLLAMA-012-007: Test that the bridge emits streaming events correctly
   */
  test('should emit streaming events correctly', async () => {
    // Create a listener
    const listener = jest.fn();

    // Add the listener
    bridge.addEventListener(MCPBridgeEventType.ResponseReceived, listener);

    // Create event handlers
    const onContent = jest.fn();
    const onComplete = jest.fn();

    // Call streamMessage
    await bridge.streamMessage('Test prompt', {
      onContent,
      onComplete,
    });

    // Check that the listener was called for each content chunk and completion
    expect(listener).toHaveBeenCalledTimes(4); // 3 content chunks + 1 completion
  });
});
