/**
 * Memory Graph View
 *
 * Provides a visualization of the memory graph using Cytoscape.js.
 *
 * @implements IMPL-UI-201 Display a visualization of the memory graph
 * @implements IMPL-UI-202 Allow zooming and panning the graph
 * @implements IMPL-UI-203 Show entity types with different colors
 * @implements IMPL-UI-204 Show relations between entities
 * @implements IMPL-UI-205 Allow clicking on entities to view details
 * @implements IMPL-UI-206 Allow filtering the graph by entity type
 * @implements IMPL-UI-207 Allow searching for entities in the graph
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { EnhancedNeo4jMemoryClient } from '../memory/enhancedNeo4jMemoryClient';

/**
 * Entity interface for memory graph entities
 */
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

/**
 * Relation interface for memory graph relations
 */
interface Relation {
  from: string;
  to: string;
  relationType: string;
}

/**
 * Graph data interface for memory graph data
 */
interface GraphData {
  entities: Entity[];
  relations: Relation[];
}

/**
 * Webview message interface for communication with the webview
 */
interface WebviewMessage {
  command: string;
  entityName?: string;
  entityType?: string;
  query?: string;
}

/**
 * Memory Graph View Provider
 */
export class MemoryGraphViewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private extensionUri: vscode.Uri;
  private graphData: GraphData | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private memoryClient: EnhancedNeo4jMemoryClient,
    private outputChannel: vscode.OutputChannel
  ) {
    this.extensionUri = vscode.Uri.file(context.extensionPath);

    // Register commands
    this.registerCommands();
  }

  /**
   * Register commands for the memory graph view
   */
  private registerCommands(): void {
    // Register open memory graph command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.openMemoryGraph', () => this.createOrShowPanel())
    );
  }

  /**
   * Create or show the memory graph panel
   */
  public async createOrShowPanel(): Promise<vscode.WebviewPanel> {
    // If we already have a panel, show it
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return this.panel;
    }

    // Otherwise, create a new panel
    this.panel = vscode.window.createWebviewPanel(
      'memoryGraph',
      'Memory Graph',
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

    // Load the graph data
    await this.loadGraphData();

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
      case 'showEntityDetails':
        if (message.entityName) {
          await this.showEntityDetails(message.entityName);
        }
        break;

      case 'filterByType':
        if (message.entityType) {
          await this.filterByType(message.entityType);
        }
        break;

      case 'searchEntities':
        if (message.query) {
          await this.searchEntities(message.query);
        }
        break;

      case 'refreshGraph':
        await this.loadGraphData();
        break;
    }
  }

  /**
   * Load the graph data from the memory client
   */
  private async loadGraphData(): Promise<void> {
    try {
      const response = await this.memoryClient.readGraph();
      this.graphData = response.result as GraphData;

      if (this.panel) {
        this.panel.webview.postMessage({
          command: 'updateGraph',
          data: this.graphData
        });
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error loading graph data: ${error}`);
      vscode.window.showErrorMessage(`Error loading graph data: ${error}`);
    }
  }

  /**
   * Show entity details
   */
  private async showEntityDetails(entityName: string): Promise<void> {
    try {
      const response = await this.memoryClient.openNodes([entityName]);
      const result = response.result as { entities: Entity[] };
      const entities = result.entities;

      if (entities.length > 0 && this.panel) {
        this.panel.webview.postMessage({
          command: 'showEntityDetails',
          entity: entities[0]
        });
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error showing entity details: ${error}`);
      vscode.window.showErrorMessage(`Error showing entity details: ${error}`);
    }
  }

  /**
   * Filter graph by entity type
   */
  private async filterByType(entityType: string): Promise<void> {
    if (!this.graphData || !this.panel) {
      return;
    }

    const filteredEntities = this.graphData.entities.filter(entity => entity.entityType === entityType);
    const filteredRelations = this.graphData.relations.filter(relation => {
      const fromEntity = filteredEntities.find(entity => entity.name === relation.from);
      const toEntity = filteredEntities.find(entity => entity.name === relation.to);
      return fromEntity && toEntity;
    });

    this.panel.webview.postMessage({
      command: 'updateGraph',
      data: {
        entities: filteredEntities,
        relations: filteredRelations
      }
    });
  }

  /**
   * Search for entities in the graph
   */
  private async searchEntities(query: string): Promise<void> {
    try {
      const response = await this.memoryClient.searchNodes(query);
      const result = response.result as { entities: Entity[] };
      const entities = result.entities;

      if (this.panel) {
        // Find relations that involve the found entities
        const relations: Relation[] = [];
        if (this.graphData) {
          const entityNames = entities.map(entity => entity.name);
          this.graphData.relations.forEach(relation => {
            if (entityNames.includes(relation.from) && entityNames.includes(relation.to)) {
              relations.push(relation);
            }
          });
        }

        this.panel.webview.postMessage({
          command: 'updateGraph',
          data: {
            entities,
            relations
          }
        });
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error searching entities: ${error}`);
      vscode.window.showErrorMessage(`Error searching entities: ${error}`);
    }
  }

  /**
   * Get the webview content
   */
  private getWebviewContent(webview: vscode.Webview): string {
    // Get the local path to main script and stylesheet
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'graph', 'main.js'))
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'graph', 'style.css'))
    );

    // Cytoscape core
    const cytoscapeUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'cytoscape', 'dist', 'cytoscape.min.js'))
    );

    // Cytoscape extensions
    const cytoscapeColaUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'cytoscape-cola', 'cytoscape-cola.js'))
    );

    const cytoscapeDagreUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'cytoscape-dagre', 'cytoscape-dagre.js'))
    );

    const cytoscapeNavigatorUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'cytoscape-navigator', 'cytoscape-navigator.js'))
    );

    const cytoscapeContextMenusUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'cytoscape-context-menus', 'cytoscape-context-menus.js'))
    );

    const cytoscapePopperUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'cytoscape-popper', 'cytoscape-popper.js'))
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
      <title>Memory Graph</title>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="search-container">
            <input id="search-input" type="text" placeholder="Search entities...">
            <button id="search-button">Search</button>
          </div>
          <div class="filter-container">
            <select id="type-filter">
              <option value="">Filter by type...</option>
            </select>
            <select id="layout-select">
              <option value="cose">Force-directed (CoSE)</option>
              <option value="cola">Force-directed (Cola)</option>
              <option value="circle">Circle</option>
              <option value="grid">Grid</option>
              <option value="concentric">Concentric</option>
              <option value="breadthfirst">Tree</option>
              <option value="dagre">Hierarchical (DAG)</option>
            </select>
            <button id="refresh-button">Refresh</button>
          </div>
        </div>

        <div class="graph-controls">
          <button id="zoom-in" title="Zoom In">+</button>
          <button id="zoom-out" title="Zoom Out">-</button>
          <button id="fit-graph" title="Fit to View">⤢</button>
          <button id="toggle-legend" title="Toggle Legend">ℹ</button>
        </div>

        <div id="graph-container"></div>

        <div id="legend-panel" class="legend-panel">
          <!-- Legend content will be dynamically generated -->
        </div>

        <div id="details-panel" class="details-panel">
          <div class="details-header">
            <h3 id="details-title">Entity Details</h3>
            <button id="close-details">×</button>
          </div>
          <div id="details-content"></div>
        </div>
      </div>

      <!-- Cytoscape core and extensions -->
      <script nonce="${nonce}" src="${cytoscapeUri}"></script>
      <script nonce="${nonce}" src="${cytoscapeColaUri}"></script>
      <script nonce="${nonce}" src="${cytoscapeDagreUri}"></script>
      <script nonce="${nonce}" src="${cytoscapeNavigatorUri}"></script>
      <script nonce="${nonce}" src="${cytoscapeContextMenusUri}"></script>
      <script nonce="${nonce}" src="${cytoscapePopperUri}"></script>

      <!-- Main application script -->
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
}
