#!/usr/bin/env node

/**
 * Test-Driven Development Helper Script
 * 
 * This script helps with test-driven development by:
 * 1. Watching for changes in test files
 * 2. Running the corresponding tests
 * 3. Watching for changes in implementation files
 * 4. Running the tests that cover those files
 * 
 * Usage:
 *   node scripts/tdd.js [--watch-path=<path>] [--test-path=<path>]
 * 
 * Options:
 *   --watch-path: Path to watch for changes (default: src)
 *   --test-path: Path to test files (default: src/test)
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
};

args.forEach(arg => {
  if (arg.startsWith('--watch-path=')) {
    options.watchPath = arg.split('=')[1];
  } else if (arg.startsWith('--test-path=')) {
    options.testPath = arg.split('=')[1];
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
