/**
 * AI Test Generation Commands Tests
 *
 * Tests for the AI test generation commands.
 *
 * Requirements being tested:
 * - REQ-TEST-GEN-001: Generate AI-powered tests for a file
 * - REQ-TEST-GEN-002: Generate AI-powered tests for the current file
 *
 * Test tags:
 * - TEST-TEST-GEN-001: Test that generateAITestsCommand() works correctly
 * - TEST-TEST-GEN-001a: Test that generateAITestsCommand() handles errors gracefully
 * - TEST-TEST-GEN-002: Test that generateAITestsForCurrentFileCommand() works correctly
 * - TEST-TEST-GEN-002a: Test that generateAITestsForCurrentFileCommand() handles errors gracefully
 * - TEST-TEST-GEN-003: Test that generateAITests() works correctly
 * - TEST-TEST-GEN-003a: Test that generateAITests() handles errors gracefully
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';

// Use a require statement to access the private functions
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testGenerationCommands = require('../../../commands/testGenerationCommands');

suite('AI Test Generation Commands Test Suite', () => {
  // Stubs and mocks
  let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;
  let showQuickPickStub: sinon.SinonStub;
  let executeCommandStub: sinon.SinonStub;
  let withProgressStub: sinon.SinonStub;
  let showErrorMessageStub: sinon.SinonStub;
  let showInformationMessageStub: sinon.SinonStub;
  let activeTextEditorStub: sinon.SinonStub;
  let workspaceFoldersStub: sinon.SinonStub;
  let execStub: sinon.SinonStub;
  let readdirSyncStub: sinon.SinonStub;
  let existsSyncStub: sinon.SinonStub;
  let statSyncStub: sinon.SinonStub;

  // Setup before each test
  setup(() => {
    // Create stubs
    outputChannelStub = sinon.createStubInstance(vscode.OutputChannel);

    // Stub VS Code window.createOutputChannel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(vscode.window, 'createOutputChannel').returns(outputChannelStub as any);

    // Stub VS Code window.showQuickPick
    showQuickPickStub = sinon.stub(vscode.window, 'showQuickPick');

    // Stub VS Code commands.executeCommand
    executeCommandStub = sinon.stub(vscode.commands, 'executeCommand');

    // Stub VS Code window.withProgress
    withProgressStub = sinon.stub(vscode.window, 'withProgress');

    // Stub VS Code window.showErrorMessage
    showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');

    // Stub VS Code window.showInformationMessage
    showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage');

    // Stub VS Code window.activeTextEditor
    activeTextEditorStub = sinon.stub(vscode.window, 'activeTextEditor');

    // Stub VS Code workspace.workspaceFolders
    workspaceFoldersStub = sinon.stub(vscode.workspace, 'workspaceFolders');

    // Stub child_process.exec
    execStub = sinon.stub(cp, 'exec');

    // Stub fs.readdirSync
    readdirSyncStub = sinon.stub(fs, 'readdirSync');

    // Stub fs.existsSync
    existsSyncStub = sinon.stub(fs, 'existsSync');

    // Stub fs.statSync
    statSyncStub = sinon.stub(fs, 'statSync');
  });

  // Teardown after each test
  teardown(() => {
    // Restore all stubs
    sinon.restore();
  });

  // TEST-TEST-GEN-001: Test that generateAITestsCommand() works correctly
  test('generateAITestsCommand() should work correctly', async () => {
    // Arrange
    const mockFiles = ['/workspace/src/file1.ts', '/workspace/src/file2.ts'];
    const mockWorkspaceFolder = { uri: { fsPath: '/workspace' } };
    workspaceFoldersStub.value([mockWorkspaceFolder]);
    
    readdirSyncStub.returns([
      { name: 'file1.ts', isDirectory: () => false, isFile: () => true },
      { name: 'file2.ts', isDirectory: () => false, isFile: () => true }
    ]);
    
    showQuickPickStub.resolves({ label: 'file1.ts', description: '/workspace/src/file1.ts' });
    
    withProgressStub.callsFake((options, callback) => {
      const progress = {
        report: sinon.stub()
      };
      return callback(progress, undefined);
    });
    
    execStub.callsFake((command, options, callback) => {
      callback(null, 'Success', '');
      return { on: sinon.stub() };
    });

    // Act
    await testGenerationCommands.generateAITestsCommand();

    // Assert
    assert.ok(showQuickPickStub.called);
    assert.ok(withProgressStub.called);
    assert.ok(execStub.called);
    assert.ok(showInformationMessageStub.called);
  });

  // TEST-TEST-GEN-001a: Test that generateAITestsCommand() handles errors gracefully
  test('generateAITestsCommand() should handle errors gracefully', async () => {
    // Arrange
    workspaceFoldersStub.value(undefined);

    // Act
    await testGenerationCommands.generateAITestsCommand();

    // Assert
    assert.ok(showErrorMessageStub.called);
    assert.strictEqual(showErrorMessageStub.firstCall.args[0], 'No workspace folder is open');
  });

  // TEST-TEST-GEN-002: Test that generateAITestsForCurrentFileCommand() works correctly
  test('generateAITestsForCurrentFileCommand() should work correctly', async () => {
    // Arrange
    const mockEditor = {
      document: {
        uri: {
          fsPath: '/workspace/src/file1.ts'
        }
      }
    };
    activeTextEditorStub.value(mockEditor);
    
    showQuickPickStub.resolves({ label: 'codellama:7b' });
    
    withProgressStub.callsFake((options, callback) => {
      const progress = {
        report: sinon.stub()
      };
      return callback(progress, undefined);
    });
    
    execStub.callsFake((command, options, callback) => {
      callback(null, 'Success', '');
      return { on: sinon.stub() };
    });

    // Act
    await testGenerationCommands.generateAITestsForCurrentFileCommand();

    // Assert
    assert.ok(showQuickPickStub.called);
    assert.ok(withProgressStub.called);
    assert.ok(execStub.called);
    assert.ok(showInformationMessageStub.called);
  });

  // TEST-TEST-GEN-002a: Test that generateAITestsForCurrentFileCommand() handles errors gracefully
  test('generateAITestsForCurrentFileCommand() should handle errors gracefully', async () => {
    // Arrange
    activeTextEditorStub.value(undefined);

    // Act
    await testGenerationCommands.generateAITestsForCurrentFileCommand();

    // Assert
    assert.ok(showErrorMessageStub.called);
    assert.strictEqual(showErrorMessageStub.firstCall.args[0], 'No active editor');
  });

  // TEST-TEST-GEN-003: Test that generateAITests() works correctly
  test('generateAITests() should work correctly', async () => {
    // Arrange
    showQuickPickStub.resolves({ label: 'codellama:7b' });
    
    withProgressStub.callsFake((options, callback) => {
      const progress = {
        report: sinon.stub()
      };
      return callback(progress, undefined);
    });
    
    execStub.callsFake((command, options, callback) => {
      callback(null, 'Success', '');
      return { on: sinon.stub() };
    });

    // Act
    await testGenerationCommands.generateAITests('/workspace/src/file1.ts');

    // Assert
    assert.ok(showQuickPickStub.called);
    assert.ok(withProgressStub.called);
    assert.ok(execStub.called);
    assert.ok(showInformationMessageStub.called);
  });

  // TEST-TEST-GEN-003a: Test that generateAITests() handles errors gracefully
  test('generateAITests() should handle errors gracefully', async () => {
    // Arrange
    showQuickPickStub.resolves(undefined);

    // Act
    await testGenerationCommands.generateAITests('/workspace/src/file1.ts');

    // Assert
    assert.ok(showQuickPickStub.called);
    assert.ok(!withProgressStub.called);
  });
});
