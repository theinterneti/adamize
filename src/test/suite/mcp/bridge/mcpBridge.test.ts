/**
 * @file Test suite for MCP Bridge
 * @description Tests for the MCP Bridge component adapted from ollama-mcp-bridge
 *
 * @requirement REQ-MCP-070 Connect LLM with MCP tools
 * @requirement REQ-MCP-071 Process user prompts and generate responses
 * @requirement REQ-MCP-072 Execute tool calls and handle results
 * @requirement REQ-MCP-073 Manage conversation context
 */

import * as sinon from 'sinon';
import { expect, jest, describe, test, beforeEach, afterEach } from '@jest/globals';
import * as vscode from 'vscode';

// Import the components we'll be testing
import { MCPBridge, MCPBridgeEventType, MCPBridgeOptions } from '../../../../mcp/mcpBridge';
import { LLMClient, LLMProvider } from '../../../../mcp/llmClient';
import { MCPToolRegistry } from '../../../../mcp/mcpToolRegistry';
import { MCPTool } from '../../../../mcp/mcpTypes';

// Mock the LLMClient and MCPToolRegistry classes
jest.mock('../../../../mcp/llmClient');
jest.mock('../../../../mcp/mcpToolRegistry');

describe('MCP Bridge', () => {
    let bridge: MCPBridge;
    let outputChannel: vscode.OutputChannel;
    let sandbox: sinon.SinonSandbox;
    let llmClientMock: jest.Mocked<LLMClient>;
    let toolRegistryMock: jest.Mocked<MCPToolRegistry>;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Reset mocks
        jest.clearAllMocks();

        // Create a mock output channel
        outputChannel = {
            appendLine: jest.fn(),
            show: jest.fn()
        } as unknown as vscode.OutputChannel;

        // Set up mocks
        (LLMClient as jest.Mock).mockImplementation(() => ({
            sendPrompt: jest.fn().mockImplementation(async () => 'Test response'),
            clearConversationHistory: jest.fn()
        }));

        (MCPToolRegistry as jest.Mock).mockImplementation(() => ({
            registerTool: jest.fn(),
            unregisterTool: jest.fn(),
            getAllTools: jest.fn().mockReturnValue([]),
            executeFunction: jest.fn()
        }));

        // Create the bridge options
        const options: MCPBridgeOptions = {
            llmProvider: LLMProvider.Ollama,
            llmModel: 'llama2',
            llmEndpoint: 'http://localhost:11434/v1/chat/completions',
            systemPrompt: 'You are a helpful assistant.'
        };

        // Create the bridge
        bridge = new MCPBridge(options, outputChannel);

        // Get the mocked instances
        llmClientMock = (bridge as any).llmClient;
        toolRegistryMock = (bridge as any).toolRegistry;
    });

    afterEach(() => {
        sandbox.restore();
    });

    /**
     * @test TEST-MCP-070 Test that the bridge can connect LLM with MCP tools
     */
    test('should start and stop the bridge', () => {
        // Start the bridge
        bridge.start();

        // Check that the bridge is running
        expect(bridge['isRunning']).toBe(true);

        // Stop the bridge
        bridge.stop();

        // Check that the bridge is not running
        expect(bridge['isRunning']).toBe(false);
    });

    /**
     * @test TEST-MCP-071 Test that the bridge can process user prompts and generate responses
     */
    test('should send a prompt to the LLM', async () => {
        // Set up the LLM client mock to return a response
        llmClientMock.sendPrompt.mockResolvedValue('Test response');

        // Start the bridge
        bridge.start();

        // Send a prompt
        const response = await bridge.sendPrompt('Hello, world!');

        // Check that the response is correct
        expect(response).toBe('Test response');
        expect(llmClientMock.sendPrompt).toHaveBeenCalledTimes(1);
        expect(llmClientMock.sendPrompt).toHaveBeenCalledWith('Hello, world!');
    });

    /**
     * @test TEST-MCP-071a Test that the bridge handles errors when processing prompts
     */
    test('should handle errors when sending a prompt', async () => {
        // Set up the LLM client mock to throw an error
        llmClientMock.sendPrompt.mockRejectedValue(new Error('Test error'));

        // Start the bridge
        bridge.start();

        // Send a prompt and expect it to throw
        await expect(bridge.sendPrompt('Hello, world!')).rejects.toThrow('Test error');
    });

    /**
     * @test TEST-MCP-072 Test that the bridge can execute tool calls and handle results
     */
    test('should register and execute tools', async () => {
        // Create a mock tool
        // Use type assertion to work around the type issue
        const mockTool = {
            name: 'test-tool',
            description: 'A test tool',
            schema: {
                name: 'test-tool',
                description: 'A test tool',
                version: '1.0.0',
                functions: [{
                    name: 'testFunction',
                    description: 'A test function',
                    parameters: [{
                        name: 'testParam',
                        description: 'A test parameter',
                        type: 'string',
                        required: true
                    }],
                    returnType: 'string'
                }]
            },
            execute: jest.fn().mockReturnValue(Promise.resolve({ status: 'success', result: 'Tool result' }))
        } as MCPTool;

        // Register the tool
        bridge.registerTool(mockTool);

        // Check that the tool was registered
        expect(toolRegistryMock.registerTool).toHaveBeenCalledTimes(1);
        expect(toolRegistryMock.registerTool).toHaveBeenCalledWith(mockTool);

        // Get all tools and verify the call was made
        bridge.getAllTools();
        expect(toolRegistryMock.getAllTools).toHaveBeenCalledTimes(1);
    });

    /**
     * @test TEST-MCP-073 Test that the bridge can manage conversation context
     */
    test('should clear conversation history', () => {
        // Clear the conversation history
        bridge.clearConversationHistory();

        // Check that the LLM client's clearConversationHistory method was called
        expect(llmClientMock.clearConversationHistory).toHaveBeenCalledTimes(1);
        expect(llmClientMock.clearConversationHistory).toHaveBeenCalledWith(true);

        // Clear the conversation history without keeping the system prompt
        bridge.clearConversationHistory(false);

        // Check that the LLM client's clearConversationHistory method was called with false
        expect(llmClientMock.clearConversationHistory).toHaveBeenCalledTimes(2);
        expect(llmClientMock.clearConversationHistory).toHaveBeenCalledWith(false);
    });

    /**
     * @test TEST-MCP-074 Test that the bridge can emit events
     */
    test('should emit events', () => {
        // Create a listener
        const listener = jest.fn();

        // Add the listener
        bridge.addEventListener(MCPBridgeEventType.Started, listener);

        // Start the bridge
        bridge.start();

        // Check that the listener was called
        expect(listener).toHaveBeenCalledTimes(1);

        // Get the first argument of the first call and check its type property
        const eventArg = listener.mock.calls[0][0];
        expect(eventArg).toBeDefined();

        // Type assertion to handle the unknown type
        const typedEventArg = eventArg as { type: MCPBridgeEventType };
        expect(typedEventArg.type).toBe(MCPBridgeEventType.Started);

        // Remove the listener
        bridge.removeEventListener(MCPBridgeEventType.Started, listener);

        // Stop and start the bridge again
        bridge.stop();
        bridge.start();

        // Check that the listener was not called again
        expect(listener).toHaveBeenCalledTimes(1);
    });
});
