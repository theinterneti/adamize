/**
 * @file Test suite for MCP Bridge Manager
 * @description Tests for the MCP Bridge Manager component adapted from ollama-mcp-bridge
 *
 * @requirement REQ-MCP-080 Manage MCP bridge lifecycle
 * @requirement REQ-MCP-081 Configure MCP bridge settings
 * @requirement REQ-MCP-082 Integrate with VS Code extension
 * @requirement REQ-MCP-083 Handle multiple MCP bridges
 */

import * as sinon from 'sinon';
import { expect, jest, describe, test, beforeEach, afterEach } from '@jest/globals';
import * as vscode from 'vscode';

// Import the components we'll be testing
import { MCPBridgeManager } from '../../../../mcp/mcpBridgeManager';
import { MCPBridge } from '../../../../mcp/mcpBridge';
import { LLMProvider } from '../../../../mcp/llmClient';

// Mock the MCPBridge class
jest.mock('../../../../mcp/mcpBridge');

// Mock vscode commands
// We can't directly assign to vscode.commands because it's read-only
// Instead, we'll use a type assertion to bypass TypeScript's readonly check
// This is only for testing purposes
const mockCommands = {
    registerCommand: jest.fn().mockReturnValue({
        dispose: jest.fn()
    })
};
// Use Object.defineProperty to override the commands property
Object.defineProperty(vscode, 'commands', { value: mockCommands });

describe('MCP Bridge Manager', () => {
    let manager: MCPBridgeManager;
    let outputChannel: vscode.OutputChannel;
    let context: vscode.ExtensionContext;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Reset mocks
        jest.clearAllMocks();

        // Create a mock output channel
        outputChannel = {
            appendLine: jest.fn(),
            show: jest.fn()
        } as unknown as vscode.OutputChannel;

        // Create a mock extension context
        context = {
            subscriptions: [],
            extensionPath: '/test/path',
            globalState: {
                get: jest.fn().mockImplementation((_key, defaultValue) => defaultValue),
                update: jest.fn().mockImplementation(async () => {})
            } as unknown as vscode.Memento,
            workspaceState: {
                get: jest.fn().mockImplementation((_key, defaultValue) => defaultValue),
                update: jest.fn().mockImplementation(async () => {})
            } as unknown as vscode.Memento,
            secrets: {
                get: jest.fn().mockImplementation(async () => null),
                store: jest.fn().mockImplementation(async () => {}),
                delete: jest.fn().mockImplementation(async () => {})
            },
            extensionUri: vscode.Uri.file('/test/path')
        } as unknown as vscode.ExtensionContext;

        // Set up MCPBridge mock
        (MCPBridge as jest.Mock).mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            registerTool: jest.fn(),
            unregisterTool: jest.fn(),
            getAllTools: jest.fn().mockReturnValue([]),
            sendPrompt: jest.fn().mockImplementation(async () => 'Test response'),
            clearConversationHistory: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        }));

        // Create the manager
        manager = new MCPBridgeManager(context, outputChannel);
    });

    afterEach(() => {
        sandbox.restore();
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

        // Check that the bridge was created
        expect(bridgeId).toBeDefined();
        expect(MCPBridge).toHaveBeenCalledTimes(1);

        // Get the bridge
        const bridge = manager.getBridge(bridgeId);
        expect(bridge).toBeDefined();

        // Start the bridge
        manager.startBridge(bridgeId);
        expect(bridge).toBeDefined();
        expect(bridge?.start).toHaveBeenCalledTimes(1);

        // Stop the bridge
        manager.stopBridge(bridgeId);
        expect(bridge).toBeDefined();
        expect(bridge?.stop).toHaveBeenCalledTimes(1);

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

        // Check that the bridge was recreated with the new settings
        expect(MCPBridge).toHaveBeenCalledTimes(2);
        expect((MCPBridge as jest.Mock).mock.calls[1][0]).toMatchObject({
            llmProvider: LLMProvider.Ollama,
            llmModel: 'llama2',
            llmEndpoint: 'http://localhost:11434/v1/chat/completions',
            systemPrompt: 'You are a helpful assistant.',
            temperature: 0.7,
            maxTokens: 1000
        });
    });

    /**
     * @test TEST-MCP-082 Test that the manager can integrate with VS Code extension
     */
    test('should integrate with VS Code extension', () => {
        // Create a bridge
        const bridgeId = manager.createBridge({
            llmProvider: LLMProvider.Ollama,
            llmModel: 'llama2',
            llmEndpoint: 'http://localhost:11434/v1/chat/completions'
        });

        // Get the bridge
        const bridge = manager.getBridge(bridgeId);

        // Start the bridge
        manager.startBridge(bridgeId);

        // Register a command
        const disposable = manager.registerCommand('test.command', () => {});

        // Check that the command was registered
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith('test.command', expect.any(Function));
        expect(context.subscriptions).toContain(disposable);

        // Dispose the manager
        manager.dispose();

        // Check that all bridges were stopped
        expect(bridge).toBeDefined();
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

        // Check that both bridges were created
        expect(bridgeId1).not.toBe(bridgeId2);
        expect(MCPBridge).toHaveBeenCalledTimes(2);

        // Get all bridges
        const bridges = manager.getAllBridges();
        expect(bridges.length).toBe(2);
        expect(bridges.map(b => b.id)).toContain(bridgeId1);
        expect(bridges.map(b => b.id)).toContain(bridgeId2);

        // Start all bridges
        manager.startAllBridges();

        // Get the bridges and check they were started
        const bridge1 = manager.getBridge(bridgeId1);
        const bridge2 = manager.getBridge(bridgeId2);

        expect(bridge1).toBeDefined();
        expect(bridge2).toBeDefined();
        expect(bridge1?.start).toHaveBeenCalledTimes(1);
        expect(bridge2?.start).toHaveBeenCalledTimes(1);

        // Stop all bridges
        manager.stopAllBridges();

        // We already have the bridge references, so we can use them directly
        expect(bridge1?.stop).toHaveBeenCalledTimes(1);
        expect(bridge2?.stop).toHaveBeenCalledTimes(1);
    });
});
