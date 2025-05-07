# MCP Bridge Adaptation Plan

This document outlines our plan for adapting the ollama-mcp-bridge code to work within our VS Code extension.

## Overview

We'll adapt the ollama-mcp-bridge code to work within our VS Code extension, focusing initially on Ollama support with the ability to extend to other LLM providers later. The adaptation will maintain the core functionality while integrating with VS Code's extension API.

## File Structure

```
src/
├── mcp/
│   ├── bridge/
│   │   ├── mcpBridge.ts           # Adapted from bridge.ts
│   │   ├── llmClient.ts           # Adapted from llm-client.ts
│   │   ├── mcpClient.ts           # Adapted from mcp-client.ts
│   │   ├── toolRegistry.ts        # Adapted from tool-registry.ts
│   │   ├── types.ts               # Adapted from types.ts
│   │   └── vscodeLogger.ts        # VS Code-specific logger
│   ├── mcpBridgeManager.ts        # VS Code extension integration
│   └── mcpBridgeCommands.ts       # VS Code commands for the bridge
```

## Key Adaptations

### 1. Entry Point Adaptation

Replace the CLI-based `main.ts` with VS Code extension integration:

```typescript
// mcpBridgeManager.ts
import * as vscode from 'vscode';
import { MCPLLMBridge } from './bridge/mcpBridge';
import { loadConfigFromVSCode } from './mcpBridgeConfig';

export class MCPBridgeManager {
  private bridge: MCPLLMBridge | null = null;
  private outputChannel: vscode.OutputChannel;

  constructor(context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel('MCP Bridge');
    context.subscriptions.push(this.outputChannel);
  }

  async initialize(): Promise<boolean> {
    try {
      const config = await loadConfigFromVSCode();
      this.bridge = new MCPLLMBridge(config);
      return await this.bridge.initialize();
    } catch (error) {
      this.outputChannel.appendLine(`Initialization error: ${error}`);
      return false;
    }
  }

  async processMessage(message: string): Promise<string> {
    if (!this.bridge) {
      throw new Error('Bridge not initialized');
    }
    return await this.bridge.processMessage(message);
  }

  async dispose(): Promise<void> {
    if (this.bridge) {
      await this.bridge.close();
      this.bridge = null;
    }
  }
}
```

### 2. Logging Adaptation

Replace the console logger with VS Code output channels:

```typescript
// vscodeLogger.ts
import * as vscode from 'vscode';

export class VSCodeLogger {
  private outputChannel: vscode.OutputChannel;

  constructor(channelName: string = 'MCP Bridge') {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  debug(message: string, ...args: any[]): void {
    if (vscode.workspace.getConfiguration('mcpBridge').get('debugLogging')) {
      this.log('DEBUG', message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('ERROR', message, ...args);
    vscode.window.showErrorMessage(`MCP Bridge: ${message}`);
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (args.length > 0) {
      logMessage += ' ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : arg
      ).join(' ');
    }
    
    this.outputChannel.appendLine(logMessage);
  }

  show(): void {
    this.outputChannel.show();
  }
}

export const logger = new VSCodeLogger();
```

### 3. Configuration Adaptation

Use VS Code's configuration API:

```typescript
// mcpBridgeConfig.ts
import * as vscode from 'vscode';
import { BridgeConfig, ServerParameters, LLMConfig } from './bridge/types';
import { logger } from './bridge/vscodeLogger';

export async function loadConfigFromVSCode(): Promise<BridgeConfig> {
  const config = vscode.workspace.getConfiguration('mcpBridge');
  
  // Get Ollama configuration
  const ollamaConfig: LLMConfig = {
    model: config.get('ollama.model') || 'llama3',
    baseUrl: config.get('ollama.baseUrl') || 'http://localhost:11434',
    temperature: config.get('ollama.temperature') || 0.7,
    maxTokens: config.get('ollama.maxTokens') || 2000,
    systemPrompt: config.get('systemPrompt') || ''
  };

  // Get MCP server configurations
  const mcpServers: Record<string, ServerParameters> = {};
  
  // Filesystem MCP
  mcpServers.filesystem = {
    command: config.get('mcp.filesystem.command') || 'node',
    args: config.get('mcp.filesystem.args') || ['./server-filesystem/server.js'],
    allowedDirectory: config.get('mcp.filesystem.allowedDirectory') || vscode.workspace.workspaceFolders?.[0].uri.fsPath
  };
  
  // Web MCP
  mcpServers.web = {
    command: config.get('mcp.web.command') || 'node',
    args: config.get('mcp.web.args') || ['./server-web/server.js'],
    allowedDirectory: config.get('mcp.web.allowedDirectory') || vscode.workspace.workspaceFolders?.[0].uri.fsPath
  };
  
  // Memory MCP (for graph operations)
  mcpServers.memory = {
    command: config.get('mcp.memory.command') || 'node',
    args: config.get('mcp.memory.args') || ['./server-memory/server.js'],
    allowedDirectory: config.get('mcp.memory.allowedDirectory') || vscode.workspace.workspaceFolders?.[0].uri.fsPath
  };

  logger.debug('Loaded configuration:', { ollamaConfig, mcpServers });
  
  return {
    mcpServer: mcpServers.filesystem,  // Primary MCP
    mcpServerName: 'filesystem',
    mcpServers: mcpServers,
    llmConfig: ollamaConfig,
    systemPrompt: config.get('systemPrompt') || ''
  };
}
```

### 4. Process Management Adaptation

Adjust Ollama process management for VS Code/WSL:

```typescript
// Modifications to llmClient.ts
// ...

// Replace direct process spawning with VS Code terminal API
private async startOllama(): Promise<void> {
  if (this.ollamaProcess) {
    return;
  }
  
  logger.debug("Starting Ollama...");
  
  // Use VS Code terminal API for better integration
  const terminal = vscode.window.createTerminal({
    name: 'Ollama',
    hideFromUser: true
  });
  
  terminal.sendText('ollama serve');
  
  // Store terminal reference
  this.ollamaTerminal = terminal;
  
  // Wait for Ollama to start
  let connected = false;
  for (let i = 0; i < 10; i++) {
    logger.debug(`Waiting for Ollama to start (attempt ${i + 1}/10)...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await this.testConnection()) {
      logger.debug("Ollama is ready and responding");
      connected = true;
      break;
    }
  }
  
  if (!connected) {
    throw new Error("Failed to start Ollama after 10 attempts");
  }
}

// ...
```

### 5. VS Code Commands Integration

Add VS Code commands for interacting with the bridge:

```typescript
// mcpBridgeCommands.ts
import * as vscode from 'vscode';
import { MCPBridgeManager } from './mcpBridgeManager';
import { logger } from './bridge/vscodeLogger';

export function registerCommands(context: vscode.ExtensionContext, bridgeManager: MCPBridgeManager): void {
  // Command to initialize the bridge
  context.subscriptions.push(
    vscode.commands.registerCommand('adamize.initializeBridge', async () => {
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Initializing MCP Bridge...",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0 });
        
        try {
          const success = await bridgeManager.initialize();
          progress.report({ increment: 100 });
          
          if (success) {
            vscode.window.showInformationMessage('MCP Bridge initialized successfully');
          } else {
            vscode.window.showErrorMessage('Failed to initialize MCP Bridge');
          }
          
          return success;
        } catch (error) {
          logger.error(`Error initializing bridge: ${error}`);
          vscode.window.showErrorMessage(`Error initializing MCP Bridge: ${error}`);
          return false;
        }
      });
    })
  );
  
  // Command to send a message to the bridge
  context.subscriptions.push(
    vscode.commands.registerCommand('adamize.sendMessage', async () => {
      const message = await vscode.window.showInputBox({
        prompt: 'Enter your message',
        placeHolder: 'What would you like to ask?'
      });
      
      if (!message) {
        return;
      }
      
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Processing message...",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0 });
        
        try {
          const response = await bridgeManager.processMessage(message);
          progress.report({ increment: 100 });
          
          // Show response in a new editor
          const document = await vscode.workspace.openTextDocument({
            content: response,
            language: 'markdown'
          });
          
          await vscode.window.showTextDocument(document);
          
          return true;
        } catch (error) {
          logger.error(`Error processing message: ${error}`);
          vscode.window.showErrorMessage(`Error processing message: ${error}`);
          return false;
        }
      });
    })
  );
}
```

## Next Steps

1. Implement the adapted files in our VS Code extension
2. Test the integration with Ollama
3. Add memory graph operations
4. Implement VS Code UI components for visualization
5. Add support for additional LLM providers as needed

## Timeline

1. **Week 1**: Implement core adaptations (logging, configuration, process management)
2. **Week 2**: Integrate with VS Code extension and test with Ollama
3. **Week 3**: Add memory graph operations and persistence
4. **Week 4**: Implement VS Code UI components and visualization
