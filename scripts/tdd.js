#!/usr/bin/env node

/**
 * Test-Driven Development Helper Script
 *
 * This script helps with test-driven development by:
 * 1. Watching for changes in test files
 * 2. Running the corresponding tests
 * 3. Watching for changes in implementation files
 * 4. Running the tests that cover those files
 * 5. Optionally identifying and staging "green" code-test pairs
 *
 * Usage:
 *   node scripts/tdd.js [--watch-path=<path>] [--test-path=<path>] [--auto-stage] [--auto-commit]
 *
 * Options:
 *   --watch-path: Path to watch for changes (default: src)
 *   --test-path: Path to test files (default: src/test)
 *   --auto-stage: Automatically stage passing tests and their implementations (default: false)
 *   --auto-commit: Automatically commit passing tests and their implementations (default: false)
 */

const { spawn } = require('child_process');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  watchPath: 'src',
  testPath: 'src/test',
  autoStage: false,
  autoCommit: false
};

args.forEach(arg => {
  if (arg.startsWith('--watch-path=')) {
    options.watchPath = arg.split('=')[1];
  } else if (arg.startsWith('--test-path=')) {
    options.testPath = arg.split('=')[1];
  } else if (arg === '--auto-stage') {
    options.autoStage = true;
  } else if (arg === '--auto-commit') {
    options.autoStage = true; // Auto-commit implies auto-stage
    options.autoCommit = true;
  }
});

// Ensure the paths exist
if (!fs.existsSync(options.watchPath)) {
  console.error(`Watch path does not exist: ${options.watchPath}`);
  process.exit(1);
}

if (!fs.existsSync(options.testPath)) {
  console.error(`Test path does not exist: ${options.testPath}`);
  process.exit(1);
}

console.log(`
🧪 Test-Driven Development Helper
--------------------------------
Watching for changes in: ${options.watchPath}
Test files located in: ${options.testPath}
Auto-stage passing tests: ${options.autoStage ? 'Enabled ✅' : 'Disabled ❌'}
Auto-commit passing tests: ${options.autoCommit ? 'Enabled ✅' : 'Disabled ❌'}
`);

// Keep track of the current test process
let currentProcess = null;

// Function to run tests
function runTests(testFile) {
  // Kill any existing test process
  if (currentProcess) {
    currentProcess.kill();
  }

  console.log(`\n🧪 Running tests: ${testFile}`);

  // Run the tests using Jest
  currentProcess = spawn('npx', ['jest', testFile, '--colors'], {
    stdio: 'inherit',
    shell: true,
  });

  currentProcess.on('close', code => {
    if (code === 0) {
      console.log('\n✅ Tests passed!');

      // If auto-stage or auto-commit is enabled, identify and stage/commit green pairs
      if (options.autoStage || options.autoCommit) {
        console.log('\n🔍 Identifying and staging green code-test pairs...');

        // Build the command
        let command = 'npm run identify:green';
        if (options.autoCommit) {
          command += ':commit';
        }

        // Add the specific test file as a parameter
        command += ` -- ${testFile}`;

        // Execute the command
        try {
          const { execSync } = require('child_process');
          execSync(command, { stdio: 'inherit' });
        } catch (error) {
          console.error('Error identifying green pairs:', error.message);
        }
      }
    } else {
      console.log('\n❌ Tests failed!');
    }
    console.log('\nWaiting for changes...');
    currentProcess = null;
  });
}

// Function to find the corresponding test file for an implementation file
function findTestFile(file) {
  const fileName = path.basename(file);
  const dirName = path.dirname(file);

  // If it's already a test file, return it
  if (fileName.includes('.test.')) {
    return file;
  }

  // Try to find a test file with the same name
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const testFileName = `${baseName}.test.ts`;

  // Check if the test file exists in the same directory
  const sameDirectoryTestFile = path.join(dirName, testFileName);
  if (fs.existsSync(sameDirectoryTestFile)) {
    return sameDirectoryTestFile;
  }

  // Check if the test file exists in the test directory
  const testDirectoryTestFile = path.join(options.testPath, testFileName);
  if (fs.existsSync(testDirectoryTestFile)) {
    return testDirectoryTestFile;
  }

  // Check if the test file exists in the test/suite directory
  const testSuiteDirectoryTestFile = path.join(options.testPath, 'suite', testFileName);
  if (fs.existsSync(testSuiteDirectoryTestFile)) {
    return testSuiteDirectoryTestFile;
  }

  // If no test file is found, return null
  return null;
}

// Watch for changes in the source and test directories
const watcher = chokidar.watch([options.watchPath, options.testPath], {
  ignored: /(^|[\/\\])\../, // Ignore dotfiles
  persistent: true,
});

// Handle file changes
watcher.on('change', file => {
  // Only watch TypeScript files
  if (!file.endsWith('.ts')) {
    return;
  }

  console.log(`\nFile changed: ${file}`);

  // Find the corresponding test file
  const testFile = findTestFile(file);

  if (testFile) {
    runTests(testFile);
  } else {
    console.log(`No test file found for ${file}`);
  }
});

console.log('Waiting for changes...');
