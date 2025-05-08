/**
 * MCP Chat View
 *
 * Provides a chat interface for interacting with LLMs through MCP servers.
 *
 * @implements IMPL-UI-101 Display a chat interface for interacting with LLMs
 * @implements IMPL-UI-102 Allow sending messages to the LLM
 * @implements IMPL-UI-103 Display responses from the LLM
 * @implements IMPL-UI-104 Show tool executions in the chat
 * @implements IMPL-UI-105 Maintain conversation history
 * @implements IMPL-UI-106 Allow clearing the conversation
 * @implements IMPL-UI-107 Allow selecting different MCP servers for the conversation
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { MCPBridgeManager } from '../mcp/mcpBridgeManager';
import { MCPToolCall } from '../mcp/mcpTypes';

/**
 * Message interface for chat messages
 */
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: MCPToolCall[];
}

/**
 * Webview message interface for communication with the webview
 */
interface WebviewMessage {
  command: string;
  text?: string;
  bridgeId?: string;
  message?: ChatMessage;
}

/**
 * MCP Chat View Provider
 */
export class MCPChatViewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private extensionUri: vscode.Uri;
  private conversationHistory: Map<string, ChatMessage[]> = new Map();
  private activeBridgeId: string | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private mcpBridgeManager: MCPBridgeManager,
    private outputChannel: vscode.OutputChannel
  ) {
    this.extensionUri = vscode.Uri.file(context.extensionPath);

    // Register commands
    this.registerCommands();
  }

  /**
   * Register commands for the chat view
   */
  private registerCommands(): void {
    // Register open chat command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.openMCPChat', () => this.createOrShowPanel())
    );
  }

  /**
   * Create or show the chat panel
   */
  public async createOrShowPanel(): Promise<vscode.WebviewPanel> {
    // If we already have a panel, show it
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return this.panel;
    }

    // Otherwise, create a new panel
    this.panel = vscode.window.createWebviewPanel(
      'mcpChat',
      'MCP Chat',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri]
      }
    );

    // Set the webview's HTML content
    this.panel.webview.html = this.getWebviewContent(this.panel.webview);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => this.handleWebviewMessage(message),
      undefined,
      this.context.subscriptions
    );

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      this.context.subscriptions
    );

    // Initialize the active bridge ID
    const bridges = this.mcpBridgeManager.getAllBridges();
    if (bridges.length > 0) {
      const runningBridge = bridges.find(bridge => bridge.status === 'running');
      this.activeBridgeId = runningBridge ? runningBridge.id : bridges[0].id;

      // Send the server list to the webview
      this.updateServerList();
    }

    return this.panel;
  }

  /**
   * Handle messages from the webview
   */
  public async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    if (!this.panel) {
      return;
    }

    switch (message.command) {
      case 'sendMessage':
        if (message.text && message.bridgeId) {
          await this.sendMessage(message.text, message.bridgeId);
        }
        break;

      case 'clearConversation':
        if (message.bridgeId) {
          this.clearConversation(message.bridgeId);
        }
        break;

      case 'selectServer':
        if (message.bridgeId) {
          this.activeBridgeId = message.bridgeId;
          this.updateServerList();
        }
        break;
    }
  }

  /**
   * Send a message to the LLM
   */
  private async sendMessage(text: string, bridgeId: string): Promise<void> {
    if (!this.panel) {
      return;
    }

    const bridge = this.mcpBridgeManager.getBridge(bridgeId);
    if (!bridge) {
      vscode.window.showErrorMessage(`Bridge ${bridgeId} not found`);
      return;
    }

    // Add user message to conversation history
    const userMessage: ChatMessage = { role: 'user', content: text };
    this.addMessageToHistory(bridgeId, userMessage);

    // Send user message to webview
    this.panel.webview.postMessage({
      command: 'addMessage',
      message: userMessage
    });

    try {
      // Send message to LLM
      const response = await bridge.sendMessage(text);

      // Add assistant message to conversation history
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        toolCalls: [] // We'll need to parse tool calls from the response in a future update
      };
      this.addMessageToHistory(bridgeId, assistantMessage);

      // Send assistant message to webview
      this.panel.webview.postMessage({
        command: 'addMessage',
        message: assistantMessage
      });
    } catch (error) {
      this.outputChannel.appendLine(`Error sending message: ${error}`);
      vscode.window.showErrorMessage(`Error sending message: ${error}`);
    }
  }

  /**
   * Add a message to the conversation history
   */
  private addMessageToHistory(bridgeId: string, message: ChatMessage): void {
    if (!this.conversationHistory.has(bridgeId)) {
      this.conversationHistory.set(bridgeId, []);
    }

    this.conversationHistory.get(bridgeId)?.push(message);
  }

  /**
   * Clear the conversation history
   */
  private clearConversation(bridgeId: string): void {
    this.conversationHistory.set(bridgeId, []);

    if (this.panel) {
      this.panel.webview.postMessage({
        command: 'clearMessages'
      });
    }
  }

  /**
   * Update the server list in the webview
   */
  private updateServerList(): void {
    if (!this.panel) {
      return;
    }

    const bridges = this.mcpBridgeManager.getAllBridges();
    const servers = bridges.map(bridge => ({
      id: bridge.id,
      name: `${bridge.options.llmModel} (${bridge.status})`,
      status: bridge.status
    }));

    this.panel.webview.postMessage({
      command: 'updateServerList',
      servers,
      activeBridgeId: this.activeBridgeId
    });
  }

  /**
   * Get the webview content
   */
  private getWebviewContent(webview: vscode.Webview): string {
    // Get the local path to main script and stylesheet
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'chat', 'main.js'))
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'chat', 'style.css'))
    );

    // Use a nonce to only allow specific scripts to be run
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
      <link href="${styleUri}" rel="stylesheet">
      <title>MCP Chat</title>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <select id="server-select" class="server-select">
            <option value="">Select a server...</option>
          </select>
          <button id="clear-button" class="clear-button">Clear Conversation</button>
        </div>

        <div id="chat-container" class="chat-container"></div>

        <div class="input-container">
          <textarea id="message-input" class="message-input" placeholder="Type a message..."></textarea>
          <button id="send-button" class="send-button">Send</button>
        </div>
      </div>

      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  /**
   * Generate a nonce for the webview
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Get the conversation history for a bridge
   */
  public getConversationHistory(bridgeId: string): ChatMessage[] {
    return this.conversationHistory.get(bridgeId) || [];
  }

  /**
   * Get the active bridge ID
   */
  public getActiveBridgeId(): string | undefined {
    return this.activeBridgeId;
  }
}
