/**
 * Test Generation Commands for VS Code integration
 *
 * This file contains the implementation of VS Code commands for test generation.
 *
 * @module testGenerationCommands
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import { OutputChannel } from 'vscode';

/**
 * Output channel for test generation
 */
let testGenOutputChannel: OutputChannel;

/**
 * Initialize the test generation commands
 *
 * @param context VS Code extension context
 */
export function initializeTestGenerationCommands(context: vscode.ExtensionContext): void {
  // Create output channel
  testGenOutputChannel = vscode.window.createOutputChannel('Test Generation');
  context.subscriptions.push(testGenOutputChannel);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('adamize.generateTests', generateTestsCommand),
    vscode.commands.registerCommand('adamize.generateTestsForCurrentFile', generateTestsForCurrentFileCommand),
    vscode.commands.registerCommand('adamize.generateCoverageTests', generateCoverageTestsCommand),
    vscode.commands.registerCommand('adamize.generateAITests', generateAITestsCommand),
    vscode.commands.registerCommand('adamize.generateAITestsForCurrentFile', generateAITestsForCurrentFileCommand),
    vscode.commands.registerTextEditorCommand('adamize.generateTestForSelection', generateTestForSelectionCommand)
  );
}

/**
 * Generate tests command handler
 */
async function generateTestsCommand(): Promise<void> {
  // Show quick pick to select file
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace folder is open');
    return;
  }

  // Get all TypeScript files in the src directory
  const srcPath = path.join(workspaceFolders[0].uri.fsPath, 'src');
  const files = await findTypeScriptFiles(srcPath);

  // Show quick pick
  const selectedFile = await vscode.window.showQuickPick(
    files.map(file => ({
      label: path.relative(srcPath, file),
      description: file,
    })),
    {
      placeHolder: 'Select a file to generate tests for',
    }
  );

  if (!selectedFile) {
    return;
  }

  // Generate tests
  await generateTests(selectedFile.description);
}

/**
 * Generate tests for current file command handler
 */
async function generateTestsForCurrentFileCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const filePath = editor.document.uri.fsPath;
  if (!filePath.endsWith('.ts') || filePath.endsWith('.test.ts')) {
    vscode.window.showErrorMessage('Current file is not a TypeScript source file');
    return;
  }

  // Generate tests
  await generateTests(filePath);
}

/**
 * Generate coverage tests command handler
 */
async function generateCoverageTestsCommand(): Promise<void> {
  // Show progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating coverage tests',
      cancellable: true,
    },
    async (progress, token) => {
      progress.report({ increment: 0, message: 'Running coverage tests...' });

      try {
        // Run the script
        const result = await runScript('npm run generate:coverage-tests');
        testGenOutputChannel.appendLine(result);
        testGenOutputChannel.show();

        progress.report({ increment: 100, message: 'Done' });
        vscode.window.showInformationMessage('Coverage tests generated successfully');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate coverage tests: ${error}`);
      }
    }
  );
}

/**
 * Generate AI-powered tests command handler
 */
async function generateAITestsCommand(): Promise<void> {
  // Show quick pick to select file
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace folder is open');
    return;
  }

  // Get all TypeScript files in the src directory
  const srcPath = path.join(workspaceFolders[0].uri.fsPath, 'src');
  const files = await findTypeScriptFiles(srcPath);

  // Show quick pick
  const selectedFile = await vscode.window.showQuickPick(
    files.map(file => ({
      label: path.relative(srcPath, file),
      description: file,
    })),
    {
      placeHolder: 'Select a file to generate AI-powered tests for',
    }
  );

  if (!selectedFile) {
    return;
  }

  // Generate AI-powered tests
  await generateAITests(selectedFile.description);
}

/**
 * Generate AI-powered tests for current file command handler
 */
async function generateAITestsForCurrentFileCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const filePath = editor.document.uri.fsPath;
  if (!filePath.endsWith('.ts') || filePath.endsWith('.test.ts')) {
    vscode.window.showErrorMessage('Current file is not a TypeScript source file');
    return;
  }

  // Generate AI-powered tests
  await generateAITests(filePath);
}

/**
 * Generate AI-powered tests for a file
 *
 * @param filePath Path to the file
 */
async function generateAITests(filePath: string): Promise<void> {
  // Show model selection dialog
  const modelOptions = [
    { label: 'codellama:7b', description: 'CodeLlama 7B (fast, good quality)' },
    { label: 'codellama:13b', description: 'CodeLlama 13B (slower, better quality)' },
    { label: 'codellama:34b', description: 'CodeLlama 34B (slowest, best quality)' },
    { label: 'llama3:8b', description: 'Llama 3 8B (fast, good quality)' },
    { label: 'llama3:70b', description: 'Llama 3 70B (slowest, best quality)' }
  ];

  const selectedModel = await vscode.window.showQuickPick(modelOptions, {
    placeHolder: 'Select a model for AI-powered test generation',
  });

  if (!selectedModel) {
    return;
  }

  // Show progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating AI-powered tests',
      cancellable: true,
    },
    async (progress, token) => {
      progress.report({ increment: 0, message: 'Analyzing code...' });

      try {
        // Run the script
        progress.report({ increment: 20, message: 'Sending to LLM...' });
        const result = await runScript(`npm run generate:ai-tests "${filePath}" -- --model=${selectedModel.label}`);
        testGenOutputChannel.appendLine(result);
        testGenOutputChannel.show();

        progress.report({ increment: 100, message: 'Done' });
        vscode.window.showInformationMessage('AI-powered tests generated successfully');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate AI-powered tests: ${error}`);
      }
    }
  );
}

/**
 * Generate test for selection command handler
 */
async function generateTestForSelectionCommand(editor: vscode.TextEditor): Promise<void> {
  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showErrorMessage('No text selected');
    return;
  }

  const filePath = editor.document.uri.fsPath;
  if (!filePath.endsWith('.ts') || filePath.endsWith('.test.ts')) {
    vscode.window.showErrorMessage('Current file is not a TypeScript source file');
    return;
  }

  const selectedText = editor.document.getText(selection);

  // Extract function or class name from selection
  const functionMatch = selectedText.match(/function\s+(\w+)/);
  const classMatch = selectedText.match(/class\s+(\w+)/);
  const methodMatch = selectedText.match(/(\w+)\s*\([^)]*\)\s*{/);

  let itemName = '';
  if (functionMatch) {
    itemName = functionMatch[1];
  } else if (classMatch) {
    itemName = classMatch[1];
  } else if (methodMatch) {
    itemName = methodMatch[1];
  }

  if (!itemName) {
    vscode.window.showErrorMessage('No function, class, or method found in selection');
    return;
  }

  // Generate test for the selected item
  await generateTestForItem(filePath, itemName);
}

/**
 * Generate tests for a file
 *
 * @param filePath Path to the file
 */
async function generateTests(filePath: string): Promise<void> {
  // Show progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating tests',
      cancellable: true,
    },
    async (progress, token) => {
      progress.report({ increment: 0, message: 'Generating tests...' });

      try {
        // Run the script
        const result = await runScript(`npm run generate:tests "${filePath}"`);
        testGenOutputChannel.appendLine(result);
        testGenOutputChannel.show();

        progress.report({ increment: 100, message: 'Done' });
        vscode.window.showInformationMessage('Tests generated successfully');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate tests: ${error}`);
      }
    }
  );
}

/**
 * Generate test for a specific item in a file
 *
 * @param filePath Path to the file
 * @param itemName Name of the item (function, class, method)
 */
async function generateTestForItem(filePath: string, itemName: string): Promise<void> {
  // Show progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Generating test for ${itemName}`,
      cancellable: true,
    },
    async (progress, token) => {
      progress.report({ increment: 0, message: 'Generating test...' });

      try {
        // Run the script with item filter
        const result = await runScript(`npm run generate:tests "${filePath}" -- --item="${itemName}"`);
        testGenOutputChannel.appendLine(result);
        testGenOutputChannel.show();

        progress.report({ increment: 100, message: 'Done' });
        vscode.window.showInformationMessage(`Test for ${itemName} generated successfully`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate test: ${error}`);
      }
    }
  );
}

/**
 * Find all TypeScript files in a directory
 *
 * @param directory Directory to search
 * @returns Array of file paths
 */
async function findTypeScriptFiles(directory: string): Promise<string[]> {
  const files: string[] = [];

  // Read directory
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  // Process each entry
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and test directories
      if (entry.name === 'node_modules' || entry.name === 'test') {
        continue;
      }

      // Recursively search subdirectories
      const subFiles = await findTypeScriptFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Run a script and return the output
 *
 * @param command Command to run
 * @returns Promise with the output
 */
function runScript(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec(command, { cwd: vscode.workspace.workspaceFolders?.[0].uri.fsPath }, (error, stdout, stderr) => {
      if (error) {
        reject(`${error.message}\n${stderr}`);
        return;
      }

      resolve(stdout);
    });
  });
}
