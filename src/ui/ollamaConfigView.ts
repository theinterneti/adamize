/**
 * Ollama Configuration View
 *
 * Provides a UI for configuring Ollama settings.
 *
 * @implements IMPL-UI-201 Display a configuration interface for Ollama
 * @implements IMPL-UI-202 Allow configuring Ollama model
 * @implements IMPL-UI-203 Allow configuring Ollama endpoint
 * @implements IMPL-UI-204 Allow configuring Ollama temperature
 * @implements IMPL-UI-205 Allow configuring Ollama max tokens
 * @implements IMPL-UI-206 Allow configuring Ollama system prompt
 */

import * as vscode from 'vscode';

/**
 * Ollama Configuration View Provider
 */
export class OllamaConfigViewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private extensionUri: vscode.Uri;

  /**
   * Create a new Ollama configuration view provider
   * @param context Extension context
   */
  constructor(private context: vscode.ExtensionContext) {
    this.extensionUri = vscode.Uri.file(context.extensionPath);

    // Register commands
    this.registerCommands();
  }

  /**
   * Register commands for the configuration view
   */
  private registerCommands(): void {
    // Register open configuration command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('adamize.configureOllama', () => this.createOrShowPanel())
    );
  }

  /**
   * Create or show the configuration panel
   */
  public async createOrShowPanel(): Promise<vscode.WebviewPanel> {
    // If we already have a panel, show it
    if (this.panel) {
      this.panel.reveal(1); // vscode.ViewColumn.One
      return this.panel;
    }

    // Otherwise, create a new panel
    this.panel = vscode.window.createWebviewPanel(
      'ollamaConfig',
      'Ollama Configuration',
      1, // vscode.ViewColumn.One
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri]
      }
    );

    // Set the webview's HTML content
    this.panel.webview.html = this.getWebviewContent();

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleWebviewMessage(message),
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

    return this.panel;
  }

  /**
   * Handle messages from the webview
   * @param message Message from the webview
   */
  private async handleWebviewMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'saveConfig':
        await this.saveConfiguration(message);
        break;
      case 'testConnection':
        await this.testConnection(message);
        break;
      case 'listModels':
        await this.listModels(message);
        break;
    }
  }

  /**
   * Save the Ollama configuration
   * @param message Message containing the configuration
   */
  private async saveConfiguration(message: any): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('adamize.ollama');
      await config.update('enabled', message.enabled, vscode.ConfigurationTarget.Global);
      await config.update('provider', message.provider || 'ollama', vscode.ConfigurationTarget.Global);
      await config.update('model', message.model, vscode.ConfigurationTarget.Global);
      await config.update('baseUrl', message.baseUrl, vscode.ConfigurationTarget.Global);
      await config.update('endpoint', message.endpoint, vscode.ConfigurationTarget.Global);
      await config.update('temperature', message.temperature, vscode.ConfigurationTarget.Global);
      await config.update('maxTokens', message.maxTokens, vscode.ConfigurationTarget.Global);
      await config.update('systemPrompt', message.systemPrompt, vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage('LLM configuration saved');
    } catch (error) {
      vscode.window.showErrorMessage(`Error saving configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test the connection to the LLM provider
   * @param message Message containing the configuration
   */
  private async testConnection(message: any): Promise<void> {
    try {
      const provider = message.provider || 'ollama';
      const baseUrl = message.baseUrl || 'http://localhost:11434';

      if (provider === 'ollama') {
        const response = await fetch(`${baseUrl}/api/tags`);

        if (response.ok) {
          const data = await response.json();
          const models = data.models || [];

          if (this.panel) {
            this.panel.webview.postMessage({
              command: 'connectionResult',
              success: true,
              models: models.map((model: any) => model.name || '')
            });
          }

          vscode.window.showInformationMessage(`Successfully connected to ${provider}`);
        } else {
          if (this.panel) {
            this.panel.webview.postMessage({
              command: 'connectionResult',
              success: false,
              error: `HTTP error: ${response.status} ${response.statusText}`
            });
          }

          vscode.window.showErrorMessage(`Failed to connect to ${provider}: ${response.status} ${response.statusText}`);
        }
      } else {
        // For future providers
        if (this.panel) {
          this.panel.webview.postMessage({
            command: 'connectionResult',
            success: false,
            error: `Provider ${provider} is not supported yet`
          });
        }

        vscode.window.showErrorMessage(`Provider ${provider} is not supported yet`);
      }
    } catch (error) {
      if (this.panel) {
        this.panel.webview.postMessage({
          command: 'connectionResult',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      vscode.window.showErrorMessage(`Error connecting to ${message.provider || 'LLM provider'}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List available Ollama models
   * @param message Message containing the configuration
   */
  private async listModels(message: any): Promise<void> {
    try {
      const provider = message.provider || 'ollama';
      const baseUrl = message.baseUrl || 'http://localhost:11434';

      if (provider === 'ollama') {
        const response = await fetch(`${baseUrl}/api/tags`);

        if (response.ok) {
          const data = await response.json();
          const models = data.models || [];

          if (this.panel) {
            this.panel.webview.postMessage({
              command: 'modelsList',
              models: models.map((model: any) => model.name || '')
            });
          }
        } else {
          if (this.panel) {
            this.panel.webview.postMessage({
              command: 'modelsList',
              models: [],
              error: `HTTP error: ${response.status} ${response.statusText}`
            });
          }
        }
      } else {
        // For future providers
        if (this.panel) {
          this.panel.webview.postMessage({
            command: 'modelsList',
            models: [],
            error: `Provider ${provider} is not supported yet`
          });
        }
      }
    } catch (error) {
      if (this.panel) {
        this.panel.webview.postMessage({
          command: 'modelsList',
          models: [],
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Get the webview content
   * @returns HTML content for the webview
   */
  private getWebviewContent(): string {
    const config = vscode.workspace.getConfiguration('adamize.ollama');
    const enabled = config.get('enabled') as boolean;
    const model = config.get('model') as string;
    const baseUrl = config.get('baseUrl') as string;
    const endpoint = config.get('endpoint') as string;
    const temperature = config.get('temperature') as number;
    const maxTokens = config.get('maxTokens') as number;
    const systemPrompt = config.get('systemPrompt') as string;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ollama Configuration</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="text"], input[type="number"], textarea, select {
            width: 100%;
            padding: 8px;
            box-sizing: border-box;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
        }
        textarea {
            min-height: 100px;
            resize: vertical;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 12px;
            cursor: pointer;
            margin-right: 10px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .button-container {
            margin-top: 20px;
            display: flex;
            justify-content: flex-start;
        }
        .status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 4px;
        }
        .success {
            background-color: var(--vscode-terminal-ansiGreen);
            color: var(--vscode-terminal-foreground);
        }
        .error {
            background-color: var(--vscode-terminal-ansiRed);
            color: var(--vscode-terminal-foreground);
        }
        .hidden {
            display: none;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: var(--vscode-button-background);
            animation: spin 1s ease-in-out infinite;
            margin-left: 10px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .full-width {
            grid-column: 1 / 3;
        }
    </style>
</head>
<body>
    <h1>LLM Configuration</h1>
    <div class="form-group">
        <label>
            <input type="checkbox" id="enabled" ${enabled ? 'checked' : ''}>
            Enable LLM Integration
        </label>
    </div>

    <div class="grid-container">
        <div class="form-group">
            <label for="provider">Provider</label>
            <select id="provider">
                <option value="ollama" selected>Ollama</option>
                <!-- More providers can be added here in the future -->
            </select>
        </div>

        <div class="form-group">
            <label for="model">Model</label>
            <div style="display: flex; align-items: center;">
                <select id="model" style="flex-grow: 1;">
                    <option value="${model || 'qwen3-coder'}">${model || 'qwen3-coder'}</option>
                </select>
                <div id="modelLoading" class="loading hidden"></div>
            </div>
        </div>

        <div class="form-group">
            <label for="baseUrl">Base URL</label>
            <input type="text" id="baseUrl" value="${baseUrl || 'http://localhost:11434'}">
        </div>

        <div class="form-group">
            <label for="endpoint">API Endpoint</label>
            <input type="text" id="endpoint" value="${endpoint || 'http://localhost:11434/v1/chat/completions'}">
        </div>

        <div class="form-group">
            <label for="temperature">Temperature (0.0 - 2.0)</label>
            <input type="number" id="temperature" min="0" max="2" step="0.1" value="${temperature || 0.7}">
        </div>

        <div class="form-group">
            <label for="maxTokens">Max Tokens</label>
            <input type="number" id="maxTokens" min="1" value="${maxTokens || 2000}">
        </div>

        <div class="form-group full-width">
            <label for="systemPrompt">System Prompt</label>
            <textarea id="systemPrompt">${systemPrompt || 'You are a helpful assistant that can use tools to help answer questions.'}</textarea>
        </div>
    </div>

    <div class="button-container">
        <button id="saveButton">Save Configuration</button>
        <button id="testButton">Test Connection</button>
        <button id="refreshModelsButton">Refresh Models</button>
    </div>

    <div id="status" class="status hidden"></div>

    <script>
        const vscode = acquireVsCodeApi();

        // Fetch models on load
        window.addEventListener('load', () => {
            fetchModels();
        });

        // Handle save button click
        document.getElementById('saveButton').addEventListener('click', () => {
            const config = {
                command: 'saveConfig',
                enabled: document.getElementById('enabled').checked,
                provider: document.getElementById('provider').value,
                model: document.getElementById('model').value,
                baseUrl: document.getElementById('baseUrl').value,
                endpoint: document.getElementById('endpoint').value,
                temperature: parseFloat(document.getElementById('temperature').value),
                maxTokens: parseInt(document.getElementById('maxTokens').value),
                systemPrompt: document.getElementById('systemPrompt').value
            };

            vscode.postMessage(config);
        });

        // Handle test connection button click
        document.getElementById('testButton').addEventListener('click', () => {
            const statusElement = document.getElementById('status');
            statusElement.textContent = 'Testing connection...';
            statusElement.className = 'status';

            vscode.postMessage({
                command: 'testConnection',
                baseUrl: document.getElementById('baseUrl').value
            });
        });

        // Handle refresh models button click
        document.getElementById('refreshModelsButton').addEventListener('click', () => {
            fetchModels();
        });

        // Fetch models from the provider
        function fetchModels() {
            const provider = document.getElementById('provider').value;
            const baseUrl = document.getElementById('baseUrl').value;
            const modelSelect = document.getElementById('model');
            const modelLoading = document.getElementById('modelLoading');

            // Show loading indicator
            modelLoading.classList.remove('hidden');

            // Save current selection
            const currentModel = modelSelect.value;

            vscode.postMessage({
                command: 'listModels',
                provider: provider,
                baseUrl: baseUrl
            });
        }

        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'connectionResult':
                    const statusElement = document.getElementById('status');
                    statusElement.className = 'status ' + (message.success ? 'success' : 'error');
                    statusElement.textContent = message.success
                        ? 'Successfully connected to ' + document.getElementById('provider').value
                        : 'Failed to connect: ' + message.error;
                    break;

                case 'modelsList':
                    const modelSelect = document.getElementById('model');
                    const modelLoading = document.getElementById('modelLoading');

                    // Hide loading indicator
                    modelLoading.classList.add('hidden');

                    // Save current selection
                    const currentModel = modelSelect.value;

                    // Clear current options
                    modelSelect.innerHTML = '';

                    if (message.models && message.models.length > 0) {
                        // Add models to select
                        message.models.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model;
                            option.textContent = model;
                            modelSelect.appendChild(option);
                        });

                        // Try to restore previous selection
                        if (currentModel) {
                            for (let i = 0; i < modelSelect.options.length; i++) {
                                if (modelSelect.options[i].value === currentModel) {
                                    modelSelect.selectedIndex = i;
                                    break;
                                }
                            }
                        }

                        // Show success message
                        const statusElement = document.getElementById('status');
                        statusElement.className = 'status success';
                        statusElement.textContent = 'Successfully loaded ' + message.models.length + ' models';
                    } else {
                        // Add default option
                        const option = document.createElement('option');
                        option.value = 'qwen3-coder';
                        option.textContent = 'qwen3-coder (default)';
                        modelSelect.appendChild(option);

                        // Show error message
                        const statusElement = document.getElementById('status');
                        statusElement.className = 'status error';
                        statusElement.textContent = message.error || 'No models found. Make sure Ollama is running and you have models installed.';
                    }
                    break;
            }
        });

        // Update endpoint when provider or base URL changes
        document.getElementById('provider').addEventListener('change', (e) => {
            updateEndpoint();
            fetchModels();
        });

        document.getElementById('baseUrl').addEventListener('input', (e) => {
            updateEndpoint();
        });

        function updateEndpoint() {
            const provider = document.getElementById('provider').value;
            const baseUrl = document.getElementById('baseUrl').value;

            if (baseUrl) {
                if (provider === 'ollama') {
                    document.getElementById('endpoint').value = baseUrl + '/v1/chat/completions';
                }
                // Add more provider-specific endpoints here
            }
        }
    </script>
</body>
</html>`;
  }
}
