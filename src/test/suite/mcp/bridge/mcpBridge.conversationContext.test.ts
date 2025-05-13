/**
 * @file Test suite for MCP Bridge Conversation Context
 * @description Tests for the MCP Bridge conversation context management functionality
 *
 * @requirement REQ-MCP-073 Manage conversation context
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as vscode from 'vscode';

// Import the components we'll be testing
import { LLMClient, LLMProvider, MessageRole } from '../../../../mcp/llmClient';
import { MCPBridge, MCPBridgeOptions } from '../../../../mcp/mcpBridge';
import { MCPToolRegistry } from '../../../../mcp/mcpToolRegistry';

// Mock the LLMClient and MCPToolRegistry classes
jest.mock('../../../../mcp/llmClient');
jest.mock('../../../../mcp/mcpToolRegistry');

describe('MCP Bridge Conversation Context', () => {
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
      getConversationHistory: jest.fn().mockReturnValue([
        { role: MessageRole.System, content: 'You are a helpful assistant.' },
        { role: MessageRole.User, content: 'Hello' },
        { role: MessageRole.Assistant, content: 'Hi there!' },
      ]),
      updateSystemPrompt: jest.fn(),
      streamPrompt: jest.fn(),
    }));

    (MCPToolRegistry as jest.Mock).mockImplementation(() => ({
      registerTool: jest.fn(),
      unregisterTool: jest.fn(),
      getAllTools: jest.fn().mockReturnValue([]),
      executeFunction: jest.fn().mockResolvedValue({ result: 'Tool execution result' }),
    }));

    // Create the bridge options
    const options: MCPBridgeOptions = {
      llmProvider: LLMProvider.Ollama,
      llmModel: 'llama2',
      llmEndpoint: 'http://localhost:11434/v1/chat/completions',
      systemPrompt: 'You are a helpful assistant.',
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
   * @test TEST-MCP-073-001 Test that the bridge can clear conversation history
   */
  test('should clear conversation history', () => {
    // Clear the conversation history
    bridge.clearConversationHistory();

    // Check that the LLM client's clearConversationHistory method was called
    expect(llmClientMock.clearConversationHistory).toHaveBeenCalledTimes(1);
    expect(llmClientMock.clearConversationHistory).toHaveBeenCalledWith(true);
  });

  /**
   * @test TEST-MCP-073-002 Test that the bridge can clear conversation history without keeping system prompt
   */
  test('should clear conversation history without keeping system prompt', () => {
    // Clear the conversation history without keeping the system prompt
    bridge.clearConversationHistory(false);

    // Check that the LLM client's clearConversationHistory method was called with false
    expect(llmClientMock.clearConversationHistory).toHaveBeenCalledTimes(1);
    expect(llmClientMock.clearConversationHistory).toHaveBeenCalledWith(false);
  });

  /**
   * @test TEST-MCP-073-003 Test that the bridge can get conversation history
   */
  test('should get conversation history', () => {
    // Get the conversation history
    const history = bridge.getConversationHistory();

    // Check that the LLM client's getConversationHistory method was called
    expect(llmClientMock.getConversationHistory).toHaveBeenCalledTimes(1);

    // Check that the history is correct
    expect(history).toEqual([
      { role: MessageRole.System, content: 'You are a helpful assistant.' },
      { role: MessageRole.User, content: 'Hello' },
      { role: MessageRole.Assistant, content: 'Hi there!' },
    ]);
  });

  /**
   * @test TEST-MCP-073-004 Test that the bridge maintains context across multiple prompts
   */
  test('should maintain context across multiple prompts', async () => {
    // Set up the LLM client mock to return different responses for different prompts
    llmClientMock.sendPrompt
      .mockResolvedValueOnce('First response')
      .mockResolvedValueOnce('Second response');

    // Send the first prompt
    const firstResponse = await bridge.sendPrompt('First prompt');
    expect(firstResponse).toBe('First response');

    // Send the second prompt
    const secondResponse = await bridge.sendPrompt('Second prompt');
    expect(secondResponse).toBe('Second response');

    // Check that the LLM client's sendPrompt method was called twice
    expect(llmClientMock.sendPrompt).toHaveBeenCalledTimes(2);
    expect(llmClientMock.sendPrompt).toHaveBeenNthCalledWith(1, 'First prompt');
    expect(llmClientMock.sendPrompt).toHaveBeenNthCalledWith(2, 'Second prompt');
  });

  /**
   * @test TEST-MCP-073-005 Test that the bridge can update the system prompt
   */
  test('should update the system prompt', () => {
    // Update the system prompt
    bridge.updateSystemPrompt('New system prompt');

    // Check that the LLM client's updateSystemPrompt method was called
    expect(llmClientMock.updateSystemPrompt).toHaveBeenCalledTimes(1);
    expect(llmClientMock.updateSystemPrompt).toHaveBeenCalledWith('New system prompt');
  });
});
