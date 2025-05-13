/**
 * Model Tool Registration
 * 
 * This module registers the Model Management Tool with the MCP Bridge.
 * 
 * @module mcp/tools/modelToolRegistration
 * @requires vscode
 * @requires modelManagementTool
 * @requires mcpBridgeManager
 * 
 * @implements REQ-MODEL-030 Create a dedicated ModelManagementTool class
 */

import * as vscode from 'vscode';
import { ModelManagementTool } from './modelManagementTool';
import ModelManager from '../../utils/modelManager';
import { MCPBridgeManager } from '../mcpBridgeManager';

/**
 * Register model management tools
 * 
 * @param context Extension context
 * @param bridgeManager MCP Bridge manager
 * @param modelManager Model manager
 * @param outputChannel Output channel
 * @returns Disposable
 * @implements REQ-MODEL-030 Create a dedicated ModelManagementTool class
 */
export function registerModelTools(
  context: vscode.ExtensionContext,
  bridgeManager: MCPBridgeManager,
  modelManager: ModelManager,
  outputChannel: vscode.OutputChannel
): vscode.Disposable {
  // Create disposable collection
  const disposables: vscode.Disposable[] = [];
  
  try {
    outputChannel.appendLine('Registering model management tools...');
    
    // Create model management tool
    const modelManagementTool = new ModelManagementTool(modelManager, outputChannel);
    
    // Register with all bridges
    const bridges = bridgeManager.getBridges();
    for (const bridgeId of bridges) {
      bridgeManager.registerTool(bridgeId, modelManagementTool);
      outputChannel.appendLine(`Registered model management tool with bridge: ${bridgeId}`);
    }
    
    // Register command to manually register the tool with a specific bridge
    const registerCommand = vscode.commands.registerCommand(
      'adamize.registerModelTool',
      async () => {
        // Get bridge ID
        const bridgeId = await vscode.window.showQuickPick(
          bridges,
          {
            placeHolder: 'Select MCP Bridge',
            title: 'Register Model Management Tool'
          }
        );
        
        if (bridgeId) {
          bridgeManager.registerTool(bridgeId, modelManagementTool);
          vscode.window.showInformationMessage(
            `Registered model management tool with bridge: ${bridgeId}`
          );
        }
      }
    );
    
    disposables.push(registerCommand);
    context.subscriptions.push(registerCommand);
    
    outputChannel.appendLine('Model management tools registered successfully');
    
    return {
      dispose: () => {
        disposables.forEach(d => d.dispose());
      }
    };
  } catch (error) {
    outputChannel.appendLine(`Error registering model management tools: ${error}`);
    
    return {
      dispose: () => {
        disposables.forEach(d => d.dispose());
      }
    };
  }
}

export default registerModelTools;
