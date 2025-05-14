/**
 * MCP Server Explorer View
 *
 * Provides a view for exploring MCP servers and their tools.
 *
 * @implements IMPL-UI-201 Display a list of MCP servers
 * @implements IMPL-UI-202 Show server status and connection information
 * @implements IMPL-UI-203 Allow starting and stopping servers
 * @implements IMPL-UI-204 Display available tools for each server
 * @implements IMPL-UI-205 Show tool details and parameters
 * @implements IMPL-UI-206 Allow configuring server settings
 * @implements IMPL-UI-207 Monitor server health and response times
 */

import * as vscode from 'vscode';
import { BridgeManagerEventType, BridgeStatus, MCPBridgeManager } from '../mcp/mcpBridgeManager';
import { MCPTool } from '../mcp/mcpTypes';

/**
 * Server status information
 */
interface ServerStatusInfo {
  /** Last connection timestamp */
  lastConnection: number;
  /** Response time in milliseconds */
  responseTime: number;
  /** Error message if any */
  error?: string;
  /** Health status */
  health: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * Server node for the tree view
 */
class ServerNode extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly status: BridgeStatus,
    public readonly options: any,
    public readonly statusInfo: ServerStatusInfo,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);

    // Set icon based on status
    switch (status) {
      case BridgeStatus.Running:
        this.iconPath = new vscode.ThemeIcon('server');
        break;
      case BridgeStatus.Stopped:
        this.iconPath = new vscode.ThemeIcon('server-stopped');
        break;
      case BridgeStatus.Error:
        this.iconPath = new vscode.ThemeIcon('server-error');
        break;
      case BridgeStatus.Connecting:
        this.iconPath = new vscode.ThemeIcon('server-connecting');
        break;
      case BridgeStatus.Reconnecting:
        this.iconPath = new vscode.ThemeIcon('server-reconnecting');
        break;
    }

    // Set tooltip
    this.tooltip = `${label} (${status})
Model: ${options.llmModel}
Provider: ${options.llmProvider}
Endpoint: ${options.llmEndpoint}
Last Connection: ${statusInfo.lastConnection ? new Date(statusInfo.lastConnection).toLocaleString() : 'Never'}
Response Time: ${statusInfo.responseTime}ms
Health: ${statusInfo.health}
${statusInfo.error ? `Error: ${statusInfo.error}` : ''}`;

    // Set context value for command enablement
    this.contextValue = `server.${status.toLowerCase()}`;
  }
}

/**
 * Tool category node for the tree view
 */
class ToolCategoryNode extends vscode.TreeItem {
  constructor(
    public readonly serverId: string,
    public readonly label: string,
    public readonly tools: MCPTool[]
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon('tools');
    this.tooltip = `${label} (${tools.length} tools)`;
    this.contextValue = 'toolCategory';
  }
}

/**
 * Tool node for the tree view
 */
class ToolNode extends vscode.TreeItem {
  constructor(
    public readonly serverId: string,
    public readonly tool: MCPTool
  ) {
    super(tool.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon('tool');
    this.tooltip = tool.description || tool.name;
    this.contextValue = 'tool';
    this.description = tool.description
      ? tool.description.substring(0, 30) + (tool.description.length > 30 ? '...' : '')
      : '';
  }
}

/**
 * Tool function node for the tree view
 */
class ToolFunctionNode extends vscode.TreeItem {
  constructor(
    public readonly serverId: string,
    public readonly toolName: string,
    public readonly functionName: string,
    public readonly description: string
  ) {
    super(functionName, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('function');
    this.tooltip = description || functionName;
    this.contextValue = 'toolFunction';
    this.description = description
      ? description.substring(0, 30) + (description.length > 30 ? '...' : '')
      : '';
  }
}

/**
 * MCP Server Explorer View Provider
 */
export class MCPServerExplorerViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> =
    new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private serverStatusMap: Map<string, ServerStatusInfo> = new Map();
  private refreshInterval: NodeJS.Timeout | undefined;
  private pollingInterval: number = 30000; // 30 seconds

  constructor(
    private context: vscode.ExtensionContext,
    private mcpBridgeManager: MCPBridgeManager,
    private outputChannel: vscode.OutputChannel
  ) {
    // Register commands
    this.registerCommands();

    // Register event listeners
    this.registerEventListeners();

    // Initialize server status
    this.initializeServerStatus();

    // Start polling for server status
    this.startStatusPolling();
  }

  /**
   * Register commands for the server explorer
   */
  private registerCommands(): void {
    // Register start server command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.startMCPServer', (node: ServerNode) => {
        this.startServer(node.id);
      })
    );

    // Register stop server command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.stopMCPServer', (node: ServerNode) => {
        this.stopServer(node.id);
      })
    );

    // Register restart server command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.restartMCPServer', (node: ServerNode) => {
        this.restartServer(node.id);
      })
    );

    // Register configure server command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.configureMCPServer', (node: ServerNode) => {
        this.configureServer(node.id);
      })
    );

    // Register view tool details command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.viewToolDetails', (node: ToolNode) => {
        this.viewToolDetails(node.serverId, node.tool);
      })
    );

    // Register execute tool function command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.executeToolFunction', (node: ToolFunctionNode) => {
        this.executeToolFunction(node.serverId, node.toolName, node.functionName);
      })
    );

    // Register create server command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.createMCPServer', () => {
        this.createServer();
      })
    );

    // Register remove server command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.removeMCPServer', (node: ServerNode) => {
        this.removeServer(node.id);
      })
    );

    // Register refresh command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.refreshMCPServers', () => {
        this.refresh();
      })
    );
  }

  /**
   * Register event listeners
   */
  private registerEventListeners(): void {
    // Listen for bridge created events
    this.mcpBridgeManager.addEventListenerManager(BridgeManagerEventType.BridgeCreated, () =>
      this.refresh()
    );

    // Listen for bridge removed events
    this.mcpBridgeManager.addEventListenerManager(BridgeManagerEventType.BridgeRemoved, () =>
      this.refresh()
    );

    // Listen for bridge started events
    this.mcpBridgeManager.addEventListenerManager(BridgeManagerEventType.BridgeStarted, () =>
      this.refresh()
    );

    // Listen for bridge stopped events
    this.mcpBridgeManager.addEventListenerManager(BridgeManagerEventType.BridgeStopped, () =>
      this.refresh()
    );

    // Listen for bridge error events
    this.mcpBridgeManager.addEventListenerManager(BridgeManagerEventType.BridgeError, event => {
      // Update server status
      const statusInfo = this.serverStatusMap.get(event.bridgeId) || this.createDefaultStatusInfo();
      statusInfo.error = event.data?.error?.message || 'Unknown error';
      statusInfo.health = 'unhealthy';
      this.serverStatusMap.set(event.bridgeId, statusInfo);

      // Refresh the view
      this.refresh();
    });

    // Listen for bridge tools discovered events
    this.mcpBridgeManager.addEventListenerManager(
      BridgeManagerEventType.BridgeToolsDiscovered,
      () => this.refresh()
    );

    // Listen for bridge settings updated events
    this.mcpBridgeManager.addEventListenerManager(
      BridgeManagerEventType.BridgeSettingsUpdated,
      () => this.refresh()
    );
  }

  /**
   * Initialize server status
   */
  private initializeServerStatus(): void {
    const bridges = this.mcpBridgeManager.getAllBridges();

    for (const bridge of bridges) {
      this.serverStatusMap.set(bridge.id, this.createDefaultStatusInfo());
    }
  }

  /**
   * Create default status info
   */
  private createDefaultStatusInfo(): ServerStatusInfo {
    return {
      lastConnection: 0,
      responseTime: 0,
      health: 'unhealthy',
    };
  }

  /**
   * Start polling for server status
   */
  private startStatusPolling(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      this.updateServerStatus();
    }, this.pollingInterval);
  }

  /**
   * Stop polling for server status
   */
  private stopStatusPolling(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  /**
   * Update server status
   */
  private async updateServerStatus(): Promise<void> {
    const bridges = this.mcpBridgeManager.getAllBridges();

    for (const bridge of bridges) {
      if (bridge.status === BridgeStatus.Running) {
        try {
          // Measure response time
          const startTime = Date.now();
          const bridgeInstance = this.mcpBridgeManager.getBridge(bridge.id);

          if (bridgeInstance) {
            // Ping the bridge (get tools as a simple operation)
            await bridgeInstance.getAllTools();

            // Calculate response time
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Update status
            const statusInfo =
              this.serverStatusMap.get(bridge.id) || this.createDefaultStatusInfo();
            statusInfo.lastConnection = endTime;
            statusInfo.responseTime = responseTime;
            statusInfo.health =
              responseTime < 500 ? 'healthy' : responseTime < 2000 ? 'degraded' : 'unhealthy';
            delete statusInfo.error;

            this.serverStatusMap.set(bridge.id, statusInfo);
          }
        } catch (error) {
          // Update status with error
          const statusInfo = this.serverStatusMap.get(bridge.id) || this.createDefaultStatusInfo();
          statusInfo.health = 'unhealthy';
          statusInfo.error = error instanceof Error ? error.message : String(error);

          this.serverStatusMap.set(bridge.id, statusInfo);
        }
      }
    }

    // Refresh the view
    this.refresh();
  }

  /**
   * Refresh the tree view
   */
  private refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item for a given element
   */
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for a given element
   */
  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!element) {
      // Root level - show servers
      return this.getServerNodes();
    } else if (element instanceof ServerNode) {
      // Server level - show tool categories
      return this.getToolCategoryNodes(element.id);
    } else if (element instanceof ToolCategoryNode) {
      // Category level - show tools
      return this.getToolNodes(element.serverId, element.tools);
    } else if (element instanceof ToolNode) {
      // Tool level - show functions
      return this.getToolFunctionNodes(element.serverId, element.tool);
    }

    return [];
  }

  /**
   * Get server nodes
   */
  private getServerNodes(): ServerNode[] {
    const bridges = this.mcpBridgeManager.getAllBridges();

    return bridges.map(bridge => {
      const statusInfo = this.serverStatusMap.get(bridge.id) || this.createDefaultStatusInfo();

      return new ServerNode(
        bridge.id,
        `${bridge.options.llmModel} (${bridge.options.llmProvider})`,
        bridge.status,
        bridge.options,
        statusInfo,
        vscode.TreeItemCollapsibleState.Collapsed
      );
    });
  }

  /**
   * Get tool category nodes
   */
  private getToolCategoryNodes(serverId: string): ToolCategoryNode[] {
    const bridge = this.mcpBridgeManager.getBridge(serverId);

    if (!bridge) {
      return [];
    }

    const tools = bridge.getAllTools();
    const categorizedTools = new Map<string, MCPTool[]>();

    // Categorize tools
    for (const tool of tools) {
      const category = tool.category || 'Uncategorized';
      if (!categorizedTools.has(category)) {
        categorizedTools.set(category, []);
      }
      categorizedTools.get(category)!.push(tool);
    }

    // Create category nodes
    return Array.from(categorizedTools.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, tools]) => new ToolCategoryNode(serverId, category, tools));
  }

  /**
   * Get tool nodes
   */
  private getToolNodes(serverId: string, tools: MCPTool[]): ToolNode[] {
    return tools
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(tool => new ToolNode(serverId, tool));
  }

  /**
   * Get tool function nodes
   */
  private getToolFunctionNodes(serverId: string, tool: MCPTool): ToolFunctionNode[] {
    if (!tool.functions) {
      return [];
    }

    return tool.functions
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(func => new ToolFunctionNode(serverId, tool.name, func.name, func.description || ''));
  }

  /**
   * Start a server
   */
  private async startServer(serverId: string): Promise<void> {
    try {
      const success = this.mcpBridgeManager.startBridge(serverId);

      if (success) {
        vscode.window.showInformationMessage(`Started MCP server ${serverId}`);
      } else {
        vscode.window.showErrorMessage(`Failed to start MCP server ${serverId}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error starting MCP server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stop a server
   */
  private async stopServer(serverId: string): Promise<void> {
    try {
      const success = this.mcpBridgeManager.stopBridge(serverId);

      if (success) {
        vscode.window.showInformationMessage(`Stopped MCP server ${serverId}`);
      } else {
        vscode.window.showErrorMessage(`Failed to stop MCP server ${serverId}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error stopping MCP server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Restart a server
   */
  private async restartServer(serverId: string): Promise<void> {
    try {
      const success =
        this.mcpBridgeManager.stopBridge(serverId) && this.mcpBridgeManager.startBridge(serverId);

      if (success) {
        vscode.window.showInformationMessage(`Restarted MCP server ${serverId}`);
      } else {
        vscode.window.showErrorMessage(`Failed to restart MCP server ${serverId}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error restarting MCP server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Configure a server
   */
  private async configureServer(serverId: string): Promise<void> {
    const bridge = this.mcpBridgeManager.getBridge(serverId);

    if (!bridge) {
      vscode.window.showErrorMessage(`Server ${serverId} not found`);
      return;
    }

    const bridgeInfo = this.mcpBridgeManager.getBridgeInfo(serverId);

    if (!bridgeInfo) {
      vscode.window.showErrorMessage(`Server info for ${serverId} not found`);
      return;
    }

    // Show configuration panel
    const panel = vscode.window.createWebviewPanel(
      'mcpServerConfig',
      `Configure MCP Server: ${bridgeInfo.options.llmModel}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    // Set HTML content
    panel.webview.html = this.getConfigWebviewContent(panel.webview, bridgeInfo);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      async (message: any) => {
        if (message.command === 'updateSettings') {
          try {
            const success = this.mcpBridgeManager.updateBridgeSettings(serverId, message.settings);

            if (success) {
              vscode.window.showInformationMessage(`Updated settings for MCP server ${serverId}`);
              panel.dispose();
            } else {
              panel.webview.postMessage({
                command: 'showError',
                error: 'Failed to update settings',
              });
            }
          } catch (error) {
            panel.webview.postMessage({
              command: 'showError',
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * Get configuration webview content
   */
  private getConfigWebviewContent(webview: vscode.Webview, bridgeInfo: any): string {
    // Use a nonce to only allow specific scripts to be run
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <title>Configure MCP Server</title>
      <style>
        body {
          padding: 20px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
        }
        .form-group {
          margin-bottom: 15px;
        }
        label {
          display: block;
          margin-bottom: 5px;
        }
        input, select {
          width: 100%;
          padding: 5px;
          box-sizing: border-box;
        }
        button {
          padding: 8px 12px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
        }
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        .error {
          color: var(--vscode-errorForeground);
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <h1>Configure MCP Server</h1>

      <div class="form-group">
        <label for="llmProvider">LLM Provider</label>
        <select id="llmProvider">
          <option value="ollama" ${bridgeInfo.options.llmProvider === 'ollama' ? 'selected' : ''}>Ollama</option>
          <option value="openai" ${bridgeInfo.options.llmProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
          <option value="anthropic" ${bridgeInfo.options.llmProvider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
        </select>
      </div>

      <div class="form-group">
        <label for="llmModel">LLM Model</label>
        <input type="text" id="llmModel" value="${bridgeInfo.options.llmModel || ''}">
      </div>

      <div class="form-group">
        <label for="llmEndpoint">LLM Endpoint</label>
        <input type="text" id="llmEndpoint" value="${bridgeInfo.options.llmEndpoint || ''}">
      </div>

      <div class="form-group">
        <label for="temperature">Temperature</label>
        <input type="number" id="temperature" min="0" max="1" step="0.1" value="${bridgeInfo.options.temperature !== undefined ? bridgeInfo.options.temperature : 0.7}">
      </div>

      <div class="form-group">
        <label for="maxTokens">Max Tokens</label>
        <input type="number" id="maxTokens" min="1" value="${bridgeInfo.options.maxTokens || 2048}">
      </div>

      <div class="form-group">
        <label for="topP">Top P</label>
        <input type="number" id="topP" min="0" max="1" step="0.1" value="${bridgeInfo.options.topP !== undefined ? bridgeInfo.options.topP : 0.9}">
      </div>

      <div class="form-group">
        <label for="frequencyPenalty">Frequency Penalty</label>
        <input type="number" id="frequencyPenalty" min="0" max="2" step="0.1" value="${bridgeInfo.options.frequencyPenalty !== undefined ? bridgeInfo.options.frequencyPenalty : 0}">
      </div>

      <div class="form-group">
        <label for="presencePenalty">Presence Penalty</label>
        <input type="number" id="presencePenalty" min="0" max="2" step="0.1" value="${bridgeInfo.options.presencePenalty !== undefined ? bridgeInfo.options.presencePenalty : 0}">
      </div>

      <button id="saveButton">Save</button>

      <div id="error" class="error" style="display: none;"></div>

      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        document.getElementById('saveButton').addEventListener('click', () => {
          const settings = {
            llmProvider: document.getElementById('llmProvider').value,
            llmModel: document.getElementById('llmModel').value,
            llmEndpoint: document.getElementById('llmEndpoint').value,
            temperature: parseFloat(document.getElementById('temperature').value),
            maxTokens: parseInt(document.getElementById('maxTokens').value),
            topP: parseFloat(document.getElementById('topP').value),
            frequencyPenalty: parseFloat(document.getElementById('frequencyPenalty').value),
            presencePenalty: parseFloat(document.getElementById('presencePenalty').value),
          };

          vscode.postMessage({
            command: 'updateSettings',
            settings,
          });
        });

        window.addEventListener('message', event => {
          const message = event.data;

          if (message.command === 'showError') {
            const errorElement = document.getElementById('error');
            errorElement.textContent = message.error;
            errorElement.style.display = 'block';
          }
        });
      </script>
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
   * View tool details
   */
  private viewToolDetails(serverId: string, tool: MCPTool): void {
    // Create webview panel
    const panel = vscode.window.createWebviewPanel(
      'mcpToolDetails',
      `Tool: ${tool.name}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    // Set HTML content
    panel.webview.html = this.getToolDetailsWebviewContent(panel.webview, serverId, tool);
  }

  /**
   * Get tool details webview content
   */
  private getToolDetailsWebviewContent(
    webview: vscode.Webview,
    serverId: string,
    tool: MCPTool
  ): string {
    // Use a nonce to only allow specific scripts to be run
    const nonce = this.getNonce();

    // Generate functions HTML
    let functionsHtml = '';
    if (tool.functions && tool.functions.length > 0) {
      functionsHtml = '<h2>Functions</h2>';

      for (const func of tool.functions) {
        functionsHtml += `
        <div class="function">
          <h3>${func.name}</h3>
          <p>${func.description || ''}</p>

          <h4>Parameters</h4>
          <table class="params-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>`;

        if (func.parameters && func.parameters.properties) {
          const requiredParams = func.parameters.required || [];

          for (const [paramName, paramSchema] of Object.entries(func.parameters.properties)) {
            functionsHtml += `
              <tr>
                <td>${paramName}</td>
                <td>${paramSchema.type}</td>
                <td>${requiredParams.includes(paramName) ? 'Yes' : 'No'}</td>
                <td>${paramSchema.description || ''}</td>
              </tr>`;
          }
        }

        functionsHtml += `
            </tbody>
          </table>

          <button class="execute-button" data-function="${func.name}">Execute</button>
        </div>`;
      }
    }

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <title>Tool: ${tool.name}</title>
      <style>
        body {
          padding: 20px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
        }
        .function {
          margin-bottom: 30px;
          padding: 15px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 5px;
        }
        .params-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .params-table th, .params-table td {
          padding: 8px;
          text-align: left;
          border: 1px solid var(--vscode-panel-border);
        }
        .execute-button {
          padding: 8px 12px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
        }
        .execute-button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
      </style>
    </head>
    <body>
      <h1>${tool.name}</h1>
      <p>${tool.description || ''}</p>

      ${functionsHtml}

      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        // Add event listeners to execute buttons
        document.querySelectorAll('.execute-button').forEach(button => {
          button.addEventListener('click', () => {
            const functionName = button.getAttribute('data-function');

            vscode.postMessage({
              command: 'executeFunction',
              toolName: '${tool.name}',
              functionName,
              serverId: '${serverId}'
            });
          });
        });
      </script>
    </body>
    </html>`;
  }

  /**
   * Execute a tool function
   */
  private async executeToolFunction(
    serverId: string,
    toolName: string,
    functionName: string
  ): Promise<void> {
    const bridge = this.mcpBridgeManager.getBridge(serverId);

    if (!bridge) {
      vscode.window.showErrorMessage(`Server ${serverId} not found`);
      return;
    }

    const tools = bridge.getAllTools();
    const tool = tools.find(t => t.name === toolName);

    if (!tool || !tool.functions) {
      vscode.window.showErrorMessage(`Tool ${toolName} not found`);
      return;
    }

    const func = tool.functions.find(f => f.name === functionName);

    if (!func) {
      vscode.window.showErrorMessage(`Function ${functionName} not found in tool ${toolName}`);
      return;
    }

    // Create input box for each parameter
    const parameters: Record<string, any> = {};
    const requiredParams = func.parameters?.required || [];

    if (func.parameters && func.parameters.properties) {
      for (const [paramName, paramSchema] of Object.entries(func.parameters.properties)) {
        const isRequired = requiredParams.includes(paramName);
        const prompt = `Enter ${paramName}${isRequired ? ' (required)' : ''}: ${paramSchema.description || ''}`;

        const value = await vscode.window.showInputBox({
          prompt,
          placeHolder: `${paramSchema.type}`,
          ignoreFocusOut: true,
          validateInput: text => {
            if (isRequired && !text) {
              return 'This parameter is required';
            }

            if (text) {
              // Validate type
              if (paramSchema.type === 'number' || paramSchema.type === 'integer') {
                const num = Number(text);
                if (isNaN(num)) {
                  return `Expected a ${paramSchema.type}`;
                }
                if (paramSchema.type === 'integer' && !Number.isInteger(num)) {
                  return 'Expected an integer';
                }
              } else if (paramSchema.type === 'boolean') {
                if (text !== 'true' && text !== 'false') {
                  return 'Expected a boolean (true or false)';
                }
              }
            }

            return null;
          },
        });

        if (value === undefined) {
          // User cancelled
          return;
        }

        if (value) {
          // Convert value to appropriate type
          if (paramSchema.type === 'number' || paramSchema.type === 'integer') {
            parameters[paramName] = Number(value);
          } else if (paramSchema.type === 'boolean') {
            parameters[paramName] = value === 'true';
          } else {
            parameters[paramName] = value;
          }
        }
      }
    }

    // Execute the function
    try {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Executing ${toolName}.${functionName}...`,
          cancellable: false,
        },
        async () => {
          const result = await bridge.callTool(toolName, functionName, parameters);

          // Show result
          const resultPanel = vscode.window.createWebviewPanel(
            'mcpToolResult',
            `Result: ${toolName}.${functionName}`,
            vscode.ViewColumn.One,
            {
              enableScripts: true,
            }
          );

          resultPanel.webview.html = this.getToolResultWebviewContent(
            resultPanel.webview,
            toolName,
            functionName,
            parameters,
            result
          );
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error executing function: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get tool result webview content
   */
  private getToolResultWebviewContent(
    webview: vscode.Webview,
    toolName: string,
    functionName: string,
    parameters: Record<string, any>,
    result: any
  ): string {
    // Use a nonce to only allow specific scripts to be run
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <title>Result: ${toolName}.${functionName}</title>
      <style>
        body {
          padding: 20px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
        }
        pre {
          background-color: var(--vscode-editor-background);
          padding: 10px;
          border-radius: 5px;
          overflow: auto;
          max-height: 400px;
        }
        .section {
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <h1>Result: ${toolName}.${functionName}</h1>

      <div class="section">
        <h2>Parameters</h2>
        <pre>${JSON.stringify(parameters, null, 2)}</pre>
      </div>

      <div class="section">
        <h2>Result</h2>
        <pre>${JSON.stringify(result, null, 2)}</pre>
      </div>
    </body>
    </html>`;
  }

  /**
   * Create a new server
   */
  private async createServer(): Promise<void> {
    // Show input box for server name
    const llmModel = await vscode.window.showInputBox({
      prompt: 'Enter LLM model name',
      placeHolder: 'e.g., llama2, gpt-3.5-turbo',
      ignoreFocusOut: true,
      validateInput: text => {
        if (!text) {
          return 'Model name is required';
        }
        return null;
      },
    });

    if (!llmModel) {
      return;
    }

    // Show quick pick for provider
    const llmProvider = await vscode.window.showQuickPick(
      [
        { label: 'Ollama', value: 'ollama' },
        { label: 'OpenAI', value: 'openai' },
        { label: 'Anthropic', value: 'anthropic' },
      ],
      {
        placeHolder: 'Select LLM provider',
        ignoreFocusOut: true,
      }
    );

    if (!llmProvider) {
      return;
    }

    // Show input box for endpoint
    let defaultEndpoint = '';
    if (llmProvider.value === 'ollama') {
      defaultEndpoint = 'http://localhost:11434/v1/chat/completions';
    } else if (llmProvider.value === 'openai') {
      defaultEndpoint = 'https://api.openai.com/v1/chat/completions';
    } else if (llmProvider.value === 'anthropic') {
      defaultEndpoint = 'https://api.anthropic.com/v1/messages';
    }

    const llmEndpoint = await vscode.window.showInputBox({
      prompt: 'Enter LLM endpoint',
      value: defaultEndpoint,
      ignoreFocusOut: true,
      validateInput: text => {
        if (!text) {
          return 'Endpoint is required';
        }
        try {
          new URL(text);
        } catch (error) {
          return 'Invalid URL format';
        }
        return null;
      },
    });

    if (!llmEndpoint) {
      return;
    }

    // Create the bridge
    try {
      const bridgeId = this.mcpBridgeManager.createBridge({
        llmProvider: llmProvider.value,
        llmModel,
        llmEndpoint,
        temperature: 0.7,
        maxTokens: 2048,
        topP: 0.9,
      });

      if (bridgeId) {
        vscode.window.showInformationMessage(`Created MCP server for ${llmModel}`);

        // Ask if user wants to start the server
        const startServer = await vscode.window.showQuickPick(['Yes', 'No'], {
          placeHolder: 'Start the server now?',
        });

        if (startServer === 'Yes') {
          this.startServer(bridgeId);
        }
      } else {
        vscode.window.showErrorMessage('Failed to create MCP server');
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error creating MCP server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Remove a server
   */
  private async removeServer(serverId: string): Promise<void> {
    // Confirm removal
    const confirm = await vscode.window.showWarningMessage(
      'Are you sure you want to remove this MCP server?',
      { modal: true },
      'Yes',
      'No'
    );

    if (confirm !== 'Yes') {
      return;
    }

    try {
      // Stop the server first
      this.mcpBridgeManager.stopBridge(serverId);

      // Remove the server
      const success = this.mcpBridgeManager.removeBridge(serverId);

      if (success) {
        vscode.window.showInformationMessage(`Removed MCP server ${serverId}`);
      } else {
        vscode.window.showErrorMessage(`Failed to remove MCP server ${serverId}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error removing MCP server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Dispose the provider
   */
  dispose(): void {
    this.stopStatusPolling();
  }
}
