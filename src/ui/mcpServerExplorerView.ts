/**
 * MCP Server Explorer View
 *
 * Provides a tree view for managing MCP servers in the VS Code sidebar.
 *
 * @implements IMPL-UI-001 Display MCP servers in a tree view
 * @implements IMPL-UI-002 Show server status with appropriate icons
 * @implements IMPL-UI-003 Allow starting and stopping servers via context menu
 * @implements IMPL-UI-004 Show available tools for each server
 * @implements IMPL-UI-005 Allow refreshing the server list
 * @implements IMPL-UI-006 Allow adding new servers via a command
 */

import * as vscode from 'vscode';
import { LLMProvider } from '../mcp/llmClient';
import { MCPBridgeManager } from '../mcp/mcpBridgeManager';
import { MCPTool } from '../mcp/mcpTypes';

/**
 * Tree item representing an MCP server or tool
 */
export class MCPServerTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly bridgeId?: string,
    public readonly toolName?: string,
    public readonly description?: string,
    public readonly status?: 'running' | 'stopped'
  ) {
    super(label, collapsibleState);

    // Set context value for context menu filtering
    if (bridgeId && !toolName) {
      this.contextValue = `mcpServer-${status}`;

      // Set icon based on status
      this.iconPath = new vscode.ThemeIcon(
        status === 'running' ? 'server-running' : 'server-stopped'
      );

      // Set command for clicking on the server
      const commandName = status === 'running' ? 'adamize.stopMCPServer' : 'adamize.startMCPServer';

      const commandTitle = status === 'running' ? 'Stop Server' : 'Start Server';

      this.command = {
        command: commandName,
        title: commandTitle,
        arguments: [bridgeId],
      };
    } else if (toolName) {
      this.contextValue = 'mcpTool';
      this.iconPath = new vscode.ThemeIcon('tools');

      // Set command for clicking on the tool
      this.command = {
        command: 'adamize.showToolDetails',
        title: 'Show Tool Details',
        arguments: [bridgeId, toolName],
      };
    }
  }
}

/**
 * Tree data provider for MCP servers
 */
export class MCPServerExplorerProvider implements vscode.TreeDataProvider<MCPServerTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MCPServerTreeItem | undefined | null | void> =
    new vscode.EventEmitter<MCPServerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MCPServerTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(
    private context: vscode.ExtensionContext,
    private mcpBridgeManager: MCPBridgeManager,
    private outputChannel: vscode.OutputChannel
  ) {
    // Register commands
    this.registerCommands();
  }

  /**
   * Register commands for the tree view
   */
  private registerCommands(): void {
    // Register refresh command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.refreshMCPServers', () => this.refresh())
    );

    // Register add server command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.addMCPServer', () => this.addServer())
    );

    // Register start server command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.startMCPServer', (bridgeId: string) =>
        this.startServer(bridgeId)
      )
    );

    // Register stop server command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.stopMCPServer', (bridgeId: string) =>
        this.stopServer(bridgeId)
      )
    );

    // Register show tool details command
    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        'adamize.showToolDetails',
        (bridgeId: string, toolName: string) => this.showToolDetails(bridgeId, toolName)
      )
    );
  }

  /**
   * Get the tree item for a given element
   */
  getTreeItem(element: MCPServerTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get the children of a given element
   */
  async getChildren(element?: MCPServerTreeItem): Promise<MCPServerTreeItem[]> {
    if (!element) {
      // Root level - show servers
      return this.getServerItems();
    } else if (element.bridgeId && !element.toolName) {
      // Server level - show tools
      return this.getToolItems(element.bridgeId);
    }

    return [];
  }

  /**
   * Get server items
   */
  private getServerItems(): MCPServerTreeItem[] {
    const bridges = this.mcpBridgeManager.getAllBridges();

    return bridges.map(bridge => {
      const label = `${bridge.options.llmModel} (${bridge.status})`;
      const collapsibleState =
        bridge.status === 'running'
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None;

      return new MCPServerTreeItem(
        label,
        collapsibleState,
        bridge.id,
        undefined,
        undefined,
        bridge.status
      );
    });
  }

  /**
   * Get tool items for a server
   */
  private getToolItems(bridgeId: string): MCPServerTreeItem[] {
    const bridge = this.mcpBridgeManager.getBridge(bridgeId);

    if (!bridge) {
      return [];
    }

    const tools = bridge.getAllTools();

    return tools.map(tool => {
      return new MCPServerTreeItem(
        tool.name,
        vscode.TreeItemCollapsibleState.None,
        bridgeId,
        tool.name,
        tool.description
      );
    });
  }

  /**
   * Refresh the tree view
   */
  async refresh(): Promise<void> {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Add a new server
   */
  async addServer(): Promise<void> {
    // Get LLM provider
    const provider = await vscode.window.showQuickPick(Object.values(LLMProvider), {
      placeHolder: 'Select LLM provider',
    });

    if (!provider) {
      return;
    }

    // Get model name
    const model = await vscode.window.showInputBox({
      prompt: 'Enter model name',
      placeHolder: 'e.g., llama2, mistral, etc.',
    });

    if (!model) {
      return;
    }

    // Get endpoint
    const endpoint = await vscode.window.showInputBox({
      prompt: 'Enter endpoint URL',
      placeHolder: 'e.g., http://localhost:11434',
      value: 'http://localhost:11434',
    });

    if (!endpoint) {
      return;
    }

    // Create bridge
    this.mcpBridgeManager.createBridge({
      llmProvider: provider as LLMProvider,
      llmModel: model,
      llmEndpoint: endpoint,
      systemPrompt: 'You are a helpful assistant',
    });

    this.outputChannel.appendLine(`Created MCP server: ${model} (${provider})`);

    // Refresh the view
    this.refresh();
  }

  /**
   * Start a server
   */
  async startServer(bridgeId: string): Promise<void> {
    this.mcpBridgeManager.startBridge(bridgeId);
    this.outputChannel.appendLine(`Started MCP server: ${bridgeId}`);
    this.refresh();
  }

  /**
   * Stop a server
   */
  async stopServer(bridgeId: string): Promise<void> {
    this.mcpBridgeManager.stopBridge(bridgeId);
    this.outputChannel.appendLine(`Stopped MCP server: ${bridgeId}`);
    this.refresh();
  }

  /**
   * Show tool details
   */
  async showToolDetails(bridgeId: string, toolName: string): Promise<void> {
    const bridge = this.mcpBridgeManager.getBridge(bridgeId);

    if (!bridge) {
      return;
    }

    const tools = bridge.getAllTools();
    const tool = tools.find(t => t.name === toolName);

    if (!tool) {
      return;
    }

    // Show tool details in a webview
    const panel = vscode.window.createWebviewPanel(
      'mcpToolDetails',
      `Tool: ${toolName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    // Set the webview's HTML content
    panel.webview.html = this.getToolDetailsHtml(tool, bridgeId, panel.webview);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      async (message: any) => {
        switch (message.command) {
          case 'executeTool':
            await this.executeTool(bridgeId, toolName, message.parameters, panel.webview);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * Execute a tool
   */
  private async executeTool(
    bridgeId: string,
    toolName: string,
    parameters: Record<string, any>,
    webview: vscode.Webview
  ): Promise<void> {
    try {
      // Show loading state
      webview.postMessage({
        command: 'setExecutionStatus',
        status: 'executing',
        message: 'Executing tool...',
      });

      const bridge = this.mcpBridgeManager.getBridge(bridgeId);
      if (!bridge) {
        throw new Error(`Bridge ${bridgeId} not found`);
      }

      // Execute the tool
      const result = await bridge.callTool(toolName, parameters);

      // Show result
      webview.postMessage({
        command: 'setExecutionStatus',
        status: 'success',
        message: 'Tool executed successfully',
        result,
      });

      this.outputChannel.appendLine(
        `Tool ${toolName} executed successfully: ${JSON.stringify(result)}`
      );
    } catch (error) {
      // Show error
      webview.postMessage({
        command: 'setExecutionStatus',
        status: 'error',
        message: `Error executing tool: ${error}`,
      });

      this.outputChannel.appendLine(`Error executing tool ${toolName}: ${error}`);
    }
  }

  /**
   * Get HTML for tool details
   */
  private getToolDetailsHtml(tool: MCPTool, bridgeId: string, webview: vscode.Webview): string {
    // Use a nonce to only allow specific scripts to be run
    const nonce = this.getNonce();

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <title>Tool: ${tool.name}</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
          }
          h1, h2 {
            color: var(--vscode-editor-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 8px;
          }
          .description {
            margin-bottom: 20px;
            line-height: 1.5;
          }
          .parameters {
            margin-top: 20px;
          }
          .parameter {
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
          }
          .parameter-name {
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 5px;
          }
          .parameter-description {
            margin-bottom: 10px;
            line-height: 1.4;
          }
          .parameter-type {
            font-family: monospace;
            background-color: var(--vscode-editor-lineHighlightBackground);
            padding: 2px 5px;
            border-radius: 3px;
            display: inline-block;
            margin-bottom: 10px;
          }
          .parameter-input {
            margin-top: 10px;
          }
          .parameter-input label {
            display: block;
            margin-bottom: 5px;
          }
          .parameter-input input, .parameter-input textarea {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-family: var(--vscode-font-family);
          }
          .parameter-input textarea {
            min-height: 80px;
            font-family: monospace;
          }
          .execute-button {
            margin-top: 20px;
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
          }
          .execute-button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .execution-status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 4px;
            display: none;
          }
          .execution-status.executing {
            display: block;
            background-color: var(--vscode-editorInfo-background);
            color: var(--vscode-editorInfo-foreground);
          }
          .execution-status.success {
            display: block;
            background-color: var(--vscode-editorGutter-addedBackground);
            color: var(--vscode-editor-foreground);
          }
          .execution-status.error {
            display: block;
            background-color: var(--vscode-editorError-background);
            color: var(--vscode-editorError-foreground);
          }
          .result-container {
            margin-top: 20px;
            display: none;
          }
          .result-container.visible {
            display: block;
          }
          .result {
            padding: 10px;
            background-color: var(--vscode-editor-lineHighlightBackground);
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-wrap;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <h1>${tool.name}</h1>
        <div class="description">${tool.description || 'No description available'}</div>

        <h2>Parameters</h2>
        <div class="parameters">
          ${this.renderParametersWithInputs(tool)}
        </div>

        <button id="execute-button" class="execute-button">Execute Tool</button>

        <div id="execution-status" class="execution-status"></div>

        <div id="result-container" class="result-container">
          <h2>Result</h2>
          <div id="result" class="result"></div>
        </div>

        <script nonce="${nonce}">
          (function() {
            const vscode = acquireVsCodeApi();
            const executeButton = document.getElementById('execute-button');
            const executionStatus = document.getElementById('execution-status');
            const resultContainer = document.getElementById('result-container');
            const resultElement = document.getElementById('result');

            // Add event listener to execute button
            executeButton.addEventListener('click', () => {
              // Collect parameters
              const parameters = {};
              const parameterInputs = document.querySelectorAll('[data-parameter]');

              parameterInputs.forEach(input => {
                const name = input.dataset.parameter;
                let value = input.value;

                // Try to parse JSON for object and array types
                if (input.dataset.type === 'object' || input.dataset.type === 'array') {
                  try {
                    value = JSON.parse(value);
                  } catch (error) {
                    // If parsing fails, use the string value
                    console.error('Error parsing JSON:', error);
                  }
                }

                parameters[name] = value;
              });

              // Send message to extension
              vscode.postMessage({
                command: 'executeTool',
                parameters
              });
            });

            // Handle messages from extension
            window.addEventListener('message', event => {
              const message = event.data;

              if (message.command === 'setExecutionStatus') {
                // Update execution status
                executionStatus.className = 'execution-status ' + message.status;
                executionStatus.textContent = message.message;

                // Update result if available
                if (message.result) {
                  resultContainer.className = 'result-container visible';
                  resultElement.textContent = JSON.stringify(message.result, null, 2);
                } else {
                  resultContainer.className = 'result-container';
                }
              }
            });
          })();
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Render parameters with input fields for tool details
   */
  private renderParametersWithInputs(tool: MCPTool): string {
    if (!tool.parameters || !tool.parameters.properties) {
      return '<p>No parameters</p>';
    }

    const properties = tool.parameters.properties;
    const required = tool.parameters.required || [];

    return Object.entries(properties)
      .map(([name, prop]) => {
        const isRequired = required.includes(name);
        const type = (prop as any).type || 'any';

        // Create appropriate input field based on type
        let inputField = '';
        if (type === 'string') {
          if (
            (prop as any).description?.includes('multiline') ||
            (prop as any).format === 'textarea'
          ) {
            inputField = `<textarea data-parameter="${name}" data-type="${type}" placeholder="Enter ${name}..."></textarea>`;
          } else {
            inputField = `<input type="text" data-parameter="${name}" data-type="${type}" placeholder="Enter ${name}...">`;
          }
        } else if (type === 'number' || type === 'integer') {
          inputField = `<input type="number" data-parameter="${name}" data-type="${type}" placeholder="Enter ${name}...">`;
        } else if (type === 'boolean') {
          inputField = `
            <select data-parameter="${name}" data-type="${type}">
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          `;
        } else if (type === 'object' || type === 'array') {
          inputField = `<textarea data-parameter="${name}" data-type="${type}" placeholder="Enter JSON ${type}...">{}</textarea>`;
        } else {
          inputField = `<input type="text" data-parameter="${name}" data-type="${type}" placeholder="Enter ${name}...">`;
        }

        return `
          <div class="parameter">
            <div class="parameter-name">${name}${isRequired ? ' (required)' : ''}</div>
            <div class="parameter-description">${(prop as any).description || 'No description'}</div>
            <div class="parameter-type">Type: ${type}</div>
            <div class="parameter-input">
              <label for="${name}-input">Value:</label>
              ${inputField}
            </div>
          </div>
        `;
      })
      .join('');
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
}
