/**
 * MCP Server Explorer View Tests
 *
 * @implements TEST-UI-201 Test that the view displays a list of MCP servers
 * @implements TEST-UI-202 Test that the view shows server status and connection information
 * @implements TEST-UI-203 Test that the view allows starting and stopping servers
 * @implements TEST-UI-204 Test that the view displays available tools for each server
 * @implements TEST-UI-205 Test that the view shows tool details and parameters
 * @implements TEST-UI-206 Test that the view allows configuring server settings
 * @implements TEST-UI-207 Test that the view monitors server health and response times
 */

import * as vscode from 'vscode';
import { BridgeStatus, MCPBridgeManager } from '../../../mcp/mcpBridgeManager';
import { MCPServerExplorerViewProvider } from '../../../ui/mcpServerExplorerView.new';
import { MCPTool } from '../../../mcp/mcpTypes';

// Mock vscode namespace
jest.mock('vscode', () => {
  return {
    window: {
      createWebviewPanel: jest.fn().mockReturnValue({
        webview: {
          html: '',
          onDidReceiveMessage: jest.fn(),
          postMessage: jest.fn().mockResolvedValue(undefined),
        },
        onDidDispose: jest.fn(),
        reveal: jest.fn(),
        dispose: jest.fn(),
      }),
      showErrorMessage: jest.fn(),
      showInformationMessage: jest.fn(),
      showWarningMessage: jest.fn().mockResolvedValue('Yes'),
      showInputBox: jest.fn().mockResolvedValue('test-value'),
      showQuickPick: jest.fn().mockResolvedValue({ label: 'Ollama', value: 'ollama' }),
      withProgress: jest.fn().mockImplementation((options, task) => task()),
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
    ProgressLocation: {
      Notification: 1,
    },
  };
});

describe('MCP Server Explorer View', () => {
  let provider: MCPServerExplorerViewProvider;
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
    };

    // Create mock bridge manager
    mcpBridgeManager = {
      getAllBridges: jest.fn().mockReturnValue([
        {
          id: 'bridge1',
          status: BridgeStatus.Running,
          options: { llmModel: 'llama2', llmProvider: 'ollama', llmEndpoint: 'http://localhost:11434' },
        },
      ]),
      getBridge: jest.fn().mockReturnValue(mockBridge),
      getBridgeInfo: jest.fn().mockReturnValue({
        id: 'bridge1',
        status: BridgeStatus.Running,
        options: { llmModel: 'llama2', llmProvider: 'ollama', llmEndpoint: 'http://localhost:11434' },
      }),
      startBridge: jest.fn().mockReturnValue(true),
      stopBridge: jest.fn().mockReturnValue(true),
      createBridge: jest.fn().mockReturnValue('new-bridge-id'),
      removeBridge: jest.fn().mockReturnValue(true),
      updateBridgeSettings: jest.fn().mockReturnValue(true),
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
    provider = new MCPServerExplorerViewProvider(
      context,
      mcpBridgeManager as any,
      outputChannel as any
    );
  });

  /**
   * @test TEST-UI-201 Test that the view displays a list of MCP servers
   */
  test('should display a list of MCP servers', async () => {
    const children = await provider.getChildren();
    
    expect(children.length).toBe(1);
    expect(children[0].label).toContain('llama2');
    expect(children[0].contextValue).toBe('server.running');
  });

  /**
   * @test TEST-UI-202 Test that the view shows server status and connection information
   */
  test('should show server status and connection information', async () => {
    const children = await provider.getChildren();
    const serverNode = children[0];
    
    expect(serverNode.tooltip).toContain('llama2');
    expect(serverNode.tooltip).toContain('running');
    expect(serverNode.tooltip).toContain('ollama');
    expect(serverNode.tooltip).toContain('http://localhost:11434');
  });

  /**
   * @test TEST-UI-203 Test that the view allows starting and stopping servers
   */
  test('should allow starting and stopping servers', async () => {
    // Test starting a server
    await provider.startServer('bridge1');
    
    expect(mcpBridgeManager.startBridge).toHaveBeenCalledWith('bridge1');
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Started MCP server'));
    
    // Test stopping a server
    await provider.stopServer('bridge1');
    
    expect(mcpBridgeManager.stopBridge).toHaveBeenCalledWith('bridge1');
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Stopped MCP server'));
  });

  /**
   * @test TEST-UI-204 Test that the view displays available tools for each server
   */
  test('should display available tools for each server', async () => {
    const children = await provider.getChildren();
    const serverNode = children[0];
    
    // Get tool categories
    const categories = await provider.getChildren(serverNode);
    
    expect(categories.length).toBe(1);
    expect(categories[0].label).toBe('Test');
    
    // Get tools
    const tools = await provider.getChildren(categories[0]);
    
    expect(tools.length).toBe(1);
    expect(tools[0].label).toBe('test-tool');
    
    // Get functions
    const functions = await provider.getChildren(tools[0]);
    
    expect(functions.length).toBe(1);
    expect(functions[0].label).toBe('testFunction');
  });

  /**
   * @test TEST-UI-205 Test that the view shows tool details and parameters
   */
  test('should show tool details and parameters', async () => {
    await provider.viewToolDetails('bridge1', mockTools[0]);
    
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'mcpToolDetails',
      'Tool: test-tool',
      vscode.ViewColumn.One,
      expect.any(Object)
    );
    
    // Check that the webview HTML contains tool details
    const panel = vscode.window.createWebviewPanel.mock.results[0].value;
    expect(panel.webview.html).toContain('test-tool');
    expect(panel.webview.html).toContain('testFunction');
    expect(panel.webview.html).toContain('param1');
    expect(panel.webview.html).toContain('param2');
  });

  /**
   * @test TEST-UI-206 Test that the view allows configuring server settings
   */
  test('should allow configuring server settings', async () => {
    await provider.configureServer('bridge1');
    
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'mcpServerConfig',
      expect.stringContaining('Configure MCP Server'),
      vscode.ViewColumn.One,
      expect.any(Object)
    );
    
    // Check that the webview HTML contains configuration form
    const panel = vscode.window.createWebviewPanel.mock.results[0].value;
    expect(panel.webview.html).toContain('llmProvider');
    expect(panel.webview.html).toContain('llmModel');
    expect(panel.webview.html).toContain('llmEndpoint');
    expect(panel.webview.html).toContain('temperature');
  });

  /**
   * @test TEST-UI-207 Test that the view monitors server health and response times
   */
  test('should monitor server health and response times', async () => {
    // Simulate updating server status
    await provider.updateServerStatus();
    
    // Check that the bridge was pinged
    expect(mockBridge.getAllTools).toHaveBeenCalled();
    
    // Check that the server status was updated
    const children = await provider.getChildren();
    const serverNode = children[0];
    
    expect(serverNode.statusInfo.health).toBe('healthy');
    expect(serverNode.statusInfo.responseTime).toBeGreaterThanOrEqual(0);
  });
});
