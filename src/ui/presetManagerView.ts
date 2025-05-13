/**
 * Preset Manager View
 *
 * This module provides a UI for managing model configuration presets.
 * It allows users to create, edit, delete, import, and export presets.
 *
 * @module ui/presetManagerView
 * @requires vscode
 * @requires presetManager
 *
 * @implements REQ-MODEL-040 Create a ModelConfigurationPreset interface with fields for model name, parameters, and metadata
 */

import * as vscode from 'vscode';
import { ModelManager } from '../utils/modelManager.new';
import PresetManager, { IModelConfigurationPreset } from '../utils/presetManager';

/**
 * Preset Manager View Provider
 *
 * @class PresetManagerViewProvider
 * @implements {vscode.WebviewViewProvider}
 * @implements REQ-MODEL-040 Create a ModelConfigurationPreset interface with fields for model name, parameters, and metadata
 */
export class PresetManagerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'adamize.presetManagerView';
  private _view?: vscode.WebviewView;
  private _presetManager: PresetManager;
  private _modelManager: ModelManager;
  private _extensionUri: vscode.Uri;
  private _outputChannel: vscode.OutputChannel;

  /**
   * Create a new Preset Manager View Provider
   * @param extensionUri Extension URI
   * @param presetManager Preset manager
   * @param modelManager Model manager
   * @param outputChannel Output channel
   */
  constructor(
    extensionUri: vscode.Uri,
    presetManager: PresetManager,
    modelManager: ModelManager,
    outputChannel: vscode.OutputChannel
  ) {
    this._extensionUri = extensionUri;
    this._presetManager = presetManager;
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
            await this._refreshPresets();
            break;
          case 'createPreset':
            await this._createPreset(message.preset);
            break;
          case 'updatePreset':
            await this._updatePreset(message.presetId, message.preset);
            break;
          case 'deletePreset':
            await this._deletePreset(message.presetId);
            break;
          case 'exportPresets':
            await this._exportPresets();
            break;
          case 'importPresets':
            await this._importPresets();
            break;
          case 'applyPreset':
            await this._applyPreset(message.presetId);
            break;
          case 'getModels':
            await this._getModels();
            break;
        }
      },
      undefined,
      context.subscriptions
    );

    // Initial refresh
    await this._refreshPresets();
  }

  /**
   * Refresh the preset list
   */
  private async _refreshPresets(): Promise<void> {
    if (!this._view) {
      return;
    }

    try {
      const presets = this._presetManager.getPresets();

      // Update preset list
      this._view.webview.postMessage({
        command: 'updatePresets',
        presets,
      });
    } catch (error) {
      this._outputChannel.appendLine(`Error refreshing presets: ${error}`);
      vscode.window.showErrorMessage(
        `Error refreshing presets: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create a new preset
   * @param preset Preset to create
   */
  private async _createPreset(preset: IModelConfigurationPreset): Promise<void> {
    try {
      // Add creation metadata
      preset.metadata.createdAt = new Date().toISOString();
      preset.metadata.modifiedAt = new Date().toISOString();

      // Create preset
      const success = await this._presetManager.createPreset(preset);

      if (success) {
        vscode.window.showInformationMessage(`Created preset: ${preset.name}`);
        await this._refreshPresets();
      } else {
        vscode.window.showErrorMessage(`Failed to create preset: ${preset.name}`);
      }
    } catch (error) {
      this._outputChannel.appendLine(`Error creating preset: ${error}`);
      vscode.window.showErrorMessage(
        `Error creating preset: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update a preset
   * @param presetId Preset ID
   * @param preset Updated preset
   */
  private async _updatePreset(presetId: string, preset: IModelConfigurationPreset): Promise<void> {
    try {
      // Update modification metadata
      preset.metadata.modifiedAt = new Date().toISOString();

      // Update preset
      const success = await this._presetManager.updatePreset(presetId, preset);

      if (success) {
        vscode.window.showInformationMessage(`Updated preset: ${preset.name}`);
        await this._refreshPresets();
      } else {
        vscode.window.showErrorMessage(`Failed to update preset: ${preset.name}`);
      }
    } catch (error) {
      this._outputChannel.appendLine(`Error updating preset: ${error}`);
      vscode.window.showErrorMessage(
        `Error updating preset: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete a preset
   * @param presetId Preset ID
   */
  private async _deletePreset(presetId: string): Promise<void> {
    try {
      // Get preset name
      const preset = this._presetManager.getPreset(presetId);

      if (!preset) {
        vscode.window.showErrorMessage(`Preset not found: ${presetId}`);
        return;
      }

      // Confirm deletion
      const confirmed = await vscode.window.showWarningMessage(
        `Are you sure you want to delete preset "${preset.name}"?`,
        { modal: true },
        'Delete'
      );

      if (confirmed !== 'Delete') {
        return;
      }

      // Delete preset
      const success = await this._presetManager.deletePreset(presetId);

      if (success) {
        vscode.window.showInformationMessage(`Deleted preset: ${preset.name}`);
        await this._refreshPresets();
      } else {
        vscode.window.showErrorMessage(`Failed to delete preset: ${preset.name}`);
      }
    } catch (error) {
      this._outputChannel.appendLine(`Error deleting preset: ${error}`);
      vscode.window.showErrorMessage(
        `Error deleting preset: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Export presets to a file
   */
  private async _exportPresets(): Promise<void> {
    try {
      // Show save dialog
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('adamize-presets.json'),
        filters: {
          'JSON Files': ['json'],
          'All Files': ['*'],
        },
        title: 'Export Presets',
      });

      if (!uri) {
        return;
      }

      // Export presets
      const success = await this._presetManager.exportPresets(uri.fsPath);

      if (success) {
        vscode.window.showInformationMessage(`Exported presets to ${uri.fsPath}`);
      } else {
        vscode.window.showErrorMessage(`Failed to export presets to ${uri.fsPath}`);
      }
    } catch (error) {
      this._outputChannel.appendLine(`Error exporting presets: ${error}`);
      vscode.window.showErrorMessage(
        `Error exporting presets: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Import presets from a file
   */
  private async _importPresets(): Promise<void> {
    try {
      // Show open dialog
      const uri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'JSON Files': ['json'],
          'All Files': ['*'],
        },
        title: 'Import Presets',
      });

      if (!uri || uri.length === 0) {
        return;
      }

      // Import presets
      const count = await this._presetManager.importPresets(uri[0].fsPath);

      if (count > 0) {
        vscode.window.showInformationMessage(`Imported ${count} presets from ${uri[0].fsPath}`);
        await this._refreshPresets();
      } else {
        vscode.window.showErrorMessage(`Failed to import presets from ${uri[0].fsPath}`);
      }
    } catch (error) {
      this._outputChannel.appendLine(`Error importing presets: ${error}`);
      vscode.window.showErrorMessage(
        `Error importing presets: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Apply a preset
   * @param presetId Preset ID
   */
  private async _applyPreset(presetId: string): Promise<void> {
    try {
      // Get preset
      const preset = this._presetManager.getPreset(presetId);

      if (!preset) {
        vscode.window.showErrorMessage(`Preset not found: ${presetId}`);
        return;
      }

      // Apply preset to configuration
      const config = vscode.workspace.getConfiguration('adamize.ollama');
      await config.update('model', preset.modelName, vscode.ConfigurationTarget.Global);
      await config.update(
        'temperature',
        preset.parameters.temperature,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        'maxTokens',
        preset.parameters.maxTokens,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        'systemPrompt',
        preset.parameters.systemPrompt,
        vscode.ConfigurationTarget.Global
      );

      vscode.window.showInformationMessage(`Applied preset: ${preset.name}`);
    } catch (error) {
      this._outputChannel.appendLine(`Error applying preset: ${error}`);
      vscode.window.showErrorMessage(
        `Error applying preset: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get available models
   */
  private async _getModels(): Promise<void> {
    if (!this._view) {
      return;
    }

    try {
      const models = await this._modelManager.listModels();

      // Update model list
      this._view.webview.postMessage({
        command: 'updateModels',
        models,
      });
    } catch (error) {
      this._outputChannel.appendLine(`Error getting models: ${error}`);
    }
  }

  /**
   * Get HTML for the webview
   * @param webview Webview
   * @returns HTML for the webview
   */
  private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
    // Get the local path to main script and CSS
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'presetManager.js')
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'presetManager.css')
    );

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
      <link href="${styleUri}" rel="stylesheet">
      <title>Model Presets</title>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Model Presets</h2>
          <div class="actions">
            <button id="refreshButton" title="Refresh Presets">
              <span class="codicon codicon-refresh"></span>
            </button>
            <button id="createButton" title="Create Preset">
              <span class="codicon codicon-add"></span>
            </button>
            <button id="importButton" title="Import Presets">
              <span class="codicon codicon-cloud-download"></span>
            </button>
            <button id="exportButton" title="Export Presets">
              <span class="codicon codicon-cloud-upload"></span>
            </button>
          </div>
        </div>

        <div id="loading" class="loading">
          <span class="codicon codicon-loading"></span> Loading presets...
        </div>

        <div id="empty" class="empty" style="display: none;">
          <p>No presets found.</p>
          <button id="createEmptyButton">Create Preset</button>
        </div>

        <div id="preset-list" class="preset-list"></div>
      </div>

      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}

/**
 * Get a nonce (random string)
 * @returns Random string
 */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export default PresetManagerViewProvider;
