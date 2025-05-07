/**
 * @file Test suite for MCP Tool Registry
 * @description Tests for the Tool Registry component adapted from ollama-mcp-bridge
 *
 * @requirement REQ-MCP-050 Register tools with metadata
 * @requirement REQ-MCP-051 Detect appropriate tools from user prompts
 * @requirement REQ-MCP-052 Generate format instructions for tools
 * @requirement REQ-MCP-053 Generate example arguments for tool schemas
 */

import { strict as assert } from 'assert';
import { describe, it } from 'mocha';
import * as vscode from 'vscode';

// Import the component we'll be testing
// This will be implemented after forking and adapting the ollama-mcp-bridge repository
import { MCPToolRegistry } from '../../../mcp/mcpToolRegistry';
import { MCPTool } from '../../../mcp/mcpTypes';

describe('MCP Tool Registry', () => {
    /**
     * @test TEST-MCP-050 Test that tools can be registered with metadata
     */
    it('should register tools with metadata', () => {
        // Create a mock output channel
        const outputChannel = {
            appendLine: () => {},
            show: () => {}
        } as unknown as vscode.OutputChannel;

        const registry = new MCPToolRegistry(outputChannel);
        const testTool: MCPTool = {
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
            execute: async () => 'Test result'
        };

        registry.registerTool(testTool);

        // Check that the tool was registered
        const allTools = registry.getAllTools();
        assert.strictEqual(allTools.length, 1);
        assert.strictEqual(allTools[0].name, 'test-tool');
    });

    /**
     * @test TEST-MCP-051 Test that tools can be unregistered
     */
    it('should unregister tools', () => {
        // Create a mock output channel
        const outputChannel = {
            appendLine: () => {},
            show: () => {}
        } as unknown as vscode.OutputChannel;

        const registry = new MCPToolRegistry(outputChannel);
        const testTool: MCPTool = {
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
            execute: async () => 'Test result'
        };

        // Register and then unregister the tool
        registry.registerTool(testTool);
        registry.unregisterTool('test-tool');

        // Check that the tool was unregistered
        const allTools = registry.getAllTools();
        assert.strictEqual(allTools.length, 0);
    });

    /**
     * @test TEST-MCP-052 Test that tool instructions can be generated
     */
    it('should generate tool instructions', () => {
        // Create a mock output channel
        const outputChannel = {
            appendLine: () => {},
            show: () => {}
        } as unknown as vscode.OutputChannel;

        const registry = new MCPToolRegistry(outputChannel);
        const testTool: MCPTool = {
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
            execute: async () => 'Test result'
        };

        registry.registerTool(testTool);

        // Get the instructions
        const instructions = registry.getToolInstructions();

        // Check that the instructions contain the tool name
        assert.strictEqual(instructions!.includes('test-tool'), true);

        // Check that the instructions contain the function name
        assert.strictEqual(instructions!.includes('testFunction'), true);

        // Check that the instructions contain the parameter
        assert.strictEqual(instructions!.includes('testParam'), true);

        // Check that the instructions include the JSON format
        assert.strictEqual(instructions!.includes('json'), true);
    });

    /**
     * @test TEST-MCP-053 Test that example arguments can be generated for functions
     */
    it('should generate example arguments for functions', () => {
        // Create a mock output channel
        const outputChannel = {
            appendLine: () => {},
            show: () => {}
        } as unknown as vscode.OutputChannel;

        const registry = new MCPToolRegistry(outputChannel);
        const complexTool: MCPTool = {
            name: 'complex-tool',
            description: 'A complex test tool',
            schema: {
                name: 'complex-tool',
                description: 'A complex test tool',
                version: '1.0.0',
                functions: [{
                    name: 'complexFunction',
                    description: 'A complex function',
                    parameters: [
                        {
                            name: 'stringParam',
                            description: 'A string parameter',
                            type: 'string',
                            required: true
                        },
                        {
                            name: 'numberParam',
                            description: 'A number parameter',
                            type: 'number',
                            required: false
                        },
                        {
                            name: 'booleanParam',
                            description: 'A boolean parameter',
                            type: 'boolean',
                            required: false
                        },
                        {
                            name: 'objectParam',
                            description: 'An object parameter',
                            type: 'object',
                            required: false
                        },
                        {
                            name: 'arrayParam',
                            description: 'An array parameter',
                            type: 'array',
                            required: false
                        }
                    ],
                    returnType: 'object'
                }]
            },
            execute: async () => 'Test result'
        };

        registry.registerTool(complexTool);

        // Generate example arguments
        const exampleArgs = registry.generateExampleArgs('complex-tool', 'complexFunction');

        // Check that the example arguments contain all parameter types
        assert.strictEqual(exampleArgs !== undefined, true);
        if (exampleArgs) {
            assert.strictEqual(typeof exampleArgs.stringParam, 'string');
            assert.strictEqual(typeof exampleArgs.numberParam, 'number');
            assert.strictEqual(typeof exampleArgs.booleanParam, 'boolean');
            assert.strictEqual(typeof exampleArgs.objectParam, 'object');
            assert.strictEqual(Array.isArray(exampleArgs.arrayParam), true);
        }
    });
});
