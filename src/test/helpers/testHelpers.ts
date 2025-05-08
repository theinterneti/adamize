/**
 * Test Helpers
 * 
 * Utility functions for testing
 */

import * as sinon from 'sinon';
import * as vscode from 'vscode';

/**
 * Create a properly typed OutputChannel stub
 * @returns A sinon stubbed instance of OutputChannel
 */
export function createOutputChannelStub(): sinon.SinonStubbedInstance<vscode.OutputChannel> {
  // Create a base stub
  const stub: Partial<sinon.SinonStubbedInstance<vscode.OutputChannel>> = {
    name: 'Test Channel',
    append: sinon.stub(),
    appendLine: sinon.stub(),
    clear: sinon.stub(),
    hide: sinon.stub(),
    dispose: sinon.stub(),
  };

  // Create a properly typed show method that handles both overloads
  const showStub = sinon.stub();
  // Add the function signature to the stub
  (showStub as any).call = function(thisArg: any, ...args: any[]) {
    return showStub.apply(thisArg, args);
  };
  
  stub.show = showStub as any;

  return stub as sinon.SinonStubbedInstance<vscode.OutputChannel>;
}
