/**
 * @file Test suite for LLM Client
 * @description Tests for the LLM Client component adapted from ollama-mcp-bridge
 *
 * @requirement REQ-MCP-060 Connect to local LLM providers
 * @requirement REQ-MCP-061 Format prompts for LLM consumption
 * @requirement REQ-MCP-062 Process LLM responses and extract tool calls
 * @requirement REQ-MCP-063 Support multiple LLM providers
 */

import * as sinon from 'sinon';
import { expect, jest, describe, test, beforeEach, afterEach } from '@jest/globals';
import * as vscode from 'vscode';

// Import the component we'll be testing
import { LLMClient } from '../../../mcp/llmClient';
import { MCPToolRegistry } from '../../../mcp/mcpToolRegistry';
import { MCPTool } from '../../../mcp/mcpTypes';

describe('LLM Client', () => {
    let client: LLMClient;
    let toolRegistry: MCPToolRegistry;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Create a mock output channel
        const outputChannel = {
            appendLine: sinon.stub(),
            show: sinon.stub()
        } as unknown as vscode.OutputChannel;

        // Create a mock tool registry
        toolRegistry = new MCPToolRegistry(outputChannel);

        // Create a mock tool
        const mockTool: MCPTool = {
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
            execute: sinon.stub().resolves('Test result')
        };

        // Register the mock tool
        toolRegistry.registerTool(mockTool);

        // Create a mock LLM client
        client = new LLMClient(
            {
                model: 'test-model',
                endpoint: 'http://localhost:11434/v1/chat/completions'
            },
            toolRegistry,
            outputChannel
        );

        // Stub the fetch method to prevent actual network calls
        sandbox.stub(global, 'fetch').resolves({
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
            blob: async () => new Blob(),
            formData: async () => new FormData(),
            text: async () => '',
        } as Response);
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
            blob: async () => new Blob(),
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
            blob: async () => new Blob(),
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
        expect(requestBody.messages[0].content.includes('You are a helpful assistant')).toBe(true);

        // Check that the user prompt is included
        expect(requestBody.messages[1].role).toBe('user');
        expect(requestBody.messages[1].content.includes('Hello, world!')).toBe(true);
    });

    /**
     * @test TEST-MCP-062 Test that the client handles errors properly
     */
    test('should handle errors properly', async () => {
        // Set up the fetch stub to return an error
        (global.fetch as sinon.SinonStub).rejects(new Error('Network error'));

        // Send a prompt and expect it to throw
        await expect(client.sendPrompt('Hello, world!')).rejects.toThrow('Network error');
    });

    /**
     * @test TEST-MCP-063 Test that the client can use different endpoints
     */
    test('should use the specified endpoint', async () => {
        // Create a client with a different endpoint
        const outputChannel = {
            appendLine: sinon.stub(),
            show: sinon.stub()
        } as unknown as vscode.OutputChannel;

        const huggingFaceClient = new LLMClient(
            {
                model: 'gpt2',
                endpoint: 'http://localhost:8080/v1/chat/completions'
            },
            toolRegistry,
            outputChannel
        );

        // Set up the fetch stub to return a successful response
        (global.fetch as sinon.SinonStub).resolves({
            ok: true,
            json: async () => ({
                model: 'gpt2',
                created_at: new Date().toISOString(),
                message: {
                    role: 'assistant',
                    content: 'Response from Hugging Face'
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
            blob: async () => new Blob(),
            formData: async () => new FormData(),
            text: async () => '',
        } as Response);

        // Send a prompt
        await huggingFaceClient.sendPrompt('Hello from Hugging Face');

        // Check that the fetch was called with the correct URL
        const fetchCall = (global.fetch as sinon.SinonStub).getCall(0);
        expect(fetchCall.args[0]).toBe('http://localhost:8080/v1/chat/completions');
    });
});
