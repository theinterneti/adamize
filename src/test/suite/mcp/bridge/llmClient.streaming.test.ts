/**
 * LLM Client Streaming Tests
 *
 * Tests for the LLM Client streaming implementation.
 *
 * Requirements being tested:
 * - REQ-OLLAMA-012: Support streaming responses from Ollama
 *
 * Test tags:
 * - TEST-OLLAMA-012-001: Test that the client can stream responses from Ollama
 * - TEST-OLLAMA-012-002: Test that the client handles streaming errors gracefully
 * - TEST-OLLAMA-012-003: Test that the client emits streaming events correctly
 * - TEST-OLLAMA-012-004: Test that the client can cancel streaming
 */

import * as vscode from 'vscode';
import { LLMClient, LLMProvider, MessageRole } from '../../../../mcp/bridge/llmClient';
import { VSCodeLogger } from '../../../../mcp/bridge/vscodeLogger';
import { MCPToolRegistry } from '../../../../mcp/bridge/toolRegistry';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// Mock fetch
global.fetch = jest.fn();

describe('LLM Client Streaming', () => {
  let llmClient: LLMClient;
  let logger: VSCodeLogger;
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

    // Create LLM client
    llmClient = new LLMClient(
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
    );
  });

  /**
   * @test TEST-OLLAMA-012-001: Test that the client can stream responses from Ollama
   */
  test('should stream responses from Ollama', async () => {
    // Mock fetch to return a readable stream
    const mockStream = new ReadableStream({
      start(controller) {
        // Simulate chunks of data
        controller.enqueue(JSON.stringify({ 
          model: 'llama3',
          created_at: '2023-01-01T00:00:00Z',
          message: { role: 'assistant', content: 'Hello' },
          done: false
        }));
        controller.enqueue(JSON.stringify({ 
          model: 'llama3',
          created_at: '2023-01-01T00:00:00Z',
          message: { role: 'assistant', content: ' world' },
          done: false
        }));
        controller.enqueue(JSON.stringify({ 
          model: 'llama3',
          created_at: '2023-01-01T00:00:00Z',
          message: { role: 'assistant', content: '!' },
          done: true
        }));
        controller.close();
      }
    });

    // Mock response
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      body: mockStream,
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      json: jest.fn()
    };

    // Set up the fetch mock
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    // Create event handlers
    const onContent = jest.fn();
    const onToolCall = jest.fn();
    const onComplete = jest.fn();

    // Call streamPrompt
    await llmClient.streamPrompt('Test prompt', {
      onContent,
      onToolCall,
      onComplete
    });

    // Check that fetch was called with the correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.any(String)
      })
    );

    // Check that the request body includes stream: true
    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(requestBody.stream).toBe(true);

    // Check that the event handlers were called correctly
    expect(onContent).toHaveBeenCalledTimes(3);
    expect(onContent).toHaveBeenNthCalledWith(1, 'Hello');
    expect(onContent).toHaveBeenNthCalledWith(2, ' world');
    expect(onContent).toHaveBeenNthCalledWith(3, '!');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  /**
   * @test TEST-OLLAMA-012-002: Test that the client handles streaming errors gracefully
   */
  test('should handle streaming errors gracefully', async () => {
    // Mock fetch to throw an error
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    // Create event handlers
    const onContent = jest.fn();
    const onToolCall = jest.fn();
    const onComplete = jest.fn();
    const onError = jest.fn();

    // Call streamPrompt and expect it to throw
    await expect(llmClient.streamPrompt('Test prompt', {
      onContent,
      onToolCall,
      onComplete,
      onError
    })).rejects.toThrow('Network error');

    // Check that the error handler was called
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
