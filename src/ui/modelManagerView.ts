/**
 * Model Manager View
 *
 * This module provides a UI for managing LLM models in the Adamize extension.
 * It allows users to discover, download, and manage models.
 *
 * @module modelManagerView
 * @requires vscode
 * @requires modelManager
 *
 * @implements REQ-OLLAMA-013 Add model management features (pulling, removing models)
 * @implements REQ-MODEL-002 Add status indicator to show operation status
 * @implements REQ-MODEL-003 Add model info panel with detailed information
 */

import * as vscode from 'vscode';
import { ModelManager } from '../utils/modelManager';

/**
 * Model Manager View Provider
 */
/**
 * Status of model operations
 *
 * @enum {string}
 * @implements REQ-MODEL-002 Add status indicator to show operation status
 */
export enum ModelOperationStatus {
  /** Operation is idle */
  IDLE = 'idle',
  /** Operation is in progress */
  IN_PROGRESS = 'in-progress',
  /** Operation succeeded */
  SUCCESS = 'success',
  /** Operation failed */
  ERROR = 'error',
}

/**
 * Model Manager View Provider
 *
 * @implements REQ-MODEL-002 Add status indicator to show operation status
 */
export class ModelManagerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'adamize.modelManagerView';
  private _view?: vscode.WebviewView;
  private _modelManager: ModelManager;
  private _extensionUri: vscode.Uri;
  private _outputChannel: vscode.OutputChannel;

  /** Status of the refresh operation */
  private _refreshStatus: ModelOperationStatus = ModelOperationStatus.IDLE;
  /** Status of the pull operation */
  private _pullStatus: ModelOperationStatus = ModelOperationStatus.IDLE;
  /** Status of the remove operation */
  private _removeStatus: ModelOperationStatus = ModelOperationStatus.IDLE;
  /** Current operation message */
  private _statusMessage: string = '';

  /**
   * Create a new Model Manager View Provider
   * @param extensionUri Extension URI
   * @param modelManager Model manager
   * @param outputChannel Output channel
   */
  constructor(
    extensionUri: vscode.Uri,
    modelManager: ModelManager,
    outputChannel: vscode.OutputChannel
  ) {
    this._extensionUri = extensionUri;
    this._modelManager = modelManager;
    this._outputChannel = outputChannel;
  }

  /**
   * Resolve the webview view
   * @param webviewView Webview view
   * @param context Webview view context
   * @param token Cancellation token
   */
  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): Promise<void> {
    this._view = webviewView;

    // Set webview options
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // Set webview HTML
    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'refresh':
            await this._refreshModels();
            break;
          case 'pull':
            await this._pullModel(message.modelName);
            break;
          case 'remove':
            await this._removeModel(message.modelName);
            break;
          case 'getModelDetails':
            await this._getModelDetails(message.modelId);
            break;
        }
      },
      undefined,
      context.subscriptions
    );

    // Initial refresh
    await this._refreshModels();
  }

  /**
   * Update status in the webview
   *
   * @private
   * @implements REQ-MODEL-002 Add status indicator to show operation status
   */
  private _updateStatus(): void {
    if (!this._view) {
      return;
    }

    this._view.webview.postMessage({
      command: 'updateStatus',
      refreshStatus: this._refreshStatus,
      pullStatus: this._pullStatus,
      removeStatus: this._removeStatus,
      statusMessage: this._statusMessage,
    });
  }

  /**
   * Refresh the model list
   *
   * @implements REQ-MODEL-002 Add status indicator to show operation status
   */
  private async _refreshModels(): Promise<void> {
    if (!this._view) {
      return;
    }

    // Update status to in progress
    this._refreshStatus = ModelOperationStatus.IN_PROGRESS;
    this._statusMessage = 'Refreshing models...';
    this._updateStatus();

    try {
      const models = await this._modelManager.listModels();

      // Update status to success
      this._refreshStatus = ModelOperationStatus.SUCCESS;
      this._statusMessage = `Found ${models.length} models`;
      this._updateStatus();

      // Update model list
      this._view.webview.postMessage({
        command: 'updateModels',
        models,
      });

      // Reset status after a delay
      setTimeout(() => {
        this._refreshStatus = ModelOperationStatus.IDLE;
        this._statusMessage = '';
        this._updateStatus();
      }, 3000);
    } catch (error) {
      this._outputChannel.appendLine(`Error refreshing models: ${error}`);
      vscode.window.showErrorMessage(`Error refreshing models: ${error}`);

      // Update status to error
      this._refreshStatus = ModelOperationStatus.ERROR;
      this._statusMessage = `Error: ${error}`;
      this._updateStatus();

      // Reset status after a delay
      setTimeout(() => {
        this._refreshStatus = ModelOperationStatus.IDLE;
        this._statusMessage = '';
        this._updateStatus();
      }, 5000);
    }
  }

  /**
   * Pull a model
   * @param modelName Model name
   * @implements REQ-MODEL-002 Add status indicator to show operation status
   */
  private async _pullModel(modelName: string): Promise<void> {
    if (!modelName) {
      // Prompt user for model name
      const inputModelName = await vscode.window.showInputBox({
        prompt: 'Enter the name of the model to pull',
        placeHolder: 'e.g., llama3',
      });

      if (!inputModelName) {
        return;
      }

      modelName = inputModelName;
    }

    // Update status to in progress
    this._pullStatus = ModelOperationStatus.IN_PROGRESS;
    this._statusMessage = `Pulling model: ${modelName}...`;
    this._updateStatus();

    try {
      await this._modelManager.pullOllamaModel(modelName);

      // Update status to success
      this._pullStatus = ModelOperationStatus.SUCCESS;
      this._statusMessage = `Successfully pulled model: ${modelName}`;
      this._updateStatus();

      // Refresh model list
      await this._refreshModels();
      vscode.window.showInformationMessage(`Successfully pulled model: ${modelName}`);

      // Reset status after a delay
      setTimeout(() => {
        this._pullStatus = ModelOperationStatus.IDLE;
        this._statusMessage = '';
        this._updateStatus();
      }, 3000);
    } catch (error) {
      this._outputChannel.appendLine(`Error pulling model: ${error}`);

      // Don't show error message here as it's already shown by the ModelManager

      // Update status to error
      this._pullStatus = ModelOperationStatus.ERROR;
      this._statusMessage = `Error pulling model: ${error}`;
      this._updateStatus();

      // Reset status after a delay
      setTimeout(() => {
        this._pullStatus = ModelOperationStatus.IDLE;
        this._statusMessage = '';
        this._updateStatus();
      }, 5000);
    }
  }

  /**
   * Remove a model
   * @param modelName Model name
   * @implements REQ-MODEL-002 Add status indicator to show operation status
   */
  private async _removeModel(modelName: string): Promise<void> {
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

    // Update status to in progress
    this._removeStatus = ModelOperationStatus.IN_PROGRESS;
    this._statusMessage = `Removing model: ${modelName}...`;
    this._updateStatus();

    try {
      await this._modelManager.removeOllamaModel(modelName);

      // Update status to success
      this._removeStatus = ModelOperationStatus.SUCCESS;
      this._statusMessage = `Successfully removed model: ${modelName}`;
      this._updateStatus();

      // Refresh model list
      await this._refreshModels();
      vscode.window.showInformationMessage(`Successfully removed model: ${modelName}`);

      // Reset status after a delay
      setTimeout(() => {
        this._removeStatus = ModelOperationStatus.IDLE;
        this._statusMessage = '';
        this._updateStatus();
      }, 3000);
    } catch (error) {
      this._outputChannel.appendLine(`Error removing model: ${error}`);

      // Don't show error message here as it's already shown by the ModelManager

      // Update status to error
      this._removeStatus = ModelOperationStatus.ERROR;
      this._statusMessage = `Error removing model: ${error}`;
      this._updateStatus();

      // Reset status after a delay
      setTimeout(() => {
        this._removeStatus = ModelOperationStatus.IDLE;
        this._statusMessage = '';
        this._updateStatus();
      }, 5000);
    }
  }

  /**
   * Get model details
   * @param modelId Model ID
   * @implements REQ-MODEL-003 Add model info panel with detailed information
   */
  private async _getModelDetails(modelId: string): Promise<void> {
    if (!this._view) {
      return;
    }

    try {
      // Update status
      this._statusMessage = 'Loading model details...';
      this._updateStatus();

      const model = await this._modelManager.getModel(modelId);
      if (model) {
        // For Ollama models, try to get additional details
        if (model.provider === 'ollama') {
          try {
            // Get additional model details from Ollama if available
            const ollamaEndpoint = this._modelManager.getOllamaEndpoint();
            const response = await fetch(`${ollamaEndpoint}/api/show`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: model.name,
              }),
            });

            if (response.ok) {
              const data = await response.json();

              // Merge additional details into the model object
              if (data) {
                model.details = {
                  ...model.details,
                  ...data,
                  // Extract specific fields for better display
                  modelFormat: data.modelFormat || data.model_format || 'Unknown',
                  parameterSize: data.parameter_size || data.parameters || 'Unknown',
                  quantizationLevel: data.quantization_level || 'Unknown',
                  license: data.license || 'Unknown',
                  description: data.description || 'No description available',
                  system: data.system || 'No system prompt defined',
                  template: data.template || 'No template defined',
                };
              }
            }
          } catch (error) {
            this._outputChannel.appendLine(`Error getting additional model details: ${error}`);
            // Continue with basic model details
          }
        }

        // Send model details to webview
        this._view.webview.postMessage({
          command: 'showModelDetails',
          model,
        });

        // Reset status
        this._statusMessage = '';
        this._updateStatus();
      }
    } catch (error) {
      this._outputChannel.appendLine(`Error getting model details: ${error}`);
      vscode.window.showErrorMessage(`Error getting model details: ${error}`);

      // Update status
      this._statusMessage = `Error getting model details: ${error}`;
      this._updateStatus();

      // Reset status after a delay
      setTimeout(() => {
        this._statusMessage = '';
        this._updateStatus();
      }, 5000);
    }
  }

  /**
   * Get HTML for webview
   * @param webview Webview
   * @returns HTML for webview
   */
  private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Model Manager</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 10px;
            color: var(--vscode-foreground);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .header h2 {
            margin: 0;
          }
          .actions {
            display: flex;
            gap: 5px;
          }
          .status-bar {
            margin-top: 10px;
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 3px;
            font-size: 0.9em;
            display: flex;
            align-items: center;
          }
          .status-bar.idle {
            display: none;
          }
          .status-bar.in-progress {
            background-color: var(--vscode-progressBar-background);
            color: var(--vscode-foreground);
          }
          .status-bar.success {
            background-color: var(--vscode-terminal-ansiGreen);
            color: var(--vscode-foreground);
          }
          .status-bar.error {
            background-color: var(--vscode-errorForeground);
            color: var(--vscode-foreground);
          }
          .status-icon {
            margin-right: 8px;
          }
          .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: var(--vscode-foreground);
            animation: spin 1s ease-in-out infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .model-list {
            margin-top: 10px;
          }
          .model-item {
            padding: 8px;
            margin-bottom: 5px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
            cursor: pointer;
          }
          .model-item:hover {
            background-color: var(--vscode-list-hoverBackground);
          }
          .model-item .name {
            font-weight: bold;
          }
          .model-item .provider {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
          }
          .model-item .size {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
          }
          .model-actions {
            display: flex;
            justify-content: flex-end;
            gap: 5px;
            margin-top: 5px;
          }
          button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            border-radius: 2px;
            cursor: pointer;
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .loading {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
          }
          .empty {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
          }
          .details {
            margin-top: 10px;
            padding: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
            display: none;
            max-height: 500px;
            overflow-y: auto;
          }
          .details h3 {
            margin-top: 0;
            margin-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 5px;
          }
          .details h4 {
            margin-top: 15px;
            margin-bottom: 5px;
            color: var(--vscode-editor-foreground);
          }
          .details-grid {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 5px 10px;
            margin-bottom: 10px;
          }
          .details-grid .label {
            font-weight: bold;
            color: var(--vscode-editor-foreground);
          }
          .details-grid .value {
            color: var(--vscode-descriptionForeground);
          }
          .details-section {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid var(--vscode-panel-border);
          }
          .details-section h4 {
            margin-top: 0;
          }
          .details-section pre {
            background-color: var(--vscode-editor-background);
            padding: 8px;
            border-radius: 3px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            margin: 5px 0;
          }
          .details-close {
            position: absolute;
            top: 10px;
            right: 10px;
            cursor: pointer;
            color: var(--vscode-descriptionForeground);
          }
          .details-close:hover {
            color: var(--vscode-foreground);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Model Manager</h2>
          <div class="actions">
            <button id="refresh-button">Refresh</button>
            <button id="pull-button">Pull Model</button>
          </div>
        </div>

        <div id="status-bar" class="status-bar idle">
          <div class="status-icon">
            <div class="spinner"></div>
          </div>
          <div id="status-message">Ready</div>
        </div>

        <div id="loading" class="loading">Loading models...</div>
        <div id="empty" class="empty" style="display: none;">No models found</div>
        <div id="model-list" class="model-list"></div>
        <div id="model-details" class="details"></div>

        <script>
          const vscode = acquireVsCodeApi();

          // Handle messages from the extension
          window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
              case 'updateModels':
                updateModelList(message.models);
                break;
              case 'showModelDetails':
                showModelDetails(message.model);
                break;
              case 'updateStatus':
                updateStatus(
                  message.refreshStatus,
                  message.pullStatus,
                  message.removeStatus,
                  message.statusMessage
                );
                break;
            }
          });

          // Update status bar
          function updateStatus(refreshStatus, pullStatus, removeStatus, statusMessage) {
            const statusBar = document.getElementById('status-bar');
            const statusMessageElement = document.getElementById('status-message');

            // Determine the overall status (priority: error > in-progress > success > idle)
            let overallStatus = 'idle';
            if (refreshStatus === 'error' || pullStatus === 'error' || removeStatus === 'error') {
              overallStatus = 'error';
            } else if (refreshStatus === 'in-progress' || pullStatus === 'in-progress' || removeStatus === 'in-progress') {
              overallStatus = 'in-progress';
            } else if (refreshStatus === 'success' || pullStatus === 'success' || removeStatus === 'success') {
              overallStatus = 'success';
            }

            // Update status bar class
            statusBar.className = 'status-bar ' + overallStatus;

            // Update status message
            statusMessageElement.textContent = statusMessage || 'Ready';

            // Update spinner visibility
            const spinner = statusBar.querySelector('.spinner');
            if (overallStatus === 'in-progress') {
              spinner.style.display = 'inline-block';
            } else {
              spinner.style.display = 'none';
            }
          }

          // Refresh button
          document.getElementById('refresh-button').addEventListener('click', () => {
            vscode.postMessage({ command: 'refresh' });
          });

          // Pull button
          document.getElementById('pull-button').addEventListener('click', () => {
            vscode.postMessage({ command: 'pull' });
          });

          // Update model list
          function updateModelList(models) {
            const loadingElement = document.getElementById('loading');
            const emptyElement = document.getElementById('empty');
            const modelListElement = document.getElementById('model-list');

            loadingElement.style.display = 'none';

            if (!models || models.length === 0) {
              emptyElement.style.display = 'block';
              modelListElement.innerHTML = '';
              return;
            }

            emptyElement.style.display = 'none';
            modelListElement.innerHTML = '';

            // Group models by provider
            const modelsByProvider = {};
            models.forEach(model => {
              if (!modelsByProvider[model.provider]) {
                modelsByProvider[model.provider] = [];
              }
              modelsByProvider[model.provider].push(model);
            });

            // Create model items
            for (const provider in modelsByProvider) {
              const providerModels = modelsByProvider[provider];

              // Add provider header
              const providerHeader = document.createElement('h3');
              providerHeader.textContent = provider.charAt(0).toUpperCase() + provider.slice(1) + ' Models';
              modelListElement.appendChild(providerHeader);

              // Add models
              providerModels.forEach(model => {
                const modelItem = document.createElement('div');
                modelItem.className = 'model-item';
                modelItem.dataset.id = model.id;

                const nameElement = document.createElement('div');
                nameElement.className = 'name';
                nameElement.textContent = model.name;
                modelItem.appendChild(nameElement);

                const versionElement = document.createElement('div');
                versionElement.className = 'version';
                versionElement.textContent = 'Version: ' + model.version;
                modelItem.appendChild(versionElement);

                const sizeElement = document.createElement('div');
                sizeElement.className = 'size';
                sizeElement.textContent = 'Size: ' + formatSize(model.size);
                modelItem.appendChild(sizeElement);

                const actionsElement = document.createElement('div');
                actionsElement.className = 'model-actions';

                if (model.provider === 'ollama') {
                  const removeButton = document.createElement('button');
                  removeButton.textContent = 'Remove';
                  removeButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    vscode.postMessage({
                      command: 'remove',
                      modelName: model.name
                    });
                  });
                  actionsElement.appendChild(removeButton);
                }

                modelItem.appendChild(actionsElement);

                // Show details on click
                modelItem.addEventListener('click', () => {
                  vscode.postMessage({
                    command: 'getModelDetails',
                    modelId: model.id
                  });
                });

                modelListElement.appendChild(modelItem);
              });
            }
          }

          // Show model details
          function showModelDetails(model) {
            const detailsElement = document.getElementById('model-details');
            detailsElement.style.display = 'block';

            // Create close button
            let detailsHtml = '<div class="details-close" onclick="document.getElementById(\'model-details\').style.display=\'none\'">✕</div>';

            // Add model header
            detailsHtml += '<h3>Model Details: ' + model.name + '</h3>';

            // Basic info grid
            detailsHtml += '<div class="details-grid">';
            detailsHtml += '<div class="label">ID:</div><div class="value">' + model.id + '</div>';
            detailsHtml += '<div class="label">Version:</div><div class="value">' + model.version + '</div>';
            detailsHtml += '<div class="label">Size:</div><div class="value">' + formatSize(model.size) + '</div>';
            detailsHtml += '<div class="label">Provider:</div><div class="value">' + model.provider + '</div>';
            detailsHtml += '<div class="label">Capabilities:</div><div class="value">' + (model.capabilities || []).join(', ') + '</div>';

            // Add additional details for Ollama models
            if (model.provider === 'ollama' && model.details) {
              const details = model.details;

              // Add model format and parameters if available
              if (details.modelFormat) {
                detailsHtml += '<div class="label">Model Format:</div><div class="value">' + details.modelFormat + '</div>';
              }
              if (details.parameterSize) {
                detailsHtml += '<div class="label">Parameters:</div><div class="value">' + details.parameterSize + '</div>';
              }
              if (details.quantizationLevel) {
                detailsHtml += '<div class="label">Quantization:</div><div class="value">' + details.quantizationLevel + '</div>';
              }
              if (details.license) {
                detailsHtml += '<div class="label">License:</div><div class="value">' + details.license + '</div>';
              }
            }

            detailsHtml += '</div>'; // Close details-grid

            // Add description section if available
            if (model.details && model.details.description) {
              detailsHtml += '<div class="details-section">';
              detailsHtml += '<h4>Description</h4>';
              detailsHtml += '<div>' + model.details.description + '</div>';
              detailsHtml += '</div>';
            }

            // Add system prompt section if available
            if (model.details && model.details.system) {
              detailsHtml += '<div class="details-section">';
              detailsHtml += '<h4>System Prompt</h4>';
              detailsHtml += '<pre>' + model.details.system + '</pre>';
              detailsHtml += '</div>';
            }

            // Add template section if available
            if (model.details && model.details.template) {
              detailsHtml += '<div class="details-section">';
              detailsHtml += '<h4>Template</h4>';
              detailsHtml += '<pre>' + model.details.template + '</pre>';
              detailsHtml += '</div>';
            }

            // Add raw details section (collapsed by default)
            if (model.details) {
              detailsHtml += '<div class="details-section">';
              detailsHtml += '<h4>Raw Details</h4>';
              detailsHtml += '<details>';
              detailsHtml += '<summary>Show Raw Details</summary>';
              detailsHtml += '<pre>' + JSON.stringify(model.details, null, 2) + '</pre>';
              detailsHtml += '</details>';
              detailsHtml += '</div>';
            }

            detailsElement.innerHTML = detailsHtml;

            // Scroll to details
            detailsElement.scrollIntoView({ behavior: 'smooth' });
          }

          // Format size
          function formatSize(size) {
            if (!size) return 'Unknown';

            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let formattedSize = size;
            let unitIndex = 0;

            while (formattedSize >= 1024 && unitIndex < units.length - 1) {
              formattedSize /= 1024;
              unitIndex++;
            }

            return formattedSize.toFixed(2) + ' ' + units[unitIndex];
          }

          // Initial refresh
          vscode.postMessage({ command: 'refresh' });
        </script>
      </body>
      </html>
    `;
  }
}
