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
 * @implements IMPL-UI-108 Support tool selection and execution from the chat interface
 * @implements IMPL-UI-109 Display tool parameters with validation
 * @implements IMPL-UI-110 Show tool execution results in the chat
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { BridgeManagerEventType, BridgeStatus, MCPBridgeManager } from '../mcp/mcpBridgeManager';
import { MCPTool, MCPToolCall } from '../mcp/mcpTypes';

/**
 * Tool category
 */
interface ToolCategory {
  name: string;
  tools: MCPTool[];
}

/**
 * Tool parameter validation result
 */
interface ParameterValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Message interface for chat messages
 */
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: MCPToolCall[];
  isStreaming?: boolean;
}

/**
 * Webview message interface for communication with the webview
 */
interface WebviewMessage {
  command: string;
  text?: string;
  bridgeId?: string;
  message?: ChatMessage;
  messageId?: string;
  content?: string;
  done?: boolean;
  toolName?: string;
  functionName?: string;
  parameters?: Record<string, any>;
  toolCall?: MCPToolCall;
  toolResult?: any;
}

/**
 * MCP Chat View Provider
 */
export class MCPChatViewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private extensionUri: vscode.Uri;
  private conversationHistory: Map<string, ChatMessage[]> = new Map();
  private activeBridgeId: string | undefined;
  private toolCategories: Map<string, ToolCategory[]> = new Map();

  constructor(
    private context: vscode.ExtensionContext,
    private mcpBridgeManager: MCPBridgeManager,
    private outputChannel: vscode.OutputChannel
  ) {
    this.extensionUri = vscode.Uri.file(context.extensionPath);

    // Register commands
    this.registerCommands();

    // Listen for bridge events
    this.registerBridgeEventListeners();
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
   * Register bridge event listeners
   */
  private registerBridgeEventListeners(): void {
    // Listen for bridge created events
    this.mcpBridgeManager.addEventListenerManager(BridgeManagerEventType.BridgeCreated, () =>
      this.updateServerList()
    );

    // Listen for bridge removed events
    this.mcpBridgeManager.addEventListenerManager(BridgeManagerEventType.BridgeRemoved, () =>
      this.updateServerList()
    );

    // Listen for bridge started events
    this.mcpBridgeManager.addEventListenerManager(BridgeManagerEventType.BridgeStarted, () =>
      this.updateServerList()
    );

    // Listen for bridge stopped events
    this.mcpBridgeManager.addEventListenerManager(BridgeManagerEventType.BridgeStopped, () =>
      this.updateServerList()
    );

    // Listen for bridge error events
    this.mcpBridgeManager.addEventListenerManager(BridgeManagerEventType.BridgeError, event => {
      if (this.panel) {
        this.panel.webview.postMessage({
          command: 'bridgeError',
          bridgeId: event.bridgeId,
          error: event.data?.error?.message || 'Unknown error',
        });
      }
    });

    // Listen for tools discovered events
    this.mcpBridgeManager.addEventListenerManager(
      BridgeManagerEventType.BridgeToolsDiscovered,
      event => {
        this.updateToolCategories(event.bridgeId);
      }
    );
  }

  /**
   * Update tool categories for a bridge
   * @param bridgeId Bridge ID
   */
  private updateToolCategories(bridgeId: string): void {
    const bridge = this.mcpBridgeManager.getBridge(bridgeId);
    if (!bridge) {
      return;
    }

    const tools = bridge.getAllTools();
    const categories: ToolCategory[] = [];
    const categorizedTools = new Map<string, MCPTool[]>();

    // Categorize tools
    for (const tool of tools) {
      const category = tool.category || 'Uncategorized';
      if (!categorizedTools.has(category)) {
        categorizedTools.set(category, []);
      }
      categorizedTools.get(category)!.push(tool);
    }

    // Sort categories alphabetically
    const sortedCategories = Array.from(categorizedTools.keys()).sort();

    // Create category objects
    for (const category of sortedCategories) {
      categories.push({
        name: category,
        tools: categorizedTools.get(category)!.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    // Store categories
    this.toolCategories.set(bridgeId, categories);

    // Update UI if panel exists
    if (this.panel) {
      this.panel.webview.postMessage({
        command: 'updateToolCategories',
        bridgeId,
        categories,
      });
    }
  }

  /**
   * Handle tool selection
   * @param toolName Tool name
   * @param bridgeId Bridge ID
   */
  private async handleToolSelection(toolName: string, bridgeId: string): Promise<void> {
    if (!this.panel) {
      return;
    }

    const bridge = this.mcpBridgeManager.getBridge(bridgeId);
    if (!bridge) {
      return;
    }

    const tools = bridge.getAllTools();
    const tool = tools.find(t => t.name === toolName);

    if (!tool) {
      return;
    }

    // Send tool details to webview
    this.panel.webview.postMessage({
      command: 'showToolDetails',
      tool,
    });
  }

  /**
   * Execute a tool
   * @param toolName Tool name
   * @param functionName Function name
   * @param parameters Function parameters
   * @param bridgeId Bridge ID
   */
  private async executeTool(
    toolName: string,
    functionName: string,
    parameters: Record<string, any>,
    bridgeId: string
  ): Promise<void> {
    if (!this.panel) {
      return;
    }

    const bridge = this.mcpBridgeManager.getBridge(bridgeId);
    if (!bridge) {
      return;
    }

    try {
      // Validate parameters
      const validationResult = this.validateParameters(toolName, functionName, parameters, bridge);

      if (!validationResult.isValid) {
        // Send validation errors to webview
        this.panel.webview.postMessage({
          command: 'toolValidationErrors',
          toolName,
          functionName,
          errors: validationResult.errors,
        });
        return;
      }

      // Show loading indicator
      this.panel.webview.postMessage({
        command: 'setToolExecutionStatus',
        toolName,
        functionName,
        status: 'executing',
      });

      // Execute tool
      const result = await bridge.callTool(toolName, functionName, parameters);

      // Create tool call object
      const toolCall: MCPToolCall = {
        name: toolName,
        parameters,
        result,
      };

      // Send result to webview
      this.panel.webview.postMessage({
        command: 'toolExecutionResult',
        toolName,
        functionName,
        result,
        toolCall,
      });

      // Add to conversation as a system message
      const systemMessage: ChatMessage = {
        role: 'system',
        content: `Executed tool ${toolName}.${functionName}`,
        toolCalls: [toolCall],
      };

      this.addMessageToHistory(bridgeId, systemMessage);

      // Add message to chat
      this.panel.webview.postMessage({
        command: 'addMessage',
        message: systemMessage,
      });
    } catch (error) {
      // Send error to webview
      this.panel.webview.postMessage({
        command: 'toolExecutionError',
        toolName,
        functionName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Validate parameters for a tool function
   * @param toolName Tool name
   * @param functionName Function name
   * @param parameters Parameters to validate
   * @param bridge Bridge instance
   * @returns Validation result
   */
  private validateParameters(
    toolName: string,
    functionName: string,
    parameters: Record<string, any>,
    bridge: any
  ): ParameterValidationResult {
    const result: ParameterValidationResult = {
      isValid: true,
      errors: {},
    };

    const tools = bridge.getAllTools();
    const tool = tools.find(t => t.name === toolName);

    if (!tool || !tool.functions) {
      result.isValid = false;
      result.errors._general = 'Tool not found';
      return result;
    }

    const func = tool.functions.find(f => f.name === functionName);

    if (!func || !func.parameters) {
      result.isValid = false;
      result.errors._general = 'Function not found';
      return result;
    }

    // Check required parameters
    const requiredParams = func.parameters.required || [];
    for (const param of requiredParams) {
      if (
        parameters[param] === undefined ||
        parameters[param] === null ||
        parameters[param] === ''
      ) {
        result.isValid = false;
        result.errors[param] = 'This parameter is required';
      }
    }

    // Check parameter types
    if (func.parameters.properties) {
      for (const [paramName, paramSchema] of Object.entries(func.parameters.properties)) {
        if (parameters[paramName] !== undefined) {
          // Check type
          if (paramSchema.type === 'number' || paramSchema.type === 'integer') {
            if (typeof parameters[paramName] !== 'number') {
              result.isValid = false;
              result.errors[paramName] = `Expected a ${paramSchema.type}`;
            } else if (paramSchema.type === 'integer' && !Number.isInteger(parameters[paramName])) {
              result.isValid = false;
              result.errors[paramName] = 'Expected an integer';
            }
          } else if (paramSchema.type === 'boolean') {
            if (typeof parameters[paramName] !== 'boolean') {
              result.isValid = false;
              result.errors[paramName] = 'Expected a boolean';
            }
          } else if (paramSchema.type === 'string') {
            if (typeof parameters[paramName] !== 'string') {
              result.isValid = false;
              result.errors[paramName] = 'Expected a string';
            }
          } else if (paramSchema.type === 'array') {
            if (!Array.isArray(parameters[paramName])) {
              result.isValid = false;
              result.errors[paramName] = 'Expected an array';
            }
          } else if (paramSchema.type === 'object') {
            if (typeof parameters[paramName] !== 'object' || parameters[paramName] === null) {
              result.isValid = false;
              result.errors[paramName] = 'Expected an object';
            }
          }
        }
      }
    }

    return result;
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
    this.panel = vscode.window.createWebviewPanel('mcpChat', 'MCP Chat', vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [this.extensionUri],
    });

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
      const runningBridge = bridges.find(bridge => bridge.status === BridgeStatus.Running);
      this.activeBridgeId = runningBridge ? runningBridge.id : bridges[0].id;

      // Send the server list to the webview
      this.updateServerList();

      // Update tool categories for the active bridge
      if (this.activeBridgeId) {
        this.updateToolCategories(this.activeBridgeId);
      }
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
          this.updateToolCategories(message.bridgeId);
        }
        break;

      case 'selectTool':
        if (message.toolName && message.bridgeId) {
          await this.handleToolSelection(message.toolName, message.bridgeId);
        }
        break;

      case 'executeTool':
        if (message.toolName && message.functionName && message.bridgeId) {
          await this.executeTool(
            message.toolName,
            message.functionName,
            message.parameters || {},
            message.bridgeId
          );
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
      message: userMessage,
    });

    try {
      // Always use streaming if available
      const useStreaming = this.supportsStreaming(bridge);
      const messageId = this.generateMessageId();

      if (useStreaming) {
        // Create an initial empty assistant message with typing indicator
        const initialAssistantMessage: ChatMessage = {
          role: 'assistant',
          content: '',
          toolCalls: [],
          isStreaming: true,
        };

        // Send initial message to webview
        this.panel.webview.postMessage({
          command: 'addMessage',
          message: initialAssistantMessage,
          messageId: messageId,
          status: 'typing',
        });

        // Start streaming
        await this.streamResponse(bridge, text, messageId, bridgeId);
      } else {
        // Show loading indicator
        this.panel.webview.postMessage({
          command: 'setStatus',
          status: 'loading',
          message: 'Generating response...',
        });

        // Use non-streaming approach
        const response = await bridge.sendMessage(text);

        // Hide loading indicator
        this.panel.webview.postMessage({
          command: 'setStatus',
          status: 'idle',
        });

        // Parse tool calls from the response
        const toolCalls = this.parseToolCalls(response);

        // Add assistant message to conversation history
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response,
          toolCalls: toolCalls,
        };
        this.addMessageToHistory(bridgeId, assistantMessage);

        // Send assistant message to webview
        this.panel.webview.postMessage({
          command: 'addMessage',
          message: assistantMessage,
        });
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error sending message: ${error}`);
      vscode.window.showErrorMessage(`Error sending message: ${error}`);

      // Update UI to show error
      this.panel.webview.postMessage({
        command: 'setStatus',
        status: 'error',
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Check if the bridge supports streaming
   * @param bridge MCP bridge
   * @returns Whether streaming is supported
   */
  private supportsStreaming(bridge: any): boolean {
    // Check if the bridge has a streamMessage method
    return typeof bridge.streamMessage === 'function';
  }

  /**
   * Generate a unique message ID
   * @returns Message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Stream a response from the LLM
   * @param bridge MCP bridge
   * @param text User message
   * @param messageId Message ID
   * @param bridgeId Bridge ID
   */
  private async streamResponse(
    bridge: any,
    text: string,
    messageId: string,
    bridgeId: string
  ): Promise<void> {
    if (!this.panel) {
      return;
    }

    let fullContent = '';
    let toolCalls: MCPToolCall[] = [];

    try {
      // Start streaming
      await bridge.streamMessage(text, {
        onContent: (content: string) => {
          // Append content
          fullContent += content;

          // Send content update to webview
          this.panel?.webview.postMessage({
            command: 'updateStreamingMessage',
            messageId: messageId,
            content: content,
          });
        },
        onToolCall: (toolCall: MCPToolCall) => {
          // Add tool call
          toolCalls.push(toolCall);

          // Send tool call to webview
          this.panel?.webview.postMessage({
            command: 'addToolCall',
            messageId: messageId,
            toolCall: toolCall,
          });

          // Execute the tool call if possible
          this.executeToolCall(bridge, toolCall);
        },
        onComplete: () => {
          // Parse any additional tool calls from the full response
          const parsedToolCalls = this.parseToolCalls(fullContent);

          // Merge with tool calls received during streaming
          toolCalls = [
            ...toolCalls,
            ...parsedToolCalls.filter(
              tc =>
                !toolCalls.some(
                  existing =>
                    existing.name === tc.name &&
                    JSON.stringify(existing.parameters) === JSON.stringify(tc.parameters)
                )
            ),
          ];

          // Create the final message
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: fullContent,
            toolCalls: toolCalls,
            isStreaming: false,
          };

          // Add to conversation history
          this.addMessageToHistory(bridgeId, assistantMessage);

          // Send completion to webview
          this.panel?.webview.postMessage({
            command: 'completeStreamingMessage',
            messageId: messageId,
            message: assistantMessage,
            done: true,
          });
        },
      });
    } catch (error) {
      this.outputChannel.appendLine(`Error streaming message: ${error}`);

      // Complete the message with error
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: fullContent || 'Error: Failed to stream response',
        toolCalls: toolCalls,
        isStreaming: false,
      };

      // Add to conversation history
      this.addMessageToHistory(bridgeId, errorMessage);

      // Send completion to webview
      this.panel?.webview.postMessage({
        command: 'completeStreamingMessage',
        messageId: messageId,
        message: errorMessage,
        done: true,
      });
    }
  }

  /**
   * Execute a tool call
   * @param bridge MCP bridge
   * @param toolCall Tool call to execute
   */
  private async executeToolCall(bridge: any, toolCall: MCPToolCall): Promise<void> {
    if (!this.panel) {
      return;
    }

    try {
      // Find the function name
      const tools = bridge.getAllTools();
      const tool = tools.find(t => t.name === toolCall.name);

      if (!tool || !tool.functions) {
        throw new Error(`Tool ${toolCall.name} not found`);
      }

      // Find the function to execute
      const functionName = this.findFunctionName(tool, toolCall.parameters);

      if (!functionName) {
        throw new Error(
          `No matching function found for parameters: ${JSON.stringify(toolCall.parameters)}`
        );
      }

      // Execute the tool
      const result = await bridge.callTool(toolCall.name, functionName, toolCall.parameters);

      // Update the tool call with the result
      toolCall.result = result;

      // Send the updated tool call to the webview
      this.panel.webview.postMessage({
        command: 'updateToolCall',
        toolCall,
      });
    } catch (error) {
      this.outputChannel.appendLine(`Error executing tool call: ${error}`);

      // Update the tool call with the error
      toolCall.result = `Error: ${error instanceof Error ? error.message : String(error)}`;

      // Send the updated tool call to the webview
      this.panel.webview.postMessage({
        command: 'updateToolCall',
        toolCall,
        error: true,
      });
    }
  }

  /**
   * Find the function name based on parameters
   * @param tool Tool to search
   * @param parameters Parameters to match
   * @returns Function name or undefined if not found
   */
  private findFunctionName(tool: MCPTool, parameters: Record<string, any>): string | undefined {
    // If the tool has only one function, use that
    if (tool.functions && tool.functions.length === 1) {
      return tool.functions[0].name;
    }

    // If the tool has multiple functions, try to match by parameters
    if (tool.functions && tool.functions.length > 0) {
      // First check if there's a direct match by parameter names
      for (const func of tool.functions) {
        if (func.parameters && func.parameters.properties) {
          const paramNames = Object.keys(func.parameters.properties);
          const inputParamNames = Object.keys(parameters);

          // Check if all required parameters are present
          const requiredParams = func.parameters.required || [];
          const hasAllRequired = requiredParams.every(param => inputParamNames.includes(param));

          if (hasAllRequired) {
            return func.name;
          }
        }
      }

      // If no match found, return the first function as fallback
      return tool.functions[0].name;
    }

    return undefined;
  }

  /**
   * Parse tool calls from LLM response
   * @param response LLM response text
   * @returns Array of tool calls
   */
  private parseToolCalls(response: string): MCPToolCall[] {
    const toolCalls: MCPToolCall[] = [];

    // Look for tool call patterns in the response
    // Format: <tool_call>{"name": "tool_name", "parameters": {...}}</tool_call>
    const toolCallRegex = /<tool_call>(.*?)<\/tool_call>/gs;
    let match;

    while ((match = toolCallRegex.exec(response)) !== null) {
      try {
        const toolCallJson = match[1];
        const toolCall = JSON.parse(toolCallJson);

        if (toolCall.name && toolCall.parameters) {
          toolCalls.push({
            name: toolCall.name,
            parameters: toolCall.parameters,
            result: toolCall.result || 'No result available',
          });
        }
      } catch (error) {
        this.outputChannel.appendLine(`Error parsing tool call: ${error}`);
      }
    }

    // Alternative format: ```json\n{"name": "tool_name", "parameters": {...}}\n```
    const codeBlockRegex = /```json\s*\n(.*?)\n```/gs;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      try {
        const toolCallJson = match[1];
        const toolCall = JSON.parse(toolCallJson);

        if (toolCall.name && toolCall.parameters) {
          toolCalls.push({
            name: toolCall.name,
            parameters: toolCall.parameters,
            result: toolCall.result || 'No result available',
          });
        }
      } catch (error) {
        this.outputChannel.appendLine(`Error parsing tool call from code block: ${error}`);
      }
    }

    return toolCalls;
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
        command: 'clearMessages',
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
      status: bridge.status,
    }));

    this.panel.webview.postMessage({
      command: 'updateServerList',
      servers,
      activeBridgeId: this.activeBridgeId,
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
          <button id="tools-button" class="tools-button">Tools</button>
        </div>

        <div id="tools-panel" class="tools-panel hidden">
          <div class="tools-header">
            <h2>Available Tools</h2>
            <button id="close-tools-button" class="close-button">×</button>
          </div>
          <div id="tools-categories" class="tools-categories"></div>
        </div>

        <div id="tool-details-panel" class="tool-details-panel hidden">
          <div class="tool-details-header">
            <h2>Tool Details</h2>
            <button id="close-tool-details-button" class="close-button">×</button>
          </div>
          <div id="tool-details-content" class="tool-details-content"></div>
          <div id="tool-execution-form" class="tool-execution-form"></div>
          <div id="tool-execution-result" class="tool-execution-result hidden"></div>
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
   * Generate a nonce
   * @returns Random nonce
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
   * @param bridgeId Bridge ID
   * @returns Conversation history
   */
  public getConversationHistory(bridgeId: string): ChatMessage[] {
    return this.conversationHistory.get(bridgeId) || [];
  }

  /**
   * Get the active bridge ID
   * @returns Active bridge ID
   */
  public getActiveBridgeId(): string | undefined {
    return this.activeBridgeId;
  }
}
