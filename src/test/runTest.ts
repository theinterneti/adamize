import * as path from 'path';
import * as cp from 'child_process';

import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests,
} from '@vscode/test-electron';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Check if we're in a CI environment or want to run unit tests only
    if (process.env.CI || process.env.UNIT_TESTS_ONLY) {
      console.log('Running unit tests only...');
      // Run the unit tests using Jest
      const jestProcess = cp.spawnSync('npx', ['jest'], {
        encoding: 'utf-8',
        stdio: 'inherit',
        env: { ...process.env, JEST_JUNIT_OUTPUT_DIR: './test-results' }
      });

      if (jestProcess.status !== 0) {
        throw new Error(`Jest tests failed with status ${jestProcess.status}`);
      }

      console.log('Unit tests completed successfully!');
      return;
    }

    // Download VS Code, unzip it and run the integration test
    console.log('Running VS Code extension tests...');
    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
    const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

    // Use cp.spawn / cp.exec for custom setup
    cp.spawnSync(cliPath, [...args, '--install-extension', 'dbaeumer.vscode-eslint'], {
      encoding: 'utf-8',
      stdio: 'inherit',
    });

    // Run the extension test in headless mode
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        '--disable-gpu',
        '--headless',
        '--no-sandbox'
      ],
    });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
