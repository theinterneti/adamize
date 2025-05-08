/**
 * LLM Bridge Client Tests
 *
 * Tests for the LLM Bridge Client implementation.
 *
 * @requirement REQ-MCP-060 Connect to local LLM providers
 * @requirement REQ-MCP-061 Format prompts for LLM consumption
 * @requirement REQ-MCP-062 Process LLM responses and extract tool calls
 * @requirement REQ-MCP-063 Support multiple LLM providers
 */

import * as sinon from 'sinon';
import { expect, describe, test, beforeEach, afterEach } from '@jest/globals';
import * as vscode from 'vscode';

// Import the components we'll be testing
import { LLMBridgeClient, ChatMessage } from '../../../../mcp/bridge/llmClient';
import { VSCodeLogger, LogLevel } from '../../../../mcp/bridge/vscodeLogger';
import { MCPToolRegistry } from '../../../../mcp/mcpToolRegistry';
import { LLMConfig, MessageRole } from '../../../../mcp/bridge/bridgeTypes';
import { LLMProvider } from '../../../../mcp/llmClient';

describe('LLM Bridge Client Tests', () => {
  let sandbox: sinon.SinonSandbox;
  let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;
  let logger: VSCodeLogger;
  let toolRegistry: MCPToolRegistry;
  let client: LLMBridgeClient;
  let config: LLMConfig;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Create stubs
    outputChannelStub = {
      name: 'Test Channel',
      append: sandbox.stub(),
      appendLine: sandbox.stub(),
      clear: sandbox.stub(),
      hide: sandbox.stub(),
      show: sandbox.stub(),
      dispose: sandbox.stub()
    } as unknown as sinon.SinonStubbedInstance<vscode.OutputChannel>;

    // Create logger
    logger = new VSCodeLogger(outputChannelStub as unknown as vscode.OutputChannel);

    // Create tool registry
    toolRegistry = new MCPToolRegistry(outputChannelStub as unknown as vscode.OutputChannel);
    sandbox.stub(toolRegistry, 'getToolInstructions').returns('Available tools: test-tool');
    sandbox.stub(toolRegistry, 'executeFunction').resolves({ result: 'test-result' });

    // Create config
    config = {
      provider: LLMProvider.Ollama,
      model: 'test-model',
      endpoint: 'http://localhost:11434/v1/chat/completions',
      systemPrompt: 'You are a helpful assistant.'
    };

    // Create client
    client = new LLMBridgeClient(config, toolRegistry, logger);

    // Stub fetch
    global.fetch = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  /**
   * @test TEST-MCP-060 Test that the client can connect to local LLM providers
   */
  test('should send a prompt to the LLM', async () => {
    // Set up the fetch stub to return a successful response
    (global.fetch as sinon.SinonStub).resolves({
      ok: true,
      json: async () => ({
        model: 'test-model',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Test response'
        },
        done: true
      }),
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
      type: 'basic',
      url: 'http://localhost:11434/v1/chat/completions',
      redirected: false,
      body: null,
      bodyUsed: false,
      clone: () => ({} as Response),
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob([]),
      formData: async () => new FormData(),
      text: async () => '',
    } as Response);

    // Send a prompt
    const response = await client.sendPrompt('Hello, world!');

    // Check that the response is correct
    expect(response).toBe('Test response');
    expect((global.fetch as sinon.SinonStub).calledOnce).toBe(true);
  });

  /**
   * @test TEST-MCP-061 Test that the client can format prompts for LLM consumption
   */
  test('should format prompts with tool instructions', async () => {
    // Set up the fetch stub to return a successful response
    (global.fetch as sinon.SinonStub).resolves({
      ok: true,
      json: async () => ({
        model: 'test-model',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Test response'
        },
        done: true
      }),
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
      type: 'basic',
      url: 'http://localhost:11434/v1/chat/completions',
      redirected: false,
      body: null,
      bodyUsed: false,
      clone: () => ({} as Response),
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob([]),
      formData: async () => new FormData(),
      text: async () => '',
    } as Response);

    // Send a prompt
    await client.sendPrompt('Hello, world!');

    // Get the request body from the fetch call
    const fetchCall = (global.fetch as sinon.SinonStub).getCall(0);
    const requestBody = JSON.parse(fetchCall.args[1].body);

    // Check that the system prompt is included
    expect(requestBody.messages[0].role).toBe('system');
    expect(requestBody.messages[0].content).toBe('You are a helpful assistant.');

    // Check that the user prompt is included
    expect(requestBody.messages[1].role).toBe('user');
    expect(requestBody.messages[1].content).toContain('Hello, world!');
    expect(requestBody.messages[1].content).toContain('Available tools: test-tool');
  });

  /**
   * @test TEST-MCP-062 Test that the client can extract tool calls from responses
   */
  test('should extract tool calls from responses', async () => {
    // Set up the fetch stub to return a response with a tool call
    (global.fetch as sinon.SinonStub).resolves({
      ok: true,
      json: async () => ({
        model: 'test-model',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: '```json\n{"tool":"test-tool","function":"test-function","parameters":{"param1":"value1"}}\n```'
        },
        done: true
      }),
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
      type: 'basic',
      url: 'http://localhost:11434/v1/chat/completions',
      redirected: false,
      body: null,
      bodyUsed: false,
      clone: () => ({} as Response),
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob([]),
      formData: async () => new FormData(),
      text: async () => '',
    } as Response);

    // For the follow-up request
    (global.fetch as sinon.SinonStub).onSecondCall().resolves({
      ok: true,
      json: async () => ({
        model: 'test-model',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Tool execution result: test-result'
        },
        done: true
      }),
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
      type: 'basic',
      url: 'http://localhost:11434/v1/chat/completions',
      redirected: false,
      body: null,
      bodyUsed: false,
      clone: () => ({} as Response),
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob([]),
      formData: async () => new FormData(),
      text: async () => '',
    } as Response);

    // Send a prompt
    const response = await client.sendPrompt('Use the test-tool');

    // Check that the tool was executed and the follow-up response is returned
    expect(response).toBe('Tool execution result: test-result');
    expect((global.fetch as sinon.SinonStub).calledTwice).toBe(true);
    expect(toolRegistry.executeFunction.calledOnce).toBe(true);
  });

  /**
   * @test TEST-MCP-063 Test that the client can use different endpoints
   */
  test('should use the specified endpoint', async () => {
    // Create a client with a different endpoint
    const huggingFaceConfig: LLMConfig = {
      provider: LLMProvider.HuggingFace,
      model: 'gpt2',
      endpoint: 'http://localhost:8080/v1/chat/completions'
    };

    const huggingFaceClient = new LLMBridgeClient(huggingFaceConfig, toolRegistry, logger);

    // Set up the fetch stub to return a successful response
    (global.fetch as sinon.SinonStub).resolves({
      ok: true,
      json: async () => ({
        model: 'gpt2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Test response from Hugging Face'
        },
        done: true
      }),
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
      type: 'basic',
      url: 'http://localhost:8080/v1/chat/completions',
      redirected: false,
      body: null,
      bodyUsed: false,
      clone: () => ({} as Response),
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob([]),
      formData: async () => new FormData(),
      text: async () => '',
    } as Response);

    // Send a prompt
    await huggingFaceClient.sendPrompt('Hello from Hugging Face');

    // Check that the fetch was called with the correct URL
    const fetchCall = (global.fetch as sinon.SinonStub).getCall(0);
    expect(fetchCall.args[0]).toBe('http://localhost:8080/v1/chat/completions');
  });

  /**
   * @test TEST-MCP-064 Test that the client can clear conversation history
   */
  test('should clear conversation history', async () => {
    // Set up the fetch stub to return a successful response
    (global.fetch as sinon.SinonStub).resolves({
      ok: true,
      json: async () => ({
        model: 'test-model',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Test response'
        },
        done: true
      }),
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
      type: 'basic',
      url: 'http://localhost:11434/v1/chat/completions',
      redirected: false,
      body: null,
      bodyUsed: false,
      clone: () => ({} as Response),
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob([]),
      formData: async () => new FormData(),
      text: async () => '',
    } as Response);

    // Send a prompt to add to conversation history
    await client.sendPrompt('Hello, world!');

    // Check that the conversation history has messages
    const history = client.getConversationHistory();
    expect(history.length).toBeGreaterThan(1);

    // Clear conversation history
    client.clearConversationHistory();

    // Check that the conversation history only has the system message
    const clearedHistory = client.getConversationHistory();
    expect(clearedHistory.length).toBe(1);
    expect(clearedHistory[0].role).toBe(MessageRole.System);
  });
});
