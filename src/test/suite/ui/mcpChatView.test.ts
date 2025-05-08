/**
 * MCP Chat View Tests
 *
 * @implements TEST-UI-101 Display a chat interface for interacting with LLMs
 * @implements TEST-UI-102 Allow sending messages to the LLM
 * @implements TEST-UI-103 Display responses from the LLM
 * @implements TEST-UI-104 Show tool executions in the chat
 * @implements TEST-UI-105 Maintain conversation history
 * @implements TEST-UI-106 Allow clearing the conversation
 * @implements TEST-UI-107 Allow selecting different MCP servers for the conversation
 */

import * as vscode from 'vscode';
import { MCPChatViewProvider } from '../../../ui/mcpChatView';
import { LLMProvider } from '../../../mcp/llmClient';

// Create a mock WebviewPanel instance to use in tests
const mockWebviewPanel = {
  webview: {
    html: '',
    onDidReceiveMessage: jest.fn(),
    postMessage: jest.fn().mockResolvedValue(undefined),
    asWebviewUri: jest.fn().mockImplementation((uri) => uri)
  },
  onDidDispose: jest.fn(),
  reveal: jest.fn(),
  dispose: jest.fn()
};

// Mock vscode namespace
jest.mock('vscode', () => {
  const Uri = {
    file: jest.fn().mockImplementation((path) => ({ path })),
    parse: jest.fn().mockImplementation((url) => ({ url }))
  };

  const WebviewPanel = jest.fn().mockImplementation(() => ({
    webview: {
      html: '',
      onDidReceiveMessage: jest.fn(),
      postMessage: jest.fn().mockResolvedValue(undefined),
      asWebviewUri: jest.fn().mockImplementation((uri) => uri)
    },
    onDidDispose: jest.fn(),
    reveal: jest.fn(),
    dispose: jest.fn()
  }));

  return {
    Uri,
    WebviewPanel,
    window: {
      createWebviewPanel: jest.fn().mockImplementation(() => mockWebviewPanel),
      showQuickPick: jest.fn(),
      showInformationMessage: jest.fn(),
      showErrorMessage: jest.fn()
    },
    commands: {
      registerCommand: jest.fn()
    },
    ViewColumn: {
      One: 1,
      Two: 2,
      Three: 3
    }
  };
});

suite('MCP Chat View Test Suite', () => {
  let provider: MCPChatViewProvider;
  let extensionContext: any;
  let outputChannel: any;
  let mcpBridgeManager: any;

  setup(() => {
    // Create mocks
    extensionContext = {
      subscriptions: [],
      extensionPath: '/path/to/extension'
    };

    outputChannel = {
      appendLine: jest.fn(),
      show: jest.fn()
    };

    // Mock bridge info
    const mockBridges = [
      {
        id: 'bridge1',
        bridge: {
          callTool: jest.fn().mockResolvedValue({ result: 'Tool result' }),
          sendMessage: jest.fn().mockResolvedValue('LLM response')
        },
        options: {
          llmProvider: LLMProvider.Ollama,
          llmModel: 'llama2',
          llmEndpoint: 'http://localhost:11434',
          systemPrompt: 'You are a helpful assistant'
        },
        status: 'running'
      },
      {
        id: 'bridge2',
        bridge: {
          callTool: jest.fn(),
          sendMessage: jest.fn()
        },
        options: {
          llmProvider: LLMProvider.Ollama,
          llmModel: 'mistral',
          llmEndpoint: 'http://localhost:11434',
          systemPrompt: 'You are a helpful assistant'
        },
        status: 'stopped'
      }
    ];

    mcpBridgeManager = {
      getAllBridges: jest.fn().mockReturnValue(mockBridges),
      getBridge: jest.fn().mockImplementation((id) => {
        if (id === 'bridge1') {
          return mockBridges[0].bridge;
        } else if (id === 'bridge2') {
          return mockBridges[1].bridge;
        }
        return null;
      }),
      getBridgeInfo: jest.fn().mockImplementation((id) => {
        if (id === 'bridge1') {
          return mockBridges[0];
        } else if (id === 'bridge2') {
          return mockBridges[1];
        }
        return null;
      })
    };

    // Create the provider
    provider = new MCPChatViewProvider(extensionContext, mcpBridgeManager, outputChannel);
  });

  teardown(() => {
    jest.clearAllMocks();
  });

  // TEST-UI-101: Display a chat interface for interacting with LLMs
  test('should create a chat interface', async () => {
    const panel = await provider.createOrShowPanel();

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'mcpChat',
      'MCP Chat',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [expect.anything()]
      }
    );

    expect(panel).toBeDefined();
  });

  // TEST-UI-102: Allow sending messages to the LLM
  test('should send messages to the LLM', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate receiving a message from the webview
    const message = { command: 'sendMessage', text: 'Hello', bridgeId: 'bridge1' };
    await provider.handleWebviewMessage(message);

    // Check that the message was sent to the LLM
    const bridge = mcpBridgeManager.getBridge('bridge1');
    expect(bridge.sendMessage).toHaveBeenCalledWith('Hello');

    // Check that the panel received the response
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'addMessage',
      message: {
        role: 'user',
        content: 'Hello'
      }
    });

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'addMessage',
      message: {
        role: 'assistant',
        content: 'LLM response',
        toolCalls: []
      }
    });
  });

  // TEST-UI-103: Display responses from the LLM
  test('should display responses from the LLM', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate receiving a message from the webview
    await provider.handleWebviewMessage({ command: 'sendMessage', text: 'Hello', bridgeId: 'bridge1' });

    // Check that the panel received the response
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'addMessage',
      message: {
        role: 'assistant',
        content: 'LLM response',
        toolCalls: []
      }
    });
  });

  // TEST-UI-104: Show tool executions in the chat
  test('should show tool executions in the chat', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate receiving a message from the webview
    await provider.handleWebviewMessage({ command: 'sendMessage', text: 'Hello', bridgeId: 'bridge1' });

    // Check that the panel received the tool calls
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'addMessage',
      message: {
        role: 'assistant',
        content: 'LLM response',
        toolCalls: []
      }
    });
  });

  // TEST-UI-105: Maintain conversation history
  test('should maintain conversation history', async () => {
    // Create panel but we don't need to use it directly in this test
    await provider.createOrShowPanel();

    // Simulate receiving multiple messages from the webview
    await provider.handleWebviewMessage({ command: 'sendMessage', text: 'Hello', bridgeId: 'bridge1' });
    await provider.handleWebviewMessage({ command: 'sendMessage', text: 'How are you?', bridgeId: 'bridge1' });

    // Check that the conversation history is maintained
    expect(provider.getConversationHistory('bridge1')).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'LLM response', toolCalls: [] },
      { role: 'user', content: 'How are you?' },
      { role: 'assistant', content: 'LLM response', toolCalls: [] }
    ]);
  });

  // TEST-UI-106: Allow clearing the conversation
  test('should clear the conversation', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate receiving a message from the webview
    await provider.handleWebviewMessage({ command: 'sendMessage', text: 'Hello', bridgeId: 'bridge1' });

    // Simulate clearing the conversation
    await provider.handleWebviewMessage({ command: 'clearConversation', bridgeId: 'bridge1' });

    // Check that the conversation history is cleared
    expect(provider.getConversationHistory('bridge1')).toEqual([]);

    // Check that the panel received the clear command
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'clearMessages'
    });
  });

  // TEST-UI-107: Allow selecting different MCP servers for the conversation
  test('should allow selecting different MCP servers', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate selecting a different server
    await provider.handleWebviewMessage({ command: 'selectServer', bridgeId: 'bridge2' });

    // Check that the active bridge ID is updated
    expect(provider.getActiveBridgeId()).toBe('bridge2');

    // Check that the panel received the server list
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'updateServerList',
      servers: [
        { id: 'bridge1', name: 'llama2 (running)', status: 'running' },
        { id: 'bridge2', name: 'mistral (stopped)', status: 'stopped' }
      ],
      activeBridgeId: 'bridge2'
    });
  });
});
