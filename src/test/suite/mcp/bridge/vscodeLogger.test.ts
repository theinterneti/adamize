/**
 * VS Code Logger Tests
 *
 * Tests for the VS Code Logger implementation.
 *
 * @requirement REQ-LOGGER-001 Replace console-based logging with VS Code output channel
 * @requirement REQ-LOGGER-002 Support different log levels (debug, info, warn, error)
 * @requirement REQ-LOGGER-003 Support log formatting
 * @requirement REQ-LOGGER-004 Support log filtering by level
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { VSCodeLogger, LogLevel } from '../../../../mcp/bridge/vscodeLogger';
import { createOutputChannelStub } from '../../../helpers/testHelpers';

suite('VS Code Logger Tests', () => {
  let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;

  setup(() => {
    // Create a stub for the VS Code output channel
    outputChannelStub = createOutputChannelStub();
  });

  teardown(() => {
    // Restore all stubs
    sinon.restore();
  });

  /**
   * @test TEST-LOGGER-001 Test that the logger can be created with an output channel
   */
  test('should create a logger with an output channel', () => {
    // Arrange & Act
    const logger = new VSCodeLogger(outputChannelStub as unknown as vscode.OutputChannel);

    // Assert
    assert.ok(logger, 'Logger should be created');
  });

  /**
   * @test TEST-LOGGER-002 Test that the logger logs messages at different levels
   */
  test('should log messages at different levels', () => {
    // Arrange
    const logger = new VSCodeLogger(outputChannelStub as unknown as vscode.OutputChannel);

    // Act
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');

    // Assert
    assert.strictEqual(outputChannelStub.appendLine.callCount, 4, 'Should log 4 messages');

    // Check that each message contains the correct level prefix
    assert.ok(
      outputChannelStub.appendLine.getCall(0).args[0].includes('[DEBUG]'),
      'Debug message should have DEBUG prefix'
    );
    assert.ok(
      outputChannelStub.appendLine.getCall(1).args[0].includes('[INFO]'),
      'Info message should have INFO prefix'
    );
    assert.ok(
      outputChannelStub.appendLine.getCall(2).args[0].includes('[WARN]'),
      'Warning message should have WARN prefix'
    );
    assert.ok(
      outputChannelStub.appendLine.getCall(3).args[0].includes('[ERROR]'),
      'Error message should have ERROR prefix'
    );
  });

  /**
   * @test TEST-LOGGER-003 Test that the logger formats messages correctly
   */
  test('should format messages correctly', () => {
    // Arrange
    const logger = new VSCodeLogger(outputChannelStub as unknown as vscode.OutputChannel);
    const timestamp = Date.now();
    const clock = sinon.useFakeTimers(timestamp);

    // Act
    logger.info('Test message');

    // Assert
    const loggedMessage = outputChannelStub.appendLine.getCall(0).args[0];
    const date = new Date(timestamp);
    const timeString = date.toISOString();

    assert.ok(
      loggedMessage.includes(timeString),
      `Message should include timestamp ${timeString}`
    );
    assert.ok(
      loggedMessage.includes('[INFO]'),
      'Message should include level'
    );
    assert.ok(
      loggedMessage.includes('Test message'),
      'Message should include content'
    );

    // Cleanup
    clock.restore();
  });

  /**
   * @test TEST-LOGGER-004 Test that the logger filters messages by level
   */
  test('should filter messages by level', () => {
    // Arrange
    const logger = new VSCodeLogger(outputChannelStub as unknown as vscode.OutputChannel, LogLevel.INFO);

    // Act
    logger.debug('Debug message'); // Should be filtered out
    logger.info('Info message');   // Should be logged
    logger.warn('Warning message'); // Should be logged
    logger.error('Error message');  // Should be logged

    // Assert
    assert.strictEqual(outputChannelStub.appendLine.callCount, 3, 'Should log 3 messages (excluding DEBUG)');

    // Check that debug message was not logged
    const calls = outputChannelStub.appendLine.getCalls();
    const debugCalls = calls.filter(call => call.args[0].includes('[DEBUG]'));
    assert.strictEqual(debugCalls.length, 0, 'No debug messages should be logged');

    // Check that other levels were logged
    const infoCalls = calls.filter(call => call.args[0].includes('[INFO]'));
    const warnCalls = calls.filter(call => call.args[0].includes('[WARN]'));
    const errorCalls = calls.filter(call => call.args[0].includes('[ERROR]'));

    assert.strictEqual(infoCalls.length, 1, 'Info message should be logged');
    assert.strictEqual(warnCalls.length, 1, 'Warning message should be logged');
    assert.strictEqual(errorCalls.length, 1, 'Error message should be logged');
  });
});
