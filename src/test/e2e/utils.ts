/**
 * End-to-End Test Utilities
 *
 * This file provides utility functions for end-to-end tests.
 *
 * @requirement REQ-TEST-E2E-006 Provide utility functions for end-to-end tests
 * @requirement REQ-TEST-E2E-007 Support UI interaction in end-to-end tests
 * @requirement REQ-TEST-E2E-008 Support assertion helpers for end-to-end tests
 */

import * as vscode from 'vscode';
import * as assert from 'assert';

/**
 * Wait for a condition to be true
 * @param condition Condition to wait for
 * @param timeout Timeout in milliseconds
 * @param message Message to show if timeout is reached
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 10000,
  message: string = 'Condition not met within timeout'
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(100);
  }
  throw new Error(message);
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a VS Code command
 * @param command Command to execute
 * @param args Command arguments
 */
export async function executeCommand<T>(command: string, ...args: any[]): Promise<T> {
  return await vscode.commands.executeCommand<T>(command, ...args);
}

/**
 * Open a file in the editor
 * @param filePath Path to the file
 */
export async function openFile(filePath: string): Promise<vscode.TextEditor> {
  const document = await vscode.workspace.openTextDocument(filePath);
  return await vscode.window.showTextDocument(document);
}

/**
 * Get all webviews of a specific type
 * @param viewType View type to find
 */
export function getWebviews(viewType: string): vscode.WebviewPanel[] {
  return (vscode.window as any).visibleWebviewPanels?.filter(
    (panel: vscode.WebviewPanel) => panel.viewType === viewType
  ) || [];
}

/**
 * Wait for a webview to appear
 * @param viewType View type to wait for
 * @param timeout Timeout in milliseconds
 */
export async function waitForWebview(
  viewType: string,
  timeout: number = 10000
): Promise<vscode.WebviewPanel> {
  return new Promise<vscode.WebviewPanel>(async (resolve, reject) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const webviews = getWebviews(viewType);
      if (webviews.length > 0) {
        resolve(webviews[0]);
        return;
      }
      await sleep(100);
    }
    reject(new Error(`Webview of type ${viewType} not found within timeout`));
  });
}

/**
 * Assert that a command exists
 * @param command Command to check
 */
export async function assertCommandExists(command: string): Promise<void> {
  const commands = await vscode.commands.getCommands();
  assert.ok(commands.includes(command), `Command ${command} does not exist`);
}

/**
 * Assert that a view exists
 * @param viewId View ID to check
 */
export async function assertViewExists(viewId: string): Promise<void> {
  const views = vscode.window.visibleTextEditors.map(editor => editor.document.uri.toString());
  assert.ok(views.some(view => view.includes(viewId)), `View ${viewId} does not exist`);
}

/**
 * Send a message to a webview
 * @param webview Webview to send message to
 * @param message Message to send
 */
export function sendWebviewMessage(webview: vscode.WebviewPanel, message: any): void {
  webview.webview.postMessage(message);
}

/**
 * Wait for a message from a webview
 * @param webview Webview to wait for message from
 * @param timeout Timeout in milliseconds
 */
export function waitForWebviewMessage(
  webview: vscode.WebviewPanel,
  timeout: number = 10000
): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const listener = webview.webview.onDidReceiveMessage(message => {
      listener.dispose();
      resolve(message);
    });

    setTimeout(() => {
      listener.dispose();
      reject(new Error('Timeout waiting for webview message'));
    }, timeout);
  });
}
