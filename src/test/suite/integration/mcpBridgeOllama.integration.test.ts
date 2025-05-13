/**
 * MCP Bridge and Ollama Integration Tests
 *
 * Tests the integration between MCP Bridge and Ollama.
 *
 * @requirement REQ-MCP-INT-001 Test MCP Bridge integration with Ollama
 * @requirement REQ-MCP-INT-002 Test streaming responses from Ollama through MCP Bridge
 * @requirement REQ-MCP-INT-003 Test tool execution flow from MCP Bridge to Ollama and back
 * @requirement REQ-MCP-INT-004 Test error handling in MCP Bridge with Ollama
 * @requirement REQ-MCP-INT-005 Test streaming responses with tool calls
 * @requirement REQ-MCP-INT-006 Test error handling in streaming responses
 */

import { expect } from '@jest/globals';
import * as vscode from 'vscode';
import { LLMProvider } from '../../../mcp/llmClient';
import { MCPBridge, MCPBridgeEventType, MCPBridgeOptions } from '../../../mcp/mcpBridge';
import { MCPTool } from '../../../mcp/mcpTypes';
import {
  chatCompletionResponse,
  chatCompletionWithToolCallsResponse,
  createMockStream,
  streamingResponseChunks,
  streamingWithToolCallsResponseChunks,
} from '../../fixtures/ollamaApiResponses';

// Set NODE_ENV to test to ensure proper test isolation
process.env.NODE_ENV = 'test';

// Mock fetch
global.fetch = jest.fn();

describe('MCP Bridge and Ollama Integration Tests', () => {
  let mcpBridge: MCPBridge;
  let mockOutputChannel: vscode.OutputChannel;
  let mockFetch: any;
  const mockEventListeners: Map<MCPBridgeEventType, Array<(data?: any) => void>> = new Map();

  // Sample tool for testing
  const sampleTool = {
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
  } as unknown as MCPTool;

  beforeEach(() => {
    // Create mock output channel
    mockOutputChannel = {
      name: 'Test Output Channel',
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      replace: jest.fn(),
    } as vscode.OutputChannel;

    // Reset and mock fetch
    mockFetch = global.fetch as any;
    mockFetch.mockReset();

    // Create MCP bridge options
    const bridgeOptions: MCPBridgeOptions = {
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions',
      systemPrompt: 'You are a helpful assistant',
      temperature: 0.7,
      maxTokens: 2000,
    };

    // Create MCP bridge
    mcpBridge = new MCPBridge(bridgeOptions, mockOutputChannel);

    // Mock addEventListener
    mcpBridge.addEventListener = jest.fn().mockImplementation((event, callback) => {
      if (!mockEventListeners.has(event)) {
        mockEventListeners.set(event, []);
      }
      mockEventListeners.get(event)?.push(callback);
    });

    // Register sample tool
    mcpBridge.registerTool(sampleTool);
  });

  /**
   * @test TEST-MCP-INT-001 Test that MCP Bridge can connect to Ollama
   */
  test('should connect to Ollama successfully', async () => {
    // Mock successful Ollama response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => chatCompletionResponse,
    });

    // Start the bridge
    mcpBridge.start();

    // Verify that the bridge started successfully
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Starting MCP bridge')
    );
  });

  /**
   * @test TEST-MCP-INT-002 Test that MCP Bridge can stream responses from Ollama
   */
  test('should stream responses from Ollama', async () => {
    // Mock streaming response using our fixture helper
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: createMockStream(streamingResponseChunks),
    });

    // Start the bridge
    mcpBridge.start();

    // Create handlers for streaming
    const handlers = {
      onContent: jest.fn(),
      onToolCall: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    // Stream a message
    await mcpBridge.streamMessage('Hello', handlers);

    // Verify that the handlers were called correctly
    expect(handlers.onContent).toHaveBeenCalledWith('Hello');
    expect(handlers.onContent).toHaveBeenCalledWith(' world');
    expect(handlers.onContent).toHaveBeenCalledWith('!');
    expect(handlers.onComplete).toHaveBeenCalled();
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  /**
   * @test TEST-MCP-INT-003 Test that MCP Bridge can execute tools with Ollama
   */
  test('should execute tools with Ollama', async () => {
    // Start the bridge
    mcpBridge.start();

    // Mock LLM response with tool call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => chatCompletionWithToolCallsResponse,
    });

    // Send a message that should trigger a tool call
    const response = await mcpBridge.sendPrompt('Call the test tool');

    // Verify the response includes the tool call result
    expect(response).toContain('I will call a tool for you');
  });

  /**
   * @test TEST-MCP-INT-004 Test that MCP Bridge handles Ollama connection errors
   */
  test('should handle Ollama connection errors', async () => {
    // Mock failed Ollama response
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    // Start the bridge
    mcpBridge.start();

    // Attempt to send a message
    await expect(mcpBridge.sendPrompt('Hello')).rejects.toThrow('Connection refused');

    // Verify that the error was logged
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Error sending prompt')
    );
  });

  /**
   * @test TEST-MCP-INT-005 Test that MCP Bridge can stream responses with tool calls
   */
  test('should stream responses with tool calls', async () => {
    // Mock streaming response with tool calls
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: createMockStream(streamingWithToolCallsResponseChunks),
    });

    // Start the bridge
    mcpBridge.start();

    // Create streaming handlers
    const handlers = {
      onContent: jest.fn(),
      onToolCall: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    // Stream a message
    await mcpBridge.streamMessage('Call a tool', handlers);

    // Verify that the handlers were called
    expect(handlers.onContent).toHaveBeenCalledWith('I will call a tool for you');
    expect(handlers.onToolCall).toHaveBeenCalledWith({
      name: 'test-tool.testFunction',
      parameters: { param1: 'test value' },
    });
    expect(handlers.onComplete).toHaveBeenCalled();
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  /**
   * @test TEST-MCP-INT-006 Test that MCP Bridge handles streaming errors
   */
  test('should handle streaming errors', async () => {
    // Mock streaming error
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream error'));
        },
      }),
    });

    // Start the bridge
    mcpBridge.start();

    // Create streaming handlers
    const handlers = {
      onContent: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    // Stream a message and expect it to throw
    await expect(mcpBridge.streamMessage('Hello', handlers)).rejects.toThrow('Stream error');

    // Verify that the error handler was called
    expect(handlers.onError).toHaveBeenCalled();
    expect(handlers.onComplete).not.toHaveBeenCalled();
  });
});
