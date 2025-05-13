/**
 * @file Test suite for MCP Bridge Tool Execution
 * @description Tests for the MCP Bridge tool execution functionality
 *
 * @requirement REQ-MCP-072 Execute tool calls and handle results
 */

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

describe('MCP Bridge Tool Execution', () => {
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
            show: jest.fn()
        } as unknown as vscode.OutputChannel;

        // Set up mocks
        (LLMClient as jest.Mock).mockImplementation(() => ({
            sendPrompt: jest.fn().mockImplementation(async () => 'Test response'),
            clearConversationHistory: jest.fn(),
            streamPrompt: jest.fn()
        }));

        (MCPToolRegistry as jest.Mock).mockImplementation(() => ({
            registerTool: jest.fn(),
            unregisterTool: jest.fn(),
            getAllTools: jest.fn().mockReturnValue([]),
            executeFunction: jest.fn().mockResolvedValue({ result: 'Tool execution result' })
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

        // Start the bridge
        bridge.start();
    });

    /**
     * @test TEST-MCP-072-001 Test that the bridge can execute a tool call
     */
    test('should execute a tool call', async () => {
        // Set up the tool registry mock to return a result
        toolRegistryMock.executeFunction.mockResolvedValue({ result: 'Tool execution result' });

        // Execute a tool call
        const result = await bridge.callTool('test-tool', 'testFunction', { param: 'value' });

        // Check that the tool registry's executeFunction method was called
        expect(toolRegistryMock.executeFunction).toHaveBeenCalledTimes(1);
        expect(toolRegistryMock.executeFunction).toHaveBeenCalledWith('test-tool', 'testFunction', { param: 'value' });

        // Check that the result is correct
        expect(result).toEqual({ result: 'Tool execution result' });
    });

    /**
     * @test TEST-MCP-072-002 Test that the bridge handles errors when executing a tool call
     */
    test('should handle errors when executing a tool call', async () => {
        // Set up the tool registry mock to throw an error
        toolRegistryMock.executeFunction.mockRejectedValue(new Error('Tool execution error'));

        // Execute a tool call and expect it to throw
        await expect(bridge.callTool('test-tool', 'testFunction', { param: 'value' }))
            .rejects.toThrow('Tool execution error');
    });

    /**
     * @test TEST-MCP-072-003 Test that the bridge emits events when executing a tool call
     */
    test('should emit events when executing a tool call', async () => {
        // Create a listener
        const listener = jest.fn();

        // Add the listener
        bridge.addEventListener(MCPBridgeEventType.ToolCallExecuted, listener);

        // Execute a tool call
        await bridge.callTool('test-tool', 'testFunction', { param: 'value' });

        // Check that the listener was called
        expect(listener).toHaveBeenCalledTimes(1);

        // Get the first argument of the first call and check its type property
        const eventArg = listener.mock.calls[0][0];
        expect(eventArg).toBeDefined();

        // Type assertion to handle the unknown type
        const typedEventArg = eventArg as { type: MCPBridgeEventType; data: any };
        expect(typedEventArg.type).toBe(MCPBridgeEventType.ToolCallExecuted);
        expect(typedEventArg.data).toEqual({
            tool: 'test-tool',
            function: 'testFunction',
            parameters: { param: 'value' },
            result: { result: 'Tool execution result' }
        });
    });

    /**
     * @test TEST-MCP-072-004 Test that the bridge cannot execute a tool call when not running
     */
    test('should not execute a tool call when not running', async () => {
        // Stop the bridge
        bridge.stop();

        // Execute a tool call and expect it to throw
        await expect(bridge.callTool('test-tool', 'testFunction', { param: 'value' }))
            .rejects.toThrow('MCP bridge is not running');
    });

    /**
     * @test TEST-MCP-072-005 Test that the bridge can execute a tool call with complex parameters
     */
    test('should execute a tool call with complex parameters', async () => {
        // Set up the tool registry mock to return a result
        toolRegistryMock.executeFunction.mockResolvedValue({ result: 'Complex tool execution result' });

        // Execute a tool call with complex parameters
        const complexParams = {
            stringParam: 'string value',
            numberParam: 42,
            booleanParam: true,
            arrayParam: [1, 2, 3],
            objectParam: { key: 'value' }
        };
        const result = await bridge.callTool('test-tool', 'testFunction', complexParams);

        // Check that the tool registry's executeFunction method was called with the complex parameters
        expect(toolRegistryMock.executeFunction).toHaveBeenCalledTimes(1);
        expect(toolRegistryMock.executeFunction).toHaveBeenCalledWith('test-tool', 'testFunction', complexParams);

        // Check that the result is correct
        expect(result).toEqual({ result: 'Complex tool execution result' });
    });
});
