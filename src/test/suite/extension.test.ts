import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

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

  test('showWelcomeMessage should show message on first activation', () => {
    // Import the extension module directly in the test to avoid issues with mocking
    const extension = require('../../extension');

    // Create stubs
    const showInfoStub = sinon.stub(vscode.window, 'showInformationMessage');
    const globalStateStub = {
      get: sinon.stub().returns(undefined),
      update: sinon.stub().resolves()
    };
    const context = { globalState: globalStateStub };

    // Call the function
    extension.showWelcomeMessage(context);

    // Assert
    assert.strictEqual(showInfoStub.calledWith('Welcome to Adamize! Get started by connecting to an MCP server.'), true);
    assert.strictEqual(globalStateStub.update.calledWith('adamize.hasShownWelcome', true), true);

    // Restore stubs
    sinon.restore();
  });

  test('showWelcomeMessage should not show message on subsequent activations', () => {
    // Import the extension module directly in the test to avoid issues with mocking
    const extension = require('../../extension');

    // Create stubs
    const showInfoStub = sinon.stub(vscode.window, 'showInformationMessage');
    const globalStateStub = {
      get: sinon.stub().returns(true),
      update: sinon.stub().resolves()
    };
    const context = { globalState: globalStateStub };

    // Call the function
    extension.showWelcomeMessage(context);

    // Assert
    assert.strictEqual(showInfoStub.called, false);

    // Restore stubs
    sinon.restore();
  });

  test('deactivate should log deactivation message', () => {
    // Import the extension module directly in the test to avoid issues with mocking
    const extension = require('../../extension');

    // Create stub
    const consoleInfoStub = sinon.stub(console, 'info');

    // Call the function
    extension.deactivate();

    // Assert
    assert.strictEqual(consoleInfoStub.calledWith('Deactivating Adamize extension'), true);

    // Restore stub
    sinon.restore();
  });
});
