/**
 * @file Test suite for MCP Tool Registry
 * @description Tests for the Tool Registry component adapted from ollama-mcp-bridge
 *
 * @requirement REQ-MCP-050 Register tools with metadata
 * @requirement REQ-MCP-051 Detect appropriate tools from user prompts
 * @requirement REQ-MCP-052 Generate format instructions for tools
 * @requirement REQ-MCP-053 Generate example arguments for tool schemas
 * @requirement REQ-MCP-054 Support tool categorization
 * @requirement REQ-MCP-055 Generate context-aware examples
 * @requirement REQ-MCP-056 Implement defensive parameter checks
 * @requirement REQ-MCP-057 Support updating tool metadata
 */

import { expect } from '@jest/globals';
import * as vscode from 'vscode';

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
      show: () => {},
    } as unknown as vscode.OutputChannel;

    const registry = new MCPToolRegistry(outputChannel);
    const testTool: MCPTool = {
      name: 'test-tool',
      description: 'A test tool',
      schema: {
        name: 'test-tool',
        description: 'A test tool',
        version: '1.0.0',
        functions: [
          {
            name: 'testFunction',
            description: 'A test function',
            parameters: [
              {
                name: 'testParam',
                description: 'A test parameter',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'string',
          },
        ],
      },
      execute: async () => 'Test result',
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
      show: () => {},
    } as unknown as vscode.OutputChannel;

    const registry = new MCPToolRegistry(outputChannel);
    const testTool: MCPTool = {
      name: 'test-tool',
      description: 'A test tool',
      schema: {
        name: 'test-tool',
        description: 'A test tool',
        version: '1.0.0',
        functions: [
          {
            name: 'testFunction',
            description: 'A test function',
            parameters: [
              {
                name: 'testParam',
                description: 'A test parameter',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'string',
          },
        ],
      },
      execute: async () => 'Test result',
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
      show: () => {},
    } as unknown as vscode.OutputChannel;

    const registry = new MCPToolRegistry(outputChannel);
    const testTool: MCPTool = {
      name: 'test-tool',
      description: 'A test tool',
      schema: {
        name: 'test-tool',
        description: 'A test tool',
        version: '1.0.0',
        functions: [
          {
            name: 'testFunction',
            description: 'A test function',
            parameters: [
              {
                name: 'testParam',
                description: 'A test parameter',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'string',
          },
        ],
      },
      execute: async () => 'Test result',
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
      show: () => {},
    } as unknown as vscode.OutputChannel;

    const registry = new MCPToolRegistry(outputChannel);
    const complexTool: MCPTool = {
      name: 'complex-tool',
      description: 'A complex test tool',
      schema: {
        name: 'complex-tool',
        description: 'A complex test tool',
        version: '1.0.0',
        functions: [
          {
            name: 'complexFunction',
            description: 'A complex function',
            parameters: [
              {
                name: 'stringParam',
                description: 'A string parameter',
                type: 'string',
                required: true,
              },
              {
                name: 'numberParam',
                description: 'A number parameter',
                type: 'number',
                required: false,
              },
              {
                name: 'booleanParam',
                description: 'A boolean parameter',
                type: 'boolean',
                required: false,
              },
              {
                name: 'objectParam',
                description: 'An object parameter',
                type: 'object',
                required: false,
              },
              {
                name: 'arrayParam',
                description: 'An array parameter',
                type: 'array',
                required: false,
              },
            ],
            returnType: 'object',
          },
        ],
      },
      execute: async () => 'Test result',
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
      show: () => {},
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
        functions: [
          {
            name: 'search',
            description: 'Search for something',
            parameters: [
              {
                name: 'query',
                description: 'Search query',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'object',
          },
        ],
      },
      execute: async () => 'Test result',
    };

    const weatherTool: MCPTool = {
      name: 'weather-tool',
      description: 'A tool for getting weather information',
      schema: {
        name: 'weather-tool',
        description: 'A tool for getting weather information',
        version: '1.0.0',
        functions: [
          {
            name: 'getWeather',
            description: 'Get weather for a location',
            parameters: [
              {
                name: 'location',
                description: 'Location',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'object',
          },
        ],
      },
      execute: async () => 'Test result',
    };

    const calculatorTool: MCPTool = {
      name: 'calculator-tool',
      description: 'A tool for performing calculations',
      schema: {
        name: 'calculator-tool',
        description: 'A tool for performing calculations',
        version: '1.0.0',
        functions: [
          {
            name: 'calculate',
            description: 'Perform a calculation',
            parameters: [
              {
                name: 'expression',
                description: 'Math expression',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'number',
          },
        ],
      },
      execute: async () => 'Test result',
    };

    // Register tools with custom metadata
    registry.registerTool(searchTool, {
      keywords: ['search', 'find', 'lookup', 'query'],
      priority: 1,
    });

    registry.registerTool(weatherTool, {
      keywords: ['weather', 'temperature', 'forecast', 'rain', 'snow'],
      priority: 1,
    });

    registry.registerTool(calculatorTool, {
      keywords: ['calculate', 'math', 'computation', 'formula'],
      priority: 1,
    });

    // Test detection with different prompts
    const searchPrompt = 'Can you search for information about climate change?';
    const weatherPrompt = "What's the weather like in New York today?";
    const calculatorPrompt = 'Calculate the square root of 144';
    const mixedPrompt = 'I need to find the weather forecast and calculate the average temperature';

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

  /**
   * @test TEST-MCP-054 Test that the registry can categorize tools properly
   */
  test('should categorize tools properly', () => {
    // Create a mock output channel
    const outputChannel = {
      appendLine: () => {},
      show: () => {},
    } as unknown as vscode.OutputChannel;

    const registry = new MCPToolRegistry(outputChannel);

    // Register tools with categories
    const searchTool: MCPTool = {
      name: 'search-tool',
      description: 'A tool for searching',
      schema: {
        name: 'search-tool',
        description: 'A tool for searching',
        version: '1.0.0',
        functions: [
          {
            name: 'search',
            description: 'Search for something',
            parameters: [
              {
                name: 'query',
                description: 'Search query',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'object',
          },
        ],
      },
      execute: async () => 'Test result',
    };

    const weatherTool: MCPTool = {
      name: 'weather-tool',
      description: 'A tool for getting weather information',
      schema: {
        name: 'weather-tool',
        description: 'A tool for getting weather information',
        version: '1.0.0',
        functions: [
          {
            name: 'getWeather',
            description: 'Get weather for a location',
            parameters: [
              {
                name: 'location',
                description: 'Location',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'object',
          },
        ],
      },
      execute: async () => 'Test result',
    };

    // Register tools with categories
    registry.registerTool(searchTool, {
      keywords: ['search', 'find'],
      categories: ['Information', 'Utility'],
    });

    registry.registerTool(weatherTool, {
      keywords: ['weather', 'forecast'],
      categories: ['Information', 'Weather'],
    });

    // Get tool instructions
    const instructions = registry.getToolInstructions();

    // Check that the instructions are defined
    expect(instructions).toBeDefined();

    // Check that categories are included in the instructions
    expect(instructions!.includes('Category: Information')).toBe(true);
    expect(instructions!.includes('Category: Weather')).toBe(true);
    expect(instructions!.includes('Category: Utility')).toBe(true);

    // Test getting tools by category
    const infoTools = registry.getToolsByCategory('Information');
    expect(infoTools.length).toBe(2);
    expect(infoTools.map(t => t.name)).toContain('search-tool');
    expect(infoTools.map(t => t.name)).toContain('weather-tool');

    const weatherTools = registry.getToolsByCategory('Weather');
    expect(weatherTools.length).toBe(1);
    expect(weatherTools[0].name).toBe('weather-tool');

    const utilityTools = registry.getToolsByCategory('Utility');
    expect(utilityTools.length).toBe(1);
    expect(utilityTools[0].name).toBe('search-tool');
  });

  /**
   * @test TEST-MCP-055 Test that the registry can generate context-aware examples
   */
  test('should generate context-aware examples', () => {
    // Create a mock output channel
    const outputChannel = {
      appendLine: () => {},
      show: () => {},
    } as unknown as vscode.OutputChannel;

    const registry = new MCPToolRegistry(outputChannel);

    // Register a weather tool
    const weatherTool: MCPTool = {
      name: 'weather-tool',
      description: 'A tool for getting weather information',
      schema: {
        name: 'weather-tool',
        description: 'A tool for getting weather information',
        version: '1.0.0',
        functions: [
          {
            name: 'getWeather',
            description: 'Get weather for a location',
            parameters: [
              {
                name: 'location',
                description: 'Location to get weather for',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'object',
          },
        ],
      },
      execute: async () => 'Test result',
    };

    // Register a calculator tool
    const calculatorTool: MCPTool = {
      name: 'calculator-tool',
      description: 'A tool for performing calculations',
      schema: {
        name: 'calculator-tool',
        description: 'A tool for performing calculations',
        version: '1.0.0',
        functions: [
          {
            name: 'calculate',
            description: 'Perform a calculation',
            parameters: [
              {
                name: 'expression',
                description: 'Math expression',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'number',
          },
        ],
      },
      execute: async () => 'Test result',
    };

    // Register tools
    registry.registerTool(weatherTool);
    registry.registerTool(calculatorTool);

    // Generate examples for weather tool
    const weatherExamples = registry.generateExampleArgs('weather-tool', 'getWeather');
    expect(weatherExamples).toBeDefined();
    expect(typeof weatherExamples!.location).toBe('string');
    // The location should be a city name for weather tools
    expect(weatherExamples!.location.toString()).toMatch(/[A-Za-z]/);

    // Generate examples for calculator tool
    const calculatorExamples = registry.generateExampleArgs('calculator-tool', 'calculate');
    expect(calculatorExamples).toBeDefined();
    expect(typeof calculatorExamples!.expression).toBe('string');
    // The expression should be a math expression for calculator tools
    expect(calculatorExamples!.expression.toString()).toMatch(/[0-9]/);
  });

  /**
   * @test TEST-MCP-056 Test that the registry handles defensive parameter checks
   */
  test('should handle defensive parameter checks', () => {
    // Create a mock output channel
    const outputChannel = {
      appendLine: () => {},
      show: () => {},
    } as unknown as vscode.OutputChannel;

    const registry = new MCPToolRegistry(outputChannel);

    // Test with invalid tool name
    const invalidToolExamples = registry.generateExampleArgs('non-existent-tool', 'someFunction');
    expect(invalidToolExamples).toBeUndefined();

    // Register a tool
    const testTool: MCPTool = {
      name: 'test-tool',
      description: 'A test tool',
      schema: {
        name: 'test-tool',
        description: 'A test tool',
        version: '1.0.0',
        functions: [
          {
            name: 'testFunction',
            description: 'A test function',
            parameters: [
              {
                name: 'testParam',
                description: 'A test parameter',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'string',
          },
        ],
      },
      execute: async () => 'Test result',
    };

    registry.registerTool(testTool);

    // Test with invalid function name
    const invalidFunctionExamples = registry.generateExampleArgs(
      'test-tool',
      'non-existent-function'
    );
    expect(invalidFunctionExamples).toBeUndefined();

    // Test with empty parameters array
    const emptyParamsTool: MCPTool = {
      name: 'empty-params-tool',
      description: 'A tool with empty parameters',
      schema: {
        name: 'empty-params-tool',
        description: 'A tool with empty parameters',
        version: '1.0.0',
        functions: [
          {
            name: 'emptyFunction',
            description: 'A function with empty parameters',
            parameters: [],
            returnType: 'string',
          },
        ],
      },
      execute: async () => 'Test result',
    };

    registry.registerTool(emptyParamsTool);

    // Test with empty parameters
    const emptyParamsExamples = registry.generateExampleArgs('empty-params-tool', 'emptyFunction');
    expect(emptyParamsExamples).toBeDefined();
    expect(Object.keys(emptyParamsExamples!).length).toBe(0);

    // Test with null parameters
    const nullParamsTool: MCPTool = {
      name: 'null-params-tool',
      description: 'A tool with null parameters',
      schema: {
        name: 'null-params-tool',
        description: 'A tool with null parameters',
        version: '1.0.0',
        functions: [
          {
            name: 'nullFunction',
            description: 'A function with null parameters',
            parameters: null as any,
            returnType: 'string',
          },
        ],
      },
      execute: async () => 'Test result',
    };

    registry.registerTool(nullParamsTool);

    // Test with null parameters
    const nullParamsExamples = registry.generateExampleArgs('null-params-tool', 'nullFunction');
    expect(nullParamsExamples).toBeDefined();
    expect(Object.keys(nullParamsExamples!).length).toBe(0);
  });

  /**
   * @test TEST-MCP-057 Test that the registry can update tool metadata
   */
  test('should update tool metadata', () => {
    // Create a mock output channel
    const outputChannel = {
      appendLine: () => {},
      show: () => {},
    } as unknown as vscode.OutputChannel;

    const registry = new MCPToolRegistry(outputChannel);

    // Register a tool with initial metadata
    const testTool: MCPTool = {
      name: 'test-tool',
      description: 'A test tool',
      schema: {
        name: 'test-tool',
        description: 'A test tool',
        version: '1.0.0',
        functions: [
          {
            name: 'testFunction',
            description: 'A test function',
            parameters: [
              {
                name: 'testParam',
                description: 'A test parameter',
                type: 'string',
                required: true,
              },
            ],
            returnType: 'string',
          },
        ],
      },
      execute: async () => 'Test result',
    };

    registry.registerTool(testTool, {
      keywords: ['test', 'tool'],
      priority: 1,
    });

    // Check initial metadata
    const initialMetadata = registry.getToolMetadata('test-tool');
    expect(initialMetadata).toBeDefined();
    expect(initialMetadata!.keywords).toEqual(['test', 'tool']);
    expect(initialMetadata!.priority).toBe(1);
    expect(initialMetadata!.categories).toBeUndefined();

    // Update metadata
    registry.updateToolMetadata('test-tool', {
      keywords: ['test', 'tool', 'updated'],
      priority: 2,
      categories: ['Testing'],
    });

    // Check updated metadata
    const updatedMetadata = registry.getToolMetadata('test-tool');
    expect(updatedMetadata).toBeDefined();
    expect(updatedMetadata!.keywords).toEqual(['test', 'tool', 'updated']);
    expect(updatedMetadata!.priority).toBe(2);
    expect(updatedMetadata!.categories).toEqual(['Testing']);

    // Partial update
    registry.updateToolMetadata('test-tool', {
      priority: 3,
    });

    // Check partially updated metadata
    const partiallyUpdatedMetadata = registry.getToolMetadata('test-tool');
    expect(partiallyUpdatedMetadata).toBeDefined();
    expect(partiallyUpdatedMetadata!.keywords).toEqual(['test', 'tool', 'updated']);
    expect(partiallyUpdatedMetadata!.priority).toBe(3);
    expect(partiallyUpdatedMetadata!.categories).toEqual(['Testing']);

    // Try to update non-existent tool
    registry.updateToolMetadata('non-existent-tool', {
      keywords: ['test'],
    });

    // Check that non-existent tool wasn't added
    const nonExistentMetadata = registry.getToolMetadata('non-existent-tool');
    expect(nonExistentMetadata).toBeUndefined();
  });
});
