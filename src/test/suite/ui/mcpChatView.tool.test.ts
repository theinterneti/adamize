/**
 * MCP Chat View Tool Integration Tests
 *
 * @implements TEST-UI-108 Test that the chat view supports tool selection and execution
 * @implements TEST-UI-109 Test that the chat view displays tool parameters with validation
 * @implements TEST-UI-110 Test that the chat view shows tool execution results
 */

import * as vscode from 'vscode';
import { BridgeManagerEventType, MCPBridgeManager } from '../../../mcp/mcpBridgeManager';
import { MCPChatViewProvider } from '../../../ui/mcpChatView.new';
import { MCPTool, MCPToolCall } from '../../../mcp/mcpTypes';

// Create a mock WebviewPanel instance to use in tests
const mockWebviewPanel = {
  webview: {
    html: '',
    onDidReceiveMessage: jest.fn(),
    postMessage: jest.fn().mockResolvedValue(undefined),
    asWebviewUri: jest.fn().mockImplementation(uri => uri),
  },
  onDidDispose: jest.fn(),
  reveal: jest.fn(),
  dispose: jest.fn(),
};

// Mock vscode namespace
jest.mock('vscode', () => {
  return {
    window: {
      createWebviewPanel: jest.fn().mockReturnValue(mockWebviewPanel),
      showErrorMessage: jest.fn(),
      createOutputChannel: jest.fn().mockReturnValue({
        appendLine: jest.fn(),
        show: jest.fn(),
      }),
    },
    Uri: {
      file: jest.fn().mockImplementation(path => ({ path })),
    },
    ViewColumn: {
      One: 1,
    },
    commands: {
      registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    },
    EventEmitter: jest.fn().mockImplementation(() => ({
      event: jest.fn(),
      fire: jest.fn(),
    })),
    TreeItemCollapsibleState: {
      None: 0,
      Collapsed: 1,
      Expanded: 2,
    },
    ThemeIcon: jest.fn().mockImplementation(id => ({ id })),
    TreeItem: jest.fn().mockImplementation((label, collapsibleState) => ({
      label,
      collapsibleState,
    })),
  };
});

describe('MCP Chat View Tool Integration', () => {
  let provider: MCPChatViewProvider;
  let mcpBridgeManager: any;
  let outputChannel: any;
  let context: vscode.ExtensionContext;
  let mockBridge: any;
  let mockTools: MCPTool[];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock tools
    mockTools = [
      {
        name: 'test-tool',
        description: 'A test tool',
        category: 'Test',
        functions: [
          {
            name: 'testFunction',
            description: 'A test function',
            parameters: {
              type: 'object',
              properties: {
                param1: {
                  type: 'string',
                  description: 'A string parameter',
                },
                param2: {
                  type: 'number',
                  description: 'A number parameter',
                },
              },
              required: ['param1'],
            },
          },
        ],
      },
    ];

    // Create mock bridge
    mockBridge = {
      getAllTools: jest.fn().mockReturnValue(mockTools),
      callTool: jest.fn().mockResolvedValue({ result: 'Test result' }),
      sendMessage: jest.fn().mockResolvedValue('Test response'),
      streamMessage: jest.fn().mockImplementation((text, handlers) => {
        handlers.onContent('Test content');
        handlers.onComplete();
        return Promise.resolve();
      }),
    };

    // Create mock bridge manager
    mcpBridgeManager = {
      getAllBridges: jest.fn().mockReturnValue([
        {
          id: 'bridge1',
          status: 'running',
          options: { llmModel: 'llama2' },
        },
      ]),
      getBridge: jest.fn().mockReturnValue(mockBridge),
      addEventListenerManager: jest.fn(),
      removeEventListenerManager: jest.fn(),
    };

    // Create mock output channel
    outputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
    };

    // Create mock extension context
    context = {
      subscriptions: [],
      extensionPath: '/test/path',
    } as any;

    // Create provider
    provider = new MCPChatViewProvider(
      context,
      mcpBridgeManager as any,
      outputChannel as any
    );
  });

  /**
   * @test TEST-UI-108 Test that the chat view supports tool selection and execution
   */
  test('should support tool selection', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate selecting a tool
    await provider.handleWebviewMessage({
      command: 'selectTool',
      toolName: 'test-tool',
      bridgeId: 'bridge1',
    });

    // Check that the tool details were sent to the webview
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'showToolDetails',
      tool: mockTools[0],
    });
  });

  /**
   * @test TEST-UI-109 Test that the chat view validates tool parameters
   */
  test('should validate tool parameters', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate executing a tool with invalid parameters
    await provider.handleWebviewMessage({
      command: 'executeTool',
      toolName: 'test-tool',
      functionName: 'testFunction',
      parameters: {
        // Missing required param1
        param2: 123,
      },
      bridgeId: 'bridge1',
    });

    // Check that validation errors were sent to the webview
    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'toolValidationErrors',
        toolName: 'test-tool',
        functionName: 'testFunction',
        errors: expect.objectContaining({
          param1: expect.any(String),
        }),
      })
    );

    // Simulate executing a tool with valid parameters
    await provider.handleWebviewMessage({
      command: 'executeTool',
      toolName: 'test-tool',
      functionName: 'testFunction',
      parameters: {
        param1: 'test',
        param2: 123,
      },
      bridgeId: 'bridge1',
    });

    // Check that the tool was executed
    expect(mockBridge.callTool).toHaveBeenCalledWith('test-tool', 'testFunction', {
      param1: 'test',
      param2: 123,
    });
  });

  /**
   * @test TEST-UI-110 Test that the chat view shows tool execution results
   */
  test('should show tool execution results', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate executing a tool
    await provider.handleWebviewMessage({
      command: 'executeTool',
      toolName: 'test-tool',
      functionName: 'testFunction',
      parameters: {
        param1: 'test',
      },
      bridgeId: 'bridge1',
    });

    // Check that the result was sent to the webview
    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'toolExecutionResult',
        toolName: 'test-tool',
        functionName: 'testFunction',
        result: { result: 'Test result' },
      })
    );

    // Check that a system message was added to the conversation
    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'addMessage',
        message: expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('Executed tool'),
          toolCalls: expect.arrayContaining([
            expect.objectContaining({
              name: 'test-tool',
              parameters: { param1: 'test' },
              result: { result: 'Test result' },
            }),
          ]),
        }),
      })
    );
  });
});
