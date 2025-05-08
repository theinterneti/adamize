// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { MCPClient } from './mcp/mcpClient';
import { EnhancedMCPClient } from './mcp/enhancedMcpClient';
import { Neo4jMemoryClient } from './memory/neo4jMemoryClient';
import { EnhancedNeo4jMemoryClient } from './memory/enhancedNeo4jMemoryClient';
import networkConfig, { Environment, ServiceType } from './utils/networkConfig';
import { MCPServerExplorerProvider } from './ui/mcpServerExplorerView';
import { MCPChatViewProvider } from './ui/mcpChatView';
import { MCPBridgeManager } from './mcp/mcpBridgeManager';

// Global variables
let mcpClient: MCPClient | undefined;
let enhancedMcpClient: EnhancedMCPClient | undefined;
let memoryClient: Neo4jMemoryClient | undefined;
let enhancedMemoryClient: EnhancedNeo4jMemoryClient | undefined;
let mcpBridgeManager: MCPBridgeManager | undefined;
let mcpServerExplorerProvider: MCPServerExplorerProvider | undefined;
let mcpChatViewProvider: MCPChatViewProvider | undefined;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.info('Activating Adamize extension');

  // Register commands
  const showWelcomeCommand = vscode.commands.registerCommand('adamize.showWelcome', () => {
    vscode.window.showInformationMessage('Welcome to Adamize!');
  });

  const connectMCPCommand = vscode.commands.registerCommand('adamize.connectMCP', async () => {
    vscode.window.showInformationMessage('Connecting to MCP server...');

    try {
      // Determine which client to use based on environment
      const env = networkConfig.getCurrentEnvironment();
      console.info(`Current environment: ${env}`);

      if (env === Environment.Development) {
        // In development, use the enhanced clients
        console.info('Using enhanced clients for development environment');

        // Create and connect enhanced memory client
        enhancedMemoryClient = new EnhancedNeo4jMemoryClient();
        const connected = await enhancedMemoryClient.connect();

        if (connected) {
          vscode.window.showInformationMessage('Connected to Neo4j Memory MCP server');
        } else {
          vscode.window.showErrorMessage('Failed to connect to Neo4j Memory MCP server');
          return;
        }
      } else {
        // In other environments, use the standard clients
        console.info('Using standard clients');

        // Get MCP server URL from environment variable or settings
        const serverUrl = networkConfig.getServiceUrl(ServiceType.MCPNeo4jMemory);

        console.info(`Connecting to MCP server at ${serverUrl}`);

        // Create MCP client
        mcpClient = new MCPClient(serverUrl);

        // Connect to MCP server
        const connected = await mcpClient.connect();

        if (connected) {
          vscode.window.showInformationMessage(`Connected to MCP server at ${serverUrl}`);

          // Create Neo4j Memory client
          memoryClient = new Neo4jMemoryClient(mcpClient);
        } else {
          vscode.window.showErrorMessage(`Failed to connect to MCP server at ${serverUrl}`);
          return;
        }
      }

      // Show success message
      vscode.window.showInformationMessage('Successfully connected to MCP services');
    } catch (error) {
      console.error('Error connecting to MCP server:', error);
      vscode.window.showErrorMessage(`Error connecting to MCP server: ${error}`);
    }
  });

  const listMCPToolsCommand = vscode.commands.registerCommand('adamize.listMCPTools', async () => {
    if (!mcpClient) {
      vscode.window.showErrorMessage('Not connected to MCP server. Please connect first.');
      return;
    }

    vscode.window.showInformationMessage('Listing MCP tools...');

    // Get available tools
    const tools = await mcpClient.getTools();

    if (tools.length > 0) {
      vscode.window.showInformationMessage(`Found ${tools.length} tools: ${tools.join(', ')}`);
    } else {
      vscode.window.showInformationMessage('No tools found');
    }
  });

  // Add Neo4j Memory commands
  const searchMemoryCommand = vscode.commands.registerCommand('adamize.searchMemory', async () => {
    // Check if any memory client is initialized
    if (!memoryClient && !enhancedMemoryClient) {
      vscode.window.showErrorMessage('Memory client not initialized. Please connect to MCP server first.');
      return;
    }

    // Prompt for search query
    const query = await vscode.window.showInputBox({
      prompt: 'Enter search query',
      placeHolder: 'Search query (e.g., "MCP client")'
    });

    if (!query) {
      return;
    }

    vscode.window.showInformationMessage(`Searching memory for "${query}"...`);

    try {
      // Search memory using the appropriate client
      let result;
      if (enhancedMemoryClient) {
        console.info('Using enhanced memory client for search');
        result = await enhancedMemoryClient.searchNodes(query);
      } else if (memoryClient) {
        console.info('Using standard memory client for search');
        result = await memoryClient.searchNodes(query);
      } else {
        throw new Error('No memory client available');
      }

      if (result.status === 'success' && result.result) {
        // Type guard to check if result has the expected structure
        const resultObj = result.result as Record<string, unknown>;

        if (resultObj && 'entities' in resultObj && Array.isArray(resultObj.entities)) {
          const entities = resultObj.entities;
          vscode.window.showInformationMessage(`Found ${entities.length} entities matching "${query}"`);

          // Show results in a new editor
          const document = await vscode.workspace.openTextDocument({
            content: JSON.stringify(entities, null, 2),
            language: 'json'
          });

          await vscode.window.showTextDocument(document);
        } else {
          vscode.window.showInformationMessage(`No entities found matching "${query}"`);
        }
      } else {
        vscode.window.showErrorMessage(`Error searching memory: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error searching memory:', error);
      vscode.window.showErrorMessage(`Error searching memory: ${error}`);
    }
  });

  const runTestsCommand = vscode.commands.registerCommand('adamize.runTests', () => {
    vscode.window.showInformationMessage('Running tests...');
    // TODO: Implement test runner
  });

  const runTestsWithCoverageCommand = vscode.commands.registerCommand(
    'adamize.runTestsWithCoverage',
    () => {
      vscode.window.showInformationMessage('Running tests with coverage...');
      // TODO: Implement test runner with coverage
    }
  );

  // Initialize MCP Bridge Manager
  const outputChannel = vscode.window.createOutputChannel('Adamize MCP Bridge');
  mcpBridgeManager = new MCPBridgeManager(context, outputChannel);

  // Initialize MCP Server Explorer View
  mcpServerExplorerProvider = new MCPServerExplorerProvider(context, mcpBridgeManager, outputChannel);

  // Register MCP Server Explorer View
  const mcpServerExplorerView = vscode.window.createTreeView('mcpServerExplorer', {
    treeDataProvider: mcpServerExplorerProvider,
    showCollapseAll: true
  });

  // Initialize MCP Chat View Provider
  mcpChatViewProvider = new MCPChatViewProvider(context, mcpBridgeManager, outputChannel);

  // Add commands to subscriptions
  context.subscriptions.push(showWelcomeCommand);
  context.subscriptions.push(connectMCPCommand);
  context.subscriptions.push(listMCPToolsCommand);
  context.subscriptions.push(searchMemoryCommand);
  context.subscriptions.push(runTestsCommand);
  context.subscriptions.push(runTestsWithCoverageCommand);
  context.subscriptions.push(mcpServerExplorerView);
  context.subscriptions.push(outputChannel);

  // Show welcome message on first activation
  showWelcomeMessage(context);
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.info('Deactivating Adamize extension');

  // Dispose MCP Bridge Manager
  if (mcpBridgeManager) {
    mcpBridgeManager.dispose();
    mcpBridgeManager = undefined;
  }

  // Clean up other providers
  mcpServerExplorerProvider = undefined;
  mcpChatViewProvider = undefined;
}

/**
 * Show welcome message on first activation
 * @param context Extension context
 */
export function showWelcomeMessage(context: vscode.ExtensionContext) {
  const hasShownWelcome = context.globalState.get('adamize.hasShownWelcome');
  if (!hasShownWelcome) {
    vscode.window.showInformationMessage('Welcome to Adamize! Get started by connecting to an MCP server.');
    context.globalState.update('adamize.hasShownWelcome', true);
  }
}
