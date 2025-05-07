#!/usr/bin/env node

/**
 * Identify Green Pairs Script
 *
 * This script identifies "green" code-test pairs (passing tests and their corresponding implementations)
 * and stages them for commit. It's designed to support a Test-Driven Development (TDD) workflow
 * by making it easy to commit code that passes tests.
 *
 * Usage:
 *   node scripts/identify-green-pairs.js [--stage] [--commit] [--message=<commit-message>]
 *
 * Options:
 *   --stage: Stage the files for commit (default: true)
 *   --commit: Automatically commit the files (default: false)
 *   --message: Custom commit message (default: generated from test descriptions)
 *   --verbose: Show detailed output (default: false)
 *   --dry-run: Show what would be staged/committed without actually doing it (default: false)
 *
 * Examples:
 *   node scripts/identify-green-pairs.js
 *   node scripts/identify-green-pairs.js --commit
 *   node scripts/identify-green-pairs.js --message="feat: implement MCP client"
 *   node scripts/identify-green-pairs.js --dry-run --verbose
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  stage: true,
  commit: false,
  message: '',
  verbose: false,
  dryRun: false,
  testFiles: []
};

args.forEach(arg => {
  if (arg === '--stage') {
    options.stage = true;
  } else if (arg === '--no-stage') {
    options.stage = false;
  } else if (arg === '--commit') {
    options.commit = true;
  } else if (arg.startsWith('--message=')) {
    options.message = arg.split('=')[1];
  } else if (arg === '--verbose') {
    options.verbose = true;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg.endsWith('.test.ts')) {
    // If the argument is a test file, add it to the list of test files
    options.testFiles.push(arg);
  }
});

// Configuration
const TEST_FILE_SUFFIX = '.test.ts';
const IMPLEMENTATION_PATTERNS = [
  // Standard pattern: src/path/to/file.ts -> src/test/suite/path/to/file.test.ts
  {
    test: /^src\/test\/suite\/(.+)\.test\.ts$/,
    impl: (match) => `src/${match[1]}.ts`
  },
  // MCP pattern: src/mcp/file.ts -> src/test/suite/mcp/file.test.ts
  {
    test: /^src\/test\/suite\/mcp\/(.+)\.test\.ts$/,
    impl: (match) => `src/mcp/${match[1]}.ts`
  }
];

// Tagging system patterns
const REQ_TAG_PATTERN = /REQ-([A-Z]+)-(\d+)/g;
const TEST_TAG_PATTERN = /TEST-([A-Z]+)-(\d+)/g;
const IMPL_TAG_PATTERN = /IMPL-([A-Z]+)-(\d+)/g;

/**
 * Run Jest tests and get results in JSON format
 * @param {string[]} testFiles Optional array of specific test files to run
 * @returns {Object} Test results
 */
function runTests(testFiles = []) {
  console.log('🧪 Running tests to identify passing tests...');

  // Create a temporary file to store test results
  const tempFile = path.join(os.tmpdir(), `jest-results-${Date.now()}.json`);

  try {
    // Build the Jest command
    let jestCommand = 'npx jest';

    // Add specific test files if provided
    if (testFiles.length > 0) {
      jestCommand += ` ${testFiles.join(' ')}`;
    }

    // Add the JSON output flag
    jestCommand += ` --json > ${tempFile}`;

    if (options.verbose) {
      console.log(`Running: ${jestCommand}`);
    }

    if (!options.dryRun) {
      execSync(jestCommand, {
        stdio: options.verbose ? 'inherit' : 'pipe'
      });
    } else {
      console.log('DRY RUN: Would run tests here');
      // For dry run, create a mock result
      const mockResults = {
        numPassedTests: 2,
        numFailedTests: 0,
        testResults: [
          {
            name: '/workspace/src/test/suite/mcp/mcpClient.test.ts',
            status: 'passed',
            assertionResults: [
              { status: 'passed', title: 'should connect to MCP server' },
              { status: 'passed', title: 'should handle connection errors' }
            ]
          }
        ]
      };
      fs.writeFileSync(tempFile, JSON.stringify(mockResults));
    }

    // Read and parse the results
    const results = JSON.parse(fs.readFileSync(tempFile, 'utf8'));

    // Clean up the temporary file
    fs.unlinkSync(tempFile);

    return results;
  } catch (error) {
    console.error('Error running tests:', error.message);
    // Clean up the temporary file if it exists
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    process.exit(1);
  }
}

/**
 * Find the implementation file for a test file
 * @param {string} testFile Path to the test file
 * @returns {string|null} Path to the implementation file or null if not found
 */
function findImplementationFile(testFile) {
  // Try to find the implementation file using patterns
  for (const pattern of IMPLEMENTATION_PATTERNS) {
    const match = testFile.match(pattern.test);
    if (match) {
      const implFile = pattern.impl(match);
      if (fs.existsSync(implFile)) {
        return implFile;
      }
    }
  }

  // If no pattern matched, try a simple replacement
  const baseName = path.basename(testFile, TEST_FILE_SUFFIX);
  const implFile = testFile
    .replace(/^src\/test\/suite\//, 'src/')
    .replace(/\.test\.ts$/, '.ts');

  if (fs.existsSync(implFile)) {
    return implFile;
  }

  // Try to find by tags
  const testContent = fs.readFileSync(testFile, 'utf8');
  const testTags = [...testContent.matchAll(TEST_TAG_PATTERN)].map(match => `${match[1]}-${match[2]}`);

  if (testTags.length > 0) {
    // Search for implementation files with matching IMPL tags
    const srcDir = path.join(process.cwd(), 'src');
    const files = findFilesRecursive(srcDir, '.ts');

    for (const file of files) {
      // Skip test files
      if (file.includes('/test/') || file.endsWith('.test.ts')) {
        continue;
      }

      const fileContent = fs.readFileSync(file, 'utf8');
      const implTags = [...fileContent.matchAll(IMPL_TAG_PATTERN)].map(match => `${match[1]}-${match[2]}`);

      // Check if any test tag matches any implementation tag
      const hasMatchingTag = testTags.some(tag => implTags.includes(tag));
      if (hasMatchingTag) {
        return file;
      }
    }
  }

  return null;
}

/**
 * Find files recursively in a directory
 * @param {string} dir Directory to search
 * @param {string} extension File extension to filter by
 * @returns {string[]} Array of file paths
 */
function findFilesRecursive(dir, extension) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // Skip node_modules and .git directories
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(findFilesRecursive(filePath, extension));
      }
    } else if (filePath.endsWith(extension)) {
      results.push(filePath);
    }
  });

  return results;
}

/**
 * Stage files for commit
 * @param {string[]} files Array of file paths to stage
 */
function stageFiles(files) {
  if (files.length === 0) {
    console.log('No files to stage');
    return;
  }

  console.log(`\n🚀 Staging ${files.length} files for commit:`);
  files.forEach(file => console.log(`  - ${file}`));

  if (!options.dryRun) {
    try {
      execSync(`git add ${files.join(' ')}`, { stdio: options.verbose ? 'inherit' : 'pipe' });
      console.log('✅ Files staged successfully');
    } catch (error) {
      console.error('Error staging files:', error.message);
      process.exit(1);
    }
  } else {
    console.log('DRY RUN: Would stage these files');
  }
}

/**
 * Commit staged files
 * @param {string} message Commit message
 */
function commitFiles(message) {
  console.log(`\n📝 Committing files with message: "${message}"`);

  if (!options.dryRun) {
    try {
      execSync(`git commit -m "${message}"`, { stdio: options.verbose ? 'inherit' : 'pipe' });
      console.log('✅ Files committed successfully');
    } catch (error) {
      console.error('Error committing files:', error.message);
      process.exit(1);
    }
  } else {
    console.log('DRY RUN: Would commit with the above message');
  }
}

/**
 * Generate a commit message from test descriptions
 * @param {Object} testResults Test results from Jest
 * @returns {string} Generated commit message
 */
function generateCommitMessage(testResults) {
  // Extract test names from passing tests
  const testNames = [];
  testResults.testResults.forEach(result => {
    if (result.status === 'passed') {
      result.assertionResults.forEach(assertion => {
        if (assertion.status === 'passed') {
          testNames.push(assertion.title);
        }
      });
    }
  });

  // Generate a commit message based on test names
  if (testNames.length === 0) {
    return 'feat: implement passing tests';
  } else if (testNames.length === 1) {
    return `feat: implement ${testNames[0]}`;
  } else {
    return `feat: implement ${testNames.length} passing tests\n\n- ${testNames.join('\n- ')}`;
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Identifying GREEN code-test pairs...');

  // Run tests and get results
  const testResults = runTests(options.testFiles);

  if (testResults.numPassedTests === 0) {
    console.log('❌ No passing tests found');
    process.exit(0);
  }

  console.log(`\n✅ Found ${testResults.numPassedTests} passing tests`);

  // Identify passing test files
  const passingTestFiles = testResults.testResults
    .filter(result => result.status === 'passed')
    .map(result => result.name);

  if (options.verbose) {
    console.log('\nPassing test files:');
    passingTestFiles.forEach(file => console.log(`  - ${file}`));
  }

  // Find implementation files for passing test files
  const filesToStage = [];
  passingTestFiles.forEach(testFile => {
    // Normalize the path (Jest returns absolute paths)
    const normalizedTestFile = path.relative(process.cwd(), testFile);
    filesToStage.push(normalizedTestFile);

    // Find the implementation file
    const implFile = findImplementationFile(normalizedTestFile);
    if (implFile) {
      filesToStage.push(implFile);
      if (options.verbose) {
        console.log(`Found implementation for ${normalizedTestFile} -> ${implFile}`);
      }
    } else {
      console.warn(`⚠️ Could not find implementation file for ${normalizedTestFile}`);
    }
  });

  // Remove duplicates
  const uniqueFilesToStage = [...new Set(filesToStage)];

  // If no files to stage, exit
  if (uniqueFilesToStage.length === 0) {
    console.log('\n⚠️ No files to stage');
    process.exit(0);
  }

  // Stage files
  if (options.stage) {
    stageFiles(uniqueFilesToStage);
  }

  // Commit files
  if (options.commit) {
    const message = options.message || generateCommitMessage(testResults);
    commitFiles(message);
  }

  console.log('\n🎉 Done!');
}

// Run the main function
main();
