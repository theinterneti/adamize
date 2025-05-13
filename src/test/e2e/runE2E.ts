/**
 * End-to-End Test Runner
 *
 * This file is responsible for running end-to-end tests for the extension.
 * It sets up the VS Code extension host and runs the tests.
 *
 * @requirement REQ-TEST-E2E-001 Run end-to-end tests for the extension
 * @requirement REQ-TEST-E2E-002 Set up VS Code extension host for testing
 * @requirement REQ-TEST-E2E-003 Support headless testing
 */

import * as path from 'path';
import { runTests } from '@vscode/test-electron';

/**
 * Main function to run the end-to-end tests
 */
async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../../');

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './index');

    // Additional launch arguments for VS Code
    const launchArgs = [
      '--disable-extensions', // Disable other extensions
      '--disable-gpu', // Disable GPU acceleration
    ];

    // Check if we're running in headless mode
    if (process.env.HEADLESS === 'true') {
      launchArgs.push('--headless');
      launchArgs.push('--no-sandbox');
    }

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs,
    });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

// Run the main function
main();
