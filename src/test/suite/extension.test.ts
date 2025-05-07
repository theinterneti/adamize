import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Starting extension tests');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('adamize.adamize'));
  });

  // Skip this test when running with Jest
  // This test requires the actual VS Code API
  test.skip('Should register commands', async () => {
    // Get all registered commands
    const commands = await vscode.commands.getCommands();

    // Check if our commands are registered
    assert.ok(commands.includes('adamize.showWelcome'));
    assert.ok(commands.includes('adamize.connectMCP'));
    assert.ok(commands.includes('adamize.listMCPTools'));
    assert.ok(commands.includes('adamize.runTests'));
    assert.ok(commands.includes('adamize.runTestsWithCoverage'));
  });
});
