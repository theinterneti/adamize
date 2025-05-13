/**
 * End-to-End Test Index
 *
 * This file is the entry point for running end-to-end tests.
 * It sets up the test environment and runs the tests.
 *
 * @requirement REQ-TEST-E2E-004 Set up test environment for end-to-end tests
 * @requirement REQ-TEST-E2E-005 Run all end-to-end tests
 */

import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

/**
 * Run the end-to-end tests
 */
export async function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 60000, // Longer timeout for E2E tests
  });

  // Find all test files
  const testsRoot = path.resolve(__dirname);

  try {
    // Use glob to find all test files
    const files = await glob('**/*.e2e.js', { cwd: testsRoot });

    // Add files to the test suite
    files.forEach(f => {
      console.log(`Adding E2E test file: ${f}`);
      mocha.addFile(path.resolve(testsRoot, f));
    });

    // Run the tests
    return new Promise<void>((resolve, reject) => {
      try {
        mocha.run(failures => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error('Error running E2E tests:', err);
        reject(err);
      }
    });
  } catch (err) {
    console.error('Error finding E2E test files:', err);
    throw err;
  }
}
