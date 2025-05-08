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
import { MCPBridgeManager } from '../mcp/mcpBridgeManager';
import { MCPTool } from '../mcp/mcpTypes';
import { LLMProvider } from '../mcp/llmClient';

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
      const commandName = status === 'running'
        ? 'adamize.stopMCPServer'
        : 'adamize.startMCPServer';

      const commandTitle = status === 'running' ? 'Stop Server' : 'Start Server';

      this.command = {
        command: commandName,
        title: commandTitle,
        arguments: [bridgeId]
      };
    } else if (toolName) {
      this.contextValue = 'mcpTool';
      this.iconPath = new vscode.ThemeIcon('tools');

      // Set command for clicking on the tool
      this.command = {
        command: 'adamize.showToolDetails',
        title: 'Show Tool Details',
        arguments: [bridgeId, toolName]
      };
    }
  }
}

/**
 * Tree data provider for MCP servers
 */
export class MCPServerExplorerProvider implements vscode.TreeDataProvider<MCPServerTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MCPServerTreeItem | undefined | null | void> = new vscode.EventEmitter<MCPServerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MCPServerTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

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
      vscode.commands.registerCommand('adamize.startMCPServer', (bridgeId: string) => this.startServer(bridgeId))
    );

    // Register stop server command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.stopMCPServer', (bridgeId: string) => this.stopServer(bridgeId))
    );

    // Register show tool details command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.showToolDetails', (bridgeId: string, toolName: string) => this.showToolDetails(bridgeId, toolName))
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
      const collapsibleState = bridge.status === 'running'
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
    const provider = await vscode.window.showQuickPick(
      Object.values(LLMProvider),
      { placeHolder: 'Select LLM provider' }
    );

    if (!provider) {
      return;
    }

    // Get model name
    const model = await vscode.window.showInputBox({
      prompt: 'Enter model name',
      placeHolder: 'e.g., llama2, mistral, etc.'
    });

    if (!model) {
      return;
    }

    // Get endpoint
    const endpoint = await vscode.window.showInputBox({
      prompt: 'Enter endpoint URL',
      placeHolder: 'e.g., http://localhost:11434',
      value: 'http://localhost:11434'
    });

    if (!endpoint) {
      return;
    }

    // Create bridge
    this.mcpBridgeManager.createBridge({
      llmProvider: provider as LLMProvider,
      llmModel: model,
      llmEndpoint: endpoint,
      systemPrompt: 'You are a helpful assistant'
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
      {}
    );

    panel.webview.html = this.getToolDetailsHtml(tool);
  }

  /**
   * Get HTML for tool details
   */
  private getToolDetailsHtml(tool: MCPTool): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tool: ${tool.name}</title>
        <style>
          body { font-family: var(--vscode-font-family); padding: 20px; }
          h1 { color: var(--vscode-editor-foreground); }
          .description { margin-bottom: 20px; }
          .parameters { margin-top: 20px; }
          .parameter { margin-bottom: 10px; }
          .parameter-name { font-weight: bold; }
          .parameter-description { margin-left: 20px; }
        </style>
      </head>
      <body>
        <h1>${tool.name}</h1>
        <div class="description">${tool.description || 'No description available'}</div>

        <h2>Parameters</h2>
        <div class="parameters">
          ${this.renderParameters(tool)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Render parameters for tool details
   */
  private renderParameters(tool: MCPTool): string {
    if (!tool.parameters || !tool.parameters.properties) {
      return '<p>No parameters</p>';
    }

    const properties = tool.parameters.properties;
    const required = tool.parameters.required || [];

    return Object.entries(properties)
      .map(([name, prop]) => {
        const isRequired = required.includes(name);
        return `
          <div class="parameter">
            <div class="parameter-name">${name}${isRequired ? ' (required)' : ''}</div>
            <div class="parameter-description">${(prop as any).description || 'No description'}</div>
            <div class="parameter-type">Type: ${(prop as any).type || 'any'}</div>
          </div>
        `;
      })
      .join('');
  }
}
