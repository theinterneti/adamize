# VS Code Configuration for MCP Bridge

This document outlines the VS Code configuration schema for our adapted MCP Bridge.

## Configuration Schema

The following configuration will be added to the `package.json` file in the `contributes.configuration` section:

```json
"contributes": {
  "configuration": {
    "title": "Adamize MCP Bridge",
    "properties": {
      "mcpBridge.debugLogging": {
        "type": "boolean",
        "default": false,
        "description": "Enable debug logging for MCP Bridge"
      },
      "mcpBridge.ollama.model": {
        "type": "string",
        "default": "llama3",
        "description": "Ollama model to use"
      },
      "mcpBridge.ollama.baseUrl": {
        "type": "string",
        "default": "http://localhost:11434",
        "description": "Base URL for Ollama API"
      },
      "mcpBridge.ollama.temperature": {
        "type": "number",
        "default": 0.7,
        "minimum": 0,
        "maximum": 2,
        "description": "Temperature for Ollama model generation"
      },
      "mcpBridge.ollama.maxTokens": {
        "type": "number",
        "default": 2000,
        "minimum": 1,
        "description": "Maximum tokens to generate"
      },
      "mcpBridge.systemPrompt": {
        "type": "string",
        "default": "You are a helpful assistant with access to various tools. Use the tools when appropriate to help the user.",
        "description": "System prompt for the LLM"
      },
      "mcpBridge.mcp.filesystem.command": {
        "type": "string",
        "default": "node",
        "description": "Command to run the filesystem MCP server"
      },
      "mcpBridge.mcp.filesystem.args": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": ["./server-filesystem/server.js"],
        "description": "Arguments for the filesystem MCP server command"
      },
      "mcpBridge.mcp.filesystem.allowedDirectory": {
        "type": "string",
        "description": "Allowed directory for filesystem operations (defaults to workspace root)"
      },
      "mcpBridge.mcp.web.command": {
        "type": "string",
        "default": "node",
        "description": "Command to run the web MCP server"
      },
      "mcpBridge.mcp.web.args": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": ["./server-web/server.js"],
        "description": "Arguments for the web MCP server command"
      },
      "mcpBridge.mcp.web.allowedDirectory": {
        "type": "string",
        "description": "Allowed directory for web MCP server (defaults to workspace root)"
      },
      "mcpBridge.mcp.memory.command": {
        "type": "string",
        "default": "node",
        "description": "Command to run the memory MCP server"
      },
      "mcpBridge.mcp.memory.args": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": ["./server-memory/server.js"],
        "description": "Arguments for the memory MCP server command"
      },
      "mcpBridge.mcp.memory.allowedDirectory": {
        "type": "string",
        "description": "Allowed directory for memory MCP server (defaults to workspace root)"
      },
      "mcpBridge.mcp.memory.databaseUrl": {
        "type": "string",
        "default": "neo4j://localhost:7687",
        "description": "URL for the Neo4j database used by the memory MCP server"
      },
      "mcpBridge.mcp.memory.databaseUser": {
        "type": "string",
        "default": "neo4j",
        "description": "Username for the Neo4j database"
      },
      "mcpBridge.mcp.memory.databasePassword": {
        "type": "string",
        "description": "Password for the Neo4j database"
      }
    }
  },
  "commands": [
    {
      "command": "adamize.initializeBridge",
      "title": "Adamize: Initialize MCP Bridge"
    },
    {
      "command": "adamize.sendMessage",
      "title": "Adamize: Send Message to LLM"
    },
    {
      "command": "adamize.showTools",
      "title": "Adamize: Show Available Tools"
    },
    {
      "command": "adamize.configureOllama",
      "title": "Adamize: Configure Ollama"
    },
    {
      "command": "adamize.configureMcpServers",
      "title": "Adamize: Configure MCP Servers"
    }
  ]
}
```

## Configuration UI

We'll provide a configuration UI for the MCP Bridge settings using VS Code's settings editor. Additionally, we'll create custom configuration pages for more complex settings:

### Ollama Configuration

We'll create a custom webview for configuring Ollama:

```typescript
// ollamaConfigView.ts
import * as vscode from 'vscode';

export class OllamaConfigView {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public show() {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'ollamaConfig',
      'Configure Ollama',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel.webview.html = this.getWebviewContent();
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    this.panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'saveConfig') {
        const config = vscode.workspace.getConfiguration('mcpBridge');
        await config.update('ollama.model', message.model, vscode.ConfigurationTarget.Global);
        await config.update('ollama.baseUrl', message.baseUrl, vscode.ConfigurationTarget.Global);
        await config.update('ollama.temperature', message.temperature, vscode.ConfigurationTarget.Global);
        await config.update('ollama.maxTokens', message.maxTokens, vscode.ConfigurationTarget.Global);
        
        vscode.window.showInformationMessage('Ollama configuration saved');
      }
    });
  }

  private getWebviewContent() {
    const config = vscode.workspace.getConfiguration('mcpBridge');
    const model = config.get('ollama.model');
    const baseUrl = config.get('ollama.baseUrl');
    const temperature = config.get('ollama.temperature');
    const maxTokens = config.get('ollama.maxTokens');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Configure Ollama</title>
        <style>
          body { padding: 20px; font-family: var(--vscode-font-family); }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input, select { width: 100%; padding: 5px; }
          button { padding: 8px 16px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <h1>Configure Ollama</h1>
        <div class="form-group">
          <label for="model">Model</label>
          <input type="text" id="model" value="${model || 'llama3'}">
        </div>
        <div class="form-group">
          <label for="baseUrl">Base URL</label>
          <input type="text" id="baseUrl" value="${baseUrl || 'http://localhost:11434'}">
        </div>
        <div class="form-group">
          <label for="temperature">Temperature</label>
          <input type="range" id="temperature" min="0" max="2" step="0.1" value="${temperature || 0.7}">
          <span id="temperatureValue">${temperature || 0.7}</span>
        </div>
        <div class="form-group">
          <label for="maxTokens">Max Tokens</label>
          <input type="number" id="maxTokens" min="1" value="${maxTokens || 2000}">
        </div>
        <button id="saveButton">Save Configuration</button>

        <script>
          const vscode = acquireVsCodeApi();
          
          document.getElementById('temperature').addEventListener('input', (e) => {
            document.getElementById('temperatureValue').textContent = e.target.value;
          });
          
          document.getElementById('saveButton').addEventListener('click', () => {
            vscode.postMessage({
              command: 'saveConfig',
              model: document.getElementById('model').value,
              baseUrl: document.getElementById('baseUrl').value,
              temperature: parseFloat(document.getElementById('temperature').value),
              maxTokens: parseInt(document.getElementById('maxTokens').value)
            });
          });
        </script>
      </body>
      </html>
    `;
  }
}
```

## Default Configuration

The default configuration will be set up to work with Ollama running locally and MCP servers bundled with the extension. Users can customize these settings as needed.

## Configuration Storage

Configuration will be stored in VS Code's settings storage, which is automatically persisted across sessions. Sensitive information like database passwords will be stored in VS Code's secrets storage.

## Next Steps

1. Implement the configuration schema in `package.json`
2. Create the configuration UI components
3. Implement the configuration loading in the MCP Bridge manager
4. Add validation for configuration values
5. Provide helpful error messages for misconfiguration
