// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.info('Activating Adamize extension');

  // Register commands
  const showWelcomeCommand = vscode.commands.registerCommand('adamize.showWelcome', () => {
    vscode.window.showInformationMessage('Welcome to Adamize!');
  });

  const connectMCPCommand = vscode.commands.registerCommand('adamize.connectMCP', () => {
    vscode.window.showInformationMessage('Connecting to MCP server...');
    // TODO: Implement MCP connection
  });

  const listMCPToolsCommand = vscode.commands.registerCommand('adamize.listMCPTools', () => {
    vscode.window.showInformationMessage('Listing MCP tools...');
    // TODO: Implement MCP tools listing
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

  // Add commands to subscriptions
  context.subscriptions.push(showWelcomeCommand);
  context.subscriptions.push(connectMCPCommand);
  context.subscriptions.push(listMCPToolsCommand);
  context.subscriptions.push(runTestsCommand);
  context.subscriptions.push(runTestsWithCoverageCommand);

  // Show welcome message on first activation
  showWelcomeMessage(context);
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.info('Deactivating Adamize extension');
}

/**
 * Show welcome message on first activation
 * @param context Extension context
 */
function showWelcomeMessage(context: vscode.ExtensionContext) {
  const hasShownWelcome = context.globalState.get('adamize.hasShownWelcome');
  if (!hasShownWelcome) {
    vscode.window.showInformationMessage('Welcome to Adamize! Get started by connecting to an MCP server.');
    context.globalState.update('adamize.hasShownWelcome', true);
  }
}
