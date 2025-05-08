/**
 * @file Test suite for MCP Tool Registry
 * @description Tests for the Tool Registry component adapted from ollama-mcp-bridge
 *
 * @requirement REQ-MCP-050 Register tools with metadata
 * @requirement REQ-MCP-051 Detect appropriate tools from user prompts
 * @requirement REQ-MCP-052 Generate format instructions for tools
 * @requirement REQ-MCP-053 Generate example arguments for tool schemas
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';

// Import the component we'll be testing
import { MCPToolRegistry } from '../../../mcp/mcpToolRegistry';
import { MCPTool } from '../../../mcp/mcpTypes';

describe('MCP Tool Registry', () => {
    /**
     * @test TEST-MCP-050 Test that tools can be registered with metadata
     */
    test('should register tools with metadata', () => {
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
        expect(allTools.length).toBe(1);
        expect(allTools[0].name).toBe('test-tool');
    });

    /**
     * @test TEST-MCP-051 Test that tools can be unregistered
     */
    test('should unregister tools', () => {
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
        expect(allTools.length).toBe(0);
    });

    /**
     * @test TEST-MCP-052 Test that tool instructions can be generated
     */
    test('should generate tool instructions', () => {
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
        expect(instructions).toBeDefined();
        expect(instructions!.includes('test-tool')).toBe(true);

        // Check that the instructions contain the function name
        expect(instructions!.includes('testFunction')).toBe(true);

        // Check that the instructions contain the parameter
        expect(instructions!.includes('testParam')).toBe(true);

        // Check that the instructions include the JSON format
        expect(instructions!.includes('json')).toBe(true);
    });

    /**
     * @test TEST-MCP-053 Test that example arguments can be generated for functions
     */
    test('should generate example arguments for functions', () => {
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
        expect(exampleArgs).toBeDefined();
        if (exampleArgs) {
            expect(typeof exampleArgs.stringParam).toBe('string');
            expect(typeof exampleArgs.numberParam).toBe('number');
            expect(typeof exampleArgs.booleanParam).toBe('boolean');
            expect(typeof exampleArgs.objectParam).toBe('object');
            expect(Array.isArray(exampleArgs.arrayParam)).toBe(true);
        }
    });

    /**
     * @test TEST-MCP-051 Test that appropriate tools can be detected from user prompts
     */
    test('should detect appropriate tools from user prompts', () => {
        // Create a mock output channel
        const outputChannel = {
            appendLine: () => {},
            show: () => {}
        } as unknown as vscode.OutputChannel;

        const registry = new MCPToolRegistry(outputChannel);

        // Register tools with metadata
        const searchTool: MCPTool = {
            name: 'search-tool',
            description: 'A tool for searching',
            schema: {
                name: 'search-tool',
                description: 'A tool for searching',
                version: '1.0.0',
                functions: [{
                    name: 'search',
                    description: 'Search for something',
                    parameters: [{
                        name: 'query',
                        description: 'Search query',
                        type: 'string',
                        required: true
                    }],
                    returnType: 'object'
                }]
            },
            execute: async () => 'Test result'
        };

        const weatherTool: MCPTool = {
            name: 'weather-tool',
            description: 'A tool for getting weather information',
            schema: {
                name: 'weather-tool',
                description: 'A tool for getting weather information',
                version: '1.0.0',
                functions: [{
                    name: 'getWeather',
                    description: 'Get weather for a location',
                    parameters: [{
                        name: 'location',
                        description: 'Location',
                        type: 'string',
                        required: true
                    }],
                    returnType: 'object'
                }]
            },
            execute: async () => 'Test result'
        };

        const calculatorTool: MCPTool = {
            name: 'calculator-tool',
            description: 'A tool for performing calculations',
            schema: {
                name: 'calculator-tool',
                description: 'A tool for performing calculations',
                version: '1.0.0',
                functions: [{
                    name: 'calculate',
                    description: 'Perform a calculation',
                    parameters: [{
                        name: 'expression',
                        description: 'Math expression',
                        type: 'string',
                        required: true
                    }],
                    returnType: 'number'
                }]
            },
            execute: async () => 'Test result'
        };

        // Register tools with custom metadata
        registry.registerTool(searchTool, {
            keywords: ['search', 'find', 'lookup', 'query'],
            priority: 1
        });

        registry.registerTool(weatherTool, {
            keywords: ['weather', 'temperature', 'forecast', 'rain', 'snow'],
            priority: 1
        });

        registry.registerTool(calculatorTool, {
            keywords: ['calculate', 'math', 'computation', 'formula'],
            priority: 1
        });

        // Test detection with different prompts
        const searchPrompt = "Can you search for information about climate change?";
        const weatherPrompt = "What's the weather like in New York today?";
        const calculatorPrompt = "Calculate the square root of 144";
        const mixedPrompt = "I need to find the weather forecast and calculate the average temperature";

        // Check that the correct tools are detected
        const searchTools = registry.detectToolsForPrompt(searchPrompt);
        expect(searchTools).toContain('search-tool');

        const weatherTools = registry.detectToolsForPrompt(weatherPrompt);
        expect(weatherTools).toContain('weather-tool');

        const calculatorTools = registry.detectToolsForPrompt(calculatorPrompt);
        expect(calculatorTools).toContain('calculator-tool');

        const mixedTools = registry.detectToolsForPrompt(mixedPrompt);
        expect(mixedTools).toContain('weather-tool');
        expect(mixedTools.length).toBeGreaterThanOrEqual(1);
    });
});
