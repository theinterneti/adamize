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
 * @implements TEST-UI-108 Support streaming responses with progress indicators
 * @implements TEST-UI-109 Handle tool calls during streaming
 */

import * as vscode from 'vscode';
import { LLMProvider } from '../../../mcp/llmClient';
import { MCPChatViewProvider } from '../../../ui/mcpChatView';

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
  const Uri = {
    file: jest.fn().mockImplementation(path => ({ path })),
    parse: jest.fn().mockImplementation(url => ({ url })),
  };

  const WebviewPanel = jest.fn().mockImplementation(() => ({
    webview: {
      html: '',
      onDidReceiveMessage: jest.fn(),
      postMessage: jest.fn().mockResolvedValue(undefined),
      asWebviewUri: jest.fn().mockImplementation(uri => uri),
    },
    onDidDispose: jest.fn(),
    reveal: jest.fn(),
    dispose: jest.fn(),
  }));

  return {
    Uri,
    WebviewPanel,
    window: {
      createWebviewPanel: jest.fn().mockImplementation(() => mockWebviewPanel),
      showQuickPick: jest.fn(),
      showInformationMessage: jest.fn(),
      showErrorMessage: jest.fn(),
    },
    commands: {
      registerCommand: jest.fn(),
    },
    ViewColumn: {
      One: 1,
      Two: 2,
      Three: 3,
    },
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
      extensionPath: '/path/to/extension',
    };

    outputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
    };

    // Mock bridge info
    const mockBridges = [
      {
        id: 'bridge1',
        bridge: {
          callTool: jest.fn().mockResolvedValue({ result: 'Tool result' }),
          sendMessage: jest.fn().mockResolvedValue('LLM response'),
        },
        options: {
          llmProvider: LLMProvider.Ollama,
          llmModel: 'llama2',
          llmEndpoint: 'http://localhost:11434',
          systemPrompt: 'You are a helpful assistant',
        },
        status: 'running',
      },
      {
        id: 'bridge2',
        bridge: {
          callTool: jest.fn(),
          sendMessage: jest.fn(),
        },
        options: {
          llmProvider: LLMProvider.Ollama,
          llmModel: 'mistral',
          llmEndpoint: 'http://localhost:11434',
          systemPrompt: 'You are a helpful assistant',
        },
        status: 'stopped',
      },
    ];

    mcpBridgeManager = {
      getAllBridges: jest.fn().mockReturnValue(mockBridges),
      getBridge: jest.fn().mockImplementation(id => {
        if (id === 'bridge1') {
          return mockBridges[0].bridge;
        } else if (id === 'bridge2') {
          return mockBridges[1].bridge;
        }
        return null;
      }),
      getBridgeInfo: jest.fn().mockImplementation(id => {
        if (id === 'bridge1') {
          return mockBridges[0];
        } else if (id === 'bridge2') {
          return mockBridges[1];
        }
        return null;
      }),
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
        localResourceRoots: [expect.anything()],
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
        content: 'Hello',
      },
    });

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'addMessage',
      message: {
        role: 'assistant',
        content: 'LLM response',
        toolCalls: [],
      },
    });
  });

  // TEST-UI-103: Display responses from the LLM
  test('should display responses from the LLM', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate receiving a message from the webview
    await provider.handleWebviewMessage({
      command: 'sendMessage',
      text: 'Hello',
      bridgeId: 'bridge1',
    });

    // Check that the panel received the response
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'addMessage',
      message: {
        role: 'assistant',
        content: 'LLM response',
        toolCalls: [],
      },
    });
  });

  // TEST-UI-104: Show tool executions in the chat
  test('should show tool executions in the chat', async () => {
    const panel = await provider.createOrShowPanel();

    // Mock the parseToolCalls method to return some tool calls
    const mockToolCalls = [
      {
        name: 'test-tool',
        parameters: { param1: 'value1' },
        result: 'Tool result',
      },
    ];

    // Use jest.spyOn to mock the parseToolCalls method
    jest.spyOn(provider as any, 'parseToolCalls').mockReturnValue(mockToolCalls);

    // Simulate receiving a message from the webview
    await provider.handleWebviewMessage({
      command: 'sendMessage',
      text: 'Hello',
      bridgeId: 'bridge1',
    });

    // Check that the panel received the tool calls
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'addMessage',
      message: {
        role: 'assistant',
        content: 'LLM response',
        toolCalls: mockToolCalls,
      },
    });

    // Restore the original implementation
    (provider as any).parseToolCalls.mockRestore();
  });

  // TEST-UI-108: Support streaming responses
  test('should support streaming responses', async () => {
    const panel = await provider.createOrShowPanel();

    // Mock the supportsStreaming method to return true
    jest.spyOn(provider as any, 'supportsStreaming').mockReturnValue(true);

    // Mock the generateMessageId method to return a fixed ID for testing
    const mockMessageId = 'test-message-id';
    jest.spyOn(provider as any, 'generateMessageId').mockReturnValue(mockMessageId);

    // Mock the streamResponse method to do nothing
    jest.spyOn(provider as any, 'streamResponse').mockResolvedValue(undefined);

    // Simulate receiving a message from the webview
    await provider.handleWebviewMessage({
      command: 'sendMessage',
      text: 'Hello',
      bridgeId: 'bridge1',
    });

    // Check that the panel received the initial empty message
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'addMessage',
      message: {
        role: 'assistant',
        content: '',
        toolCalls: [],
        isStreaming: true,
      },
      messageId: mockMessageId,
    });

    // Check that streamResponse was called with the correct parameters
    expect((provider as any).streamResponse).toHaveBeenCalledWith(
      expect.anything(),
      'Hello',
      mockMessageId,
      'bridge1'
    );

    // Restore the original implementations
    (provider as any).supportsStreaming.mockRestore();
    (provider as any).generateMessageId.mockRestore();
    (provider as any).streamResponse.mockRestore();
  });

  // TEST-UI-105: Maintain conversation history
  test('should maintain conversation history', async () => {
    // Create panel but we don't need to use it directly in this test
    await provider.createOrShowPanel();

    // Simulate receiving multiple messages from the webview
    await provider.handleWebviewMessage({
      command: 'sendMessage',
      text: 'Hello',
      bridgeId: 'bridge1',
    });
    await provider.handleWebviewMessage({
      command: 'sendMessage',
      text: 'How are you?',
      bridgeId: 'bridge1',
    });

    // Check that the conversation history is maintained
    expect(provider.getConversationHistory('bridge1')).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'LLM response', toolCalls: [] },
      { role: 'user', content: 'How are you?' },
      { role: 'assistant', content: 'LLM response', toolCalls: [] },
    ]);
  });

  // TEST-UI-106: Allow clearing the conversation
  test('should clear the conversation', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate receiving a message from the webview
    await provider.handleWebviewMessage({
      command: 'sendMessage',
      text: 'Hello',
      bridgeId: 'bridge1',
    });

    // Simulate clearing the conversation
    await provider.handleWebviewMessage({ command: 'clearConversation', bridgeId: 'bridge1' });

    // Check that the conversation history is cleared
    expect(provider.getConversationHistory('bridge1')).toEqual([]);

    // Check that the panel received the clear command
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'clearMessages',
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
        { id: 'bridge2', name: 'mistral (stopped)', status: 'stopped' },
      ],
      activeBridgeId: 'bridge2',
    });
  });

  // TEST-UI-108: Support streaming responses with progress indicators
  test('should support streaming responses with progress indicators', async () => {
    const panel = await provider.createOrShowPanel();

    // Mock the streamMessage method on the bridge
    const bridge = mcpBridgeManager.getBridge('bridge1');
    bridge.streamMessage = jest.fn().mockImplementation(async (message, handlers) => {
      // Simulate streaming chunks
      handlers.onContent('Hello');
      handlers.onContent(' world');
      handlers.onContent('!');
      handlers.onComplete();
    });

    // Mock the supportsStreaming method to return true
    jest.spyOn(provider as any, 'supportsStreaming').mockReturnValue(true);

    // Generate a unique message ID for testing
    const mockMessageId = 'test-message-id';
    jest.spyOn(provider as any, 'generateMessageId').mockReturnValue(mockMessageId);

    // Simulate sending a message with streaming
    await provider.handleWebviewMessage({
      command: 'sendMessage',
      text: 'Hello',
      bridgeId: 'bridge1',
    });

    // Check that the initial empty message was sent with isStreaming flag
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'addMessage',
      message: {
        role: 'assistant',
        content: '',
        toolCalls: [],
        isStreaming: true,
      },
      messageId: mockMessageId,
    });

    // Check that the streaming updates were sent
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'updateMessage',
      content: 'Hello',
      messageId: mockMessageId,
    });

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'updateMessage',
      content: ' world',
      messageId: mockMessageId,
    });

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'updateMessage',
      content: '!',
      messageId: mockMessageId,
    });

    // Check that the streaming completion was sent
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'completeMessage',
      messageId: mockMessageId,
    });
  });

  // TEST-UI-109: Handle tool calls during streaming
  test('should handle tool calls during streaming', async () => {
    const panel = await provider.createOrShowPanel();

    // Mock the streamMessage method on the bridge
    const bridge = mcpBridgeManager.getBridge('bridge1');
    bridge.streamMessage = jest.fn().mockImplementation(async (message, handlers) => {
      // Simulate streaming with tool calls
      handlers.onContent('I will call a tool for you');

      // Simulate a tool call
      handlers.onToolCall?.({
        name: 'test-tool.testFunction',
        parameters: { param1: 'test value' },
      });

      // Simulate tool execution
      bridge.callTool.mockResolvedValueOnce({ result: 'Tool result' });

      // Complete the streaming
      handlers.onComplete();
    });

    // Mock the supportsStreaming method to return true
    jest.spyOn(provider as any, 'supportsStreaming').mockReturnValue(true);

    // Generate a unique message ID for testing
    const mockMessageId = 'test-message-id';
    jest.spyOn(provider as any, 'generateMessageId').mockReturnValue(mockMessageId);

    // Simulate sending a message with streaming that triggers a tool call
    await provider.handleWebviewMessage({
      command: 'sendMessage',
      text: 'Call a tool',
      bridgeId: 'bridge1',
    });

    // Check that the tool call was executed
    expect(bridge.callTool).toHaveBeenCalledWith('test-tool', 'testFunction', {
      param1: 'test value',
    });

    // Check that the tool call result was sent to the webview
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'addToolCall',
      toolCall: {
        name: 'test-tool.testFunction',
        parameters: { param1: 'test value' },
        result: 'Tool result',
      },
      messageId: mockMessageId,
    });
  });
});
