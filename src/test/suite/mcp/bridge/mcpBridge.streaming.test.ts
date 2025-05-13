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

import * as vscode from 'vscode';
import { MCPBridge } from '../../../../mcp/bridge/mcpBridge';
import { VSCodeLogger } from '../../../../mcp/bridge/vscodeLogger';
import { LLMBridgeClient } from '../../../../mcp/bridge/llmClient';
import { MCPToolRegistry } from '../../../../mcp/bridge/toolRegistry';
import { LLMProvider } from '../../../../mcp/llmClient';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// Mock the LLMBridgeClient
jest.mock('../../../../mcp/bridge/llmClient');

describe('MCP Bridge Streaming', () => {
  let bridge: MCPBridge;
  let logger: VSCodeLogger;
  let llmClient: jest.Mocked<LLMBridgeClient>;
  let toolRegistry: MCPToolRegistry;
  let mockOutputChannel: vscode.OutputChannel;

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();

    // Create mock output channel
    mockOutputChannel = {
      appendLine: jest.fn(),
      append: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      name: 'Test Output Channel'
    } as unknown as vscode.OutputChannel;

    // Create logger
    logger = new VSCodeLogger(mockOutputChannel);

    // Create tool registry
    toolRegistry = new MCPToolRegistry(logger);

    // Create mock LLM client
    llmClient = new LLMBridgeClient(
      {
        provider: LLMProvider.Ollama,
        model: 'llama3',
        endpoint: 'http://localhost:11434/v1/chat/completions',
        systemPrompt: 'You are a helpful assistant.',
        temperature: 0.7,
        maxTokens: 1000
      },
      toolRegistry,
      logger
    ) as jest.Mocked<LLMBridgeClient>;

    // Create MCP bridge
    bridge = new MCPBridge({
      id: 'test-bridge',
      name: 'Test Bridge',
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama3',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions',
      systemPrompt: 'You are a helpful assistant.',
      temperature: 0.7,
      maxTokens: 1000
    }, logger);

    // Replace the LLM client with our mock
    (bridge as any).llmClient = llmClient;
  });

  /**
   * @test TEST-OLLAMA-012-005: Test that the bridge can stream responses from Ollama
   */
  test('should stream responses from Ollama', async () => {
    // Set up the mock
    llmClient.streamPrompt.mockImplementation(async (prompt, handlers) => {
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
      onComplete
    });

    // Check that streamPrompt was called with the correct parameters
    expect(llmClient.streamPrompt).toHaveBeenCalledWith(
      'Test prompt',
      expect.objectContaining({
        onContent: expect.any(Function),
        onToolCall: expect.any(Function),
        onComplete: expect.any(Function)
      }),
      true
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
    llmClient.streamPrompt.mockRejectedValue(new Error('Network error'));

    // Create event handlers
    const onContent = jest.fn();
    const onToolCall = jest.fn();
    const onComplete = jest.fn();
    const onError = jest.fn();

    // Call streamMessage and expect it to throw
    await expect(bridge.streamMessage('Test prompt', {
      onContent,
      onToolCall,
      onComplete,
      onError
    })).rejects.toThrow('Network error');

    // Check that the error handler was called
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
