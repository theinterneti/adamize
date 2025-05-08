import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { createOutputChannelStub } from '../helpers/testHelpers';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Starting extension tests');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('adamize.adamize'));
  });

  // Test command registration using mocks
  test('Should register commands', async () => {
    // Import the extension module directly in the test to avoid issues with mocking
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const extension = require('../../extension');

    // Create stubs for VS Code commands
    const registerCommandStub = sinon.stub(vscode.commands, 'registerCommand').returns({
      dispose: sinon.stub()
    });

    // Create stubs for VS Code window functions
    sinon.stub(vscode.window, 'createOutputChannel').returns(createOutputChannelStub());

    // Add createTreeView to vscode.window if it doesn't exist
    if (!vscode.window.createTreeView) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (vscode.window as any).createTreeView = () => ({});
    }

    // Now we can stub it
    sinon.stub(vscode.window, 'createTreeView').returns({
      dispose: sinon.stub()
    });

    // We already imported createOutputChannelStub at the top of the file

    // Create a mock extension context
    const mockContext = {
      subscriptions: [],
      globalState: {
        get: sinon.stub().returns(true),
        update: sinon.stub().resolves()
      }
    };

    // Call the activate function
    extension.activate(mockContext);

    // Check if our commands were registered
    assert.ok(registerCommandStub.calledWith('adamize.showWelcome'));
    assert.ok(registerCommandStub.calledWith('adamize.connectMCP'));
    assert.ok(registerCommandStub.calledWith('adamize.listMCPTools'));
    assert.ok(registerCommandStub.calledWith('adamize.runTests'));
    assert.ok(registerCommandStub.calledWith('adamize.runTestsWithCoverage'));

    // Restore stubs
    sinon.restore();
  });

  test('showWelcomeMessage should show message on first activation', () => {
    // Import the extension module directly in the test to avoid issues with mocking
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
