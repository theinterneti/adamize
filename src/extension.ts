// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { MCPClient } from './mcp/mcpClient';
// import { EnhancedMCPClient } from './mcp/enhancedMcpClient';
import { initializeTestGenerationCommands } from './commands/testGenerationCommands';
import { LLMProvider } from './mcp/llmClient';
import { MCPBridgeManager } from './mcp/mcpBridgeManager';
import { ModelPresetTool } from './mcp/tools/modelPresetTool';
import { EnhancedNeo4jMemoryClient } from './memory/enhancedNeo4jMemoryClient';
import { Neo4jMemoryClient } from './memory/neo4jMemoryClient';
import { CoverageVisualizationProvider } from './ui/coverageVisualizationProvider';
import { MCPChatViewProvider } from './ui/mcpChatView';
import { MCPServerExplorerProvider } from './ui/mcpServerExplorerView';
import { MemoryGraphViewProvider } from './ui/memoryGraphView';
import { ModelManagerViewProvider } from './ui/modelManagerView';
import { OllamaConfigViewProvider } from './ui/ollamaConfigView';
import { PresetManagerViewProvider } from './ui/presetManagerView';
import { ModelManager } from './utils/modelManager.new';
import networkConfig, { Environment, ServiceType } from './utils/networkConfig';
import { PresetManager } from './utils/presetManager';

// Global variables
let mcpClient: MCPClient | undefined;
// These variables are used in the activate function
let memoryClient: Neo4jMemoryClient | undefined;
let enhancedMemoryClient: EnhancedNeo4jMemoryClient | undefined;
let mcpBridgeManager: MCPBridgeManager | undefined;
let mcpServerExplorerProvider: MCPServerExplorerProvider | undefined;
// These providers are initialized but not directly used in this file
// They're kept as module variables for cleanup during deactivation
// Using _ prefix to indicate these are intentionally unused in this scope
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-ignore
let _mcpChatViewProvider: MCPChatViewProvider | undefined;
// @ts-ignore
let _memoryGraphViewProvider: MemoryGraphViewProvider | undefined;
// @ts-ignore
let _ollamaConfigViewProvider: OllamaConfigViewProvider | undefined;
// @ts-ignore
let _modelManagerViewProvider: ModelManagerViewProvider | undefined;
// @ts-ignore
let _presetManagerViewProvider: PresetManagerViewProvider | undefined;
// @ts-ignore
let _coverageVisualizationProvider: CoverageVisualizationProvider | undefined;
/* eslint-enable @typescript-eslint/no-unused-vars */

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext): void {
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
      vscode.window.showErrorMessage(
        'Memory client not initialized. Please connect to MCP server first.'
      );
      return;
    }

    // Prompt for search query
    const query = await vscode.window.showInputBox({
      prompt: 'Enter search query',
      placeHolder: 'Search query (e.g., "MCP client")',
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
          vscode.window.showInformationMessage(
            `Found ${entities.length} entities matching "${query}"`
          );

          // Show results in a new editor
          const document = await vscode.workspace.openTextDocument({
            content: JSON.stringify(entities, null, 2),
            language: 'json',
          });

          await vscode.window.showTextDocument(document);
        } else {
          vscode.window.showInformationMessage(`No entities found matching "${query}"`);
        }
      } else {
        vscode.window.showErrorMessage(
          `Error searching memory: ${result.error || 'Unknown error'}`
        );
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
  mcpServerExplorerProvider = new MCPServerExplorerProvider(
    context,
    mcpBridgeManager,
    outputChannel
  );

  // Register MCP Server Explorer View
  const mcpServerExplorerView = vscode.window.createTreeView('mcpServerExplorer', {
    treeDataProvider: mcpServerExplorerProvider,
    showCollapseAll: true,
  });

  // Initialize MCP Chat View Provider
  _mcpChatViewProvider = new MCPChatViewProvider(context, mcpBridgeManager, outputChannel);

  // Initialize Memory Graph View Provider
  enhancedMemoryClient = new EnhancedNeo4jMemoryClient();
  _memoryGraphViewProvider = new MemoryGraphViewProvider(
    context,
    enhancedMemoryClient,
    outputChannel
  );

  // Initialize test generation commands
  initializeTestGenerationCommands(context);

  // Initialize coverage visualization provider
  _coverageVisualizationProvider = new CoverageVisualizationProvider(context);

  // Initialize Ollama configuration view provider
  _ollamaConfigViewProvider = new OllamaConfigViewProvider(context);

  // Initialize Model Manager and View Provider
  try {
    const modelManager = new ModelManager(context, outputChannel);
    _modelManagerViewProvider = new ModelManagerViewProvider(
      context.extensionUri,
      modelManager,
      outputChannel
    );

    // Initialize Preset Manager
    const presetManager = new PresetManager(context, outputChannel);
    presetManager
      .initialize()
      .then(() => {
        // Create Model Preset Tool
        const modelPresetTool = new ModelPresetTool(presetManager, outputChannel);

        // Register Model Preset Tool with MCP Bridge Manager
        if (mcpBridgeManager) {
          // Create a default bridge if none exists
          const bridges = mcpBridgeManager.getAllBridges();
          let bridgeId: string;

          if (bridges.length === 0) {
            // Create a default bridge
            const ollamaConfig = vscode.workspace.getConfiguration('adamize.ollama');
            bridgeId = mcpBridgeManager.createBridge({
              llmProvider: LLMProvider.Ollama,
              llmModel: (ollamaConfig.get('model') as string) || 'qwen3-coder',
              llmEndpoint:
                (ollamaConfig.get('endpoint') as string) ||
                'http://localhost:11434/v1/chat/completions',
              systemPrompt: ollamaConfig.get('systemPrompt') as string,
              temperature: ollamaConfig.get('temperature') as number,
              maxTokens: ollamaConfig.get('maxTokens') as number,
            });
          } else {
            // Use the first bridge
            bridgeId = bridges[0].id;
          }

          // Register the tool with the bridge
          mcpBridgeManager.registerTool(bridgeId, modelPresetTool);
          outputChannel.appendLine(
            `[Adamize] Registered Model Preset Tool with bridge ${bridgeId}`
          );
        }
      })
      .catch(error => {
        outputChannel.appendLine(`[Adamize] Error initializing Preset Manager: ${error}`);
      });

    // Register Model Manager View
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        ModelManagerViewProvider.viewType,
        _modelManagerViewProvider
      )
    );

    // Initialize and register Preset Manager View
    _presetManagerViewProvider = new PresetManagerViewProvider(
      context.extensionUri,
      presetManager,
      modelManager,
      outputChannel
    );

    // Register Preset Manager View
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        PresetManagerViewProvider.viewType,
        _presetManagerViewProvider
      )
    );

    // Register Model Manager commands
    context.subscriptions.push(
      vscode.commands.registerCommand('adamize.refreshModels', async () => {
        try {
          const models = await modelManager.listModels();
          vscode.window.showInformationMessage(`Found ${models.length} models`);
        } catch (error) {
          vscode.window.showErrorMessage(`Error refreshing models: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('adamize.pullOllamaModel', async () => {
        try {
          const modelName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the model to pull',
            placeHolder: 'e.g., llama3',
          });

          if (!modelName) {
            return;
          }

          await modelManager.pullOllamaModel(modelName);
          vscode.window.showInformationMessage(`Successfully pulled model: ${modelName}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Error pulling model: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('adamize.removeOllamaModel', async () => {
        try {
          const models = await modelManager.discoverOllamaModels();

          if (models.length === 0) {
            vscode.window.showInformationMessage('No Ollama models found');
            return;
          }

          const modelName = await vscode.window.showQuickPick(
            models.map(model => model.name),
            {
              placeHolder: 'Select a model to remove',
            }
          );

          if (!modelName) {
            return;
          }

          // Confirm with user
          const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to remove model: ${modelName}?`,
            { modal: true },
            'Yes',
            'No'
          );

          if (confirm !== 'Yes') {
            return;
          }

          await modelManager.removeOllamaModel(modelName);
          vscode.window.showInformationMessage(`Successfully removed model: ${modelName}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Error removing model: ${error}`);
        }
      })
    );
  } catch (error) {
    console.error('Error initializing Model Manager:', error);
  }

  // Register Ollama commands
  const startOllamaCommand = vscode.commands.registerCommand('adamize.startOllama', async () => {
    vscode.window.showInformationMessage('Starting Ollama...');

    try {
      const baseUrl =
        (vscode.workspace.getConfiguration('adamize.ollama').get('baseUrl') as string) ||
        'http://localhost:11434';

      // Try to connect to Ollama
      const response = await fetch(`${baseUrl}/api/tags`);

      if (response.ok) {
        vscode.window.showInformationMessage('Ollama is already running');
        return;
      }
    } catch {
      // Ollama is not running, start it
      const terminal = vscode.window.createTerminal('Ollama');
      terminal.sendText('ollama serve');
      terminal.show();

      vscode.window.showInformationMessage('Ollama server started');
    }
  });

  const stopOllamaCommand = vscode.commands.registerCommand('adamize.stopOllama', async () => {
    vscode.window.showInformationMessage('Stopping Ollama...');

    // Find and kill Ollama process
    const terminal = vscode.window.createTerminal('Stop Ollama');

    if (process.platform === 'win32') {
      terminal.sendText('taskkill /F /IM ollama.exe');
    } else {
      terminal.sendText('pkill -f ollama');
    }

    terminal.sendText('exit');

    vscode.window.showInformationMessage('Ollama server stopped');
  });

  const openOllamaChatCommand = vscode.commands.registerCommand(
    'adamize.openOllamaChat',
    async () => {
      vscode.window.showInformationMessage('Opening Ollama Chat...');

      // Create a bridge for Ollama
      const ollamaConfig = vscode.workspace.getConfiguration('adamize.ollama');
      const bridgeId = mcpBridgeManager?.createBridge({
        llmProvider: LLMProvider.Ollama,
        llmModel: (ollamaConfig.get('model') as string) || 'qwen3-coder',
        llmEndpoint:
          (ollamaConfig.get('endpoint') as string) || 'http://localhost:11434/v1/chat/completions',
        systemPrompt: ollamaConfig.get('systemPrompt') as string,
        temperature: ollamaConfig.get('temperature') as number,
        maxTokens: ollamaConfig.get('maxTokens') as number,
      });

      if (bridgeId && mcpBridgeManager) {
        mcpBridgeManager.startBridge(bridgeId);

        // Open chat view
        await vscode.commands.executeCommand('adamize.openMCPChat');
      } else {
        vscode.window.showErrorMessage('Failed to create Ollama bridge');
      }
    }
  );

  // Add Ollama commands to subscriptions
  context.subscriptions.push(startOllamaCommand);
  context.subscriptions.push(stopOllamaCommand);
  context.subscriptions.push(openOllamaChatCommand);

  // Notion integration will be implemented in a future update
  // For now, we'll just show a message that it's coming soon
  vscode.commands.registerCommand('adamize.notion.comingSoon', () => {
    vscode.window.showInformationMessage('Notion integration coming soon!');
  });

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
export function deactivate(): void {
  console.info('Deactivating Adamize extension');

  // Dispose MCP Bridge Manager
  if (mcpBridgeManager) {
    mcpBridgeManager.dispose();
    mcpBridgeManager = undefined;
  }

  // Clean up other providers
  mcpServerExplorerProvider = undefined;
  _mcpChatViewProvider = undefined;
  _memoryGraphViewProvider = undefined;
  _ollamaConfigViewProvider = undefined;
  _modelManagerViewProvider = undefined;
  _presetManagerViewProvider = undefined;
  _coverageVisualizationProvider = undefined;
  enhancedMemoryClient = undefined;
}

/**
 * Show welcome message on first activation
 * @param context Extension context
 */
export function showWelcomeMessage(context: vscode.ExtensionContext): void {
  const hasShownWelcome = context.globalState.get('adamize.hasShownWelcome');
  if (!hasShownWelcome) {
    vscode.window.showInformationMessage(
      'Welcome to Adamize! Get started by connecting to an MCP server.'
    );
    context.globalState.update('adamize.hasShownWelcome', true);
  }
}
