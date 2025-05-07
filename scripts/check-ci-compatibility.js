#!/usr/bin/env node

/**
 * Check CI Compatibility Script
 * 
 * This script checks if tests will pass CI/CD checks by:
 * 1. Running ESLint on test files
 * 2. Checking for common issues that might fail in CI
 * 3. Verifying test coverage meets thresholds
 * 
 * Usage:
 *   node scripts/check-ci-compatibility.js [--path=<test-path>]
 * 
 * Example:
 *   node scripts/check-ci-compatibility.js
 *   node scripts/check-ci-compatibility.js --path=src/test/suite/mcp
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const glob = require('glob');

// Parse command line arguments
const args = process.argv.slice(2);

// Get the test path (optional)
let testPath = 'src/test/suite';
args.forEach(arg => {
  if (arg.startsWith('--path=')) {
    testPath = arg.split('=')[1];
  }
});

console.log('Checking CI compatibility for tests...');

// Step 1: Run ESLint on test files
try {
  console.log('\n=== Running ESLint on test files ===');
  const eslintOutput = execSync(`npx eslint ${testPath} --ext .ts`).toString();
  console.log('ESLint passed with no errors');
} catch (error) {
  console.error('ESLint found issues:');
  console.error(error.stdout.toString());
}

// Step 2: Check for common issues that might fail in CI
console.log('\n=== Checking for common CI issues ===');

// Find all test files
const testFiles = glob.sync(`${testPath}/**/*.test.ts`);

if (testFiles.length === 0) {
  console.error(`Error: No test files found in ${testPath}`);
  process.exit(1);
}

console.log(`Found ${testFiles.length} test files to check`);

// Common issues to check for
const issues = {
  'Missing sinon.restore()': 0,
  'Using require() without eslint-disable': 0,
  'Using any without eslint-disable': 0,
  'Missing test tags': 0,
  'Missing requirement tags': 0,
  'Hardcoded file paths': 0,
  'Hardcoded environment variables': 0,
  'Missing error handling': 0
};

// Check each test file
testFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Check for missing sinon.restore()
  if (content.includes('sinon') && !content.includes('sinon.restore()')) {
    console.log(`${fileName}: Missing sinon.restore() in teardown`);
    issues['Missing sinon.restore()']++;
  }
  
  // Check for require() without eslint-disable
  if (content.includes('require(') && !content.includes('eslint-disable-next-line @typescript-eslint/no-var-requires')) {
    console.log(`${fileName}: Using require() without eslint-disable comment`);
    issues['Using require() without eslint-disable']++;
  }
  
  // Check for any without eslint-disable
  if (content.includes(' as any') && !content.includes('eslint-disable-next-line @typescript-eslint/no-explicit-any')) {
    console.log(`${fileName}: Using 'as any' without eslint-disable comment`);
    issues['Using any without eslint-disable']++;
  }
  
  // Check for missing test tags
  if (!content.includes('TEST-')) {
    console.log(`${fileName}: Missing test tags (TEST-XXX-YYY)`);
    issues['Missing test tags']++;
  }
  
  // Check for missing requirement tags
  if (!content.includes('REQ-')) {
    console.log(`${fileName}: Missing requirement tags (REQ-XXX-YYY)`);
    issues['Missing requirement tags']++;
  }
  
  // Check for hardcoded file paths
  if (content.includes('/home/') || content.includes('C:\\') || content.includes('/Users/')) {
    console.log(`${fileName}: Contains hardcoded file paths`);
    issues['Hardcoded file paths']++;
  }
  
  // Check for hardcoded environment variables
  if (content.includes('process.env.') && !content.includes('process.env.CI')) {
    console.log(`${fileName}: Contains hardcoded environment variables`);
    issues['Hardcoded environment variables']++;
  }
  
  // Check for missing error handling
  if (!content.includes('error') && !content.includes('Error')) {
    console.log(`${fileName}: Missing error handling tests`);
    issues['Missing error handling']++;
  }
});

// Print summary of issues
console.log('\nIssue Summary:');
let totalIssues = 0;
Object.entries(issues).forEach(([issue, count]) => {
  console.log(`- ${issue}: ${count}`);
  totalIssues += count;
});

// Step 3: Try to run tests with coverage to check thresholds
console.log('\n=== Running tests with coverage ===');
try {
  // Run Jest with coverage
  execSync('npm run test:jest:coverage', { stdio: 'inherit' });
} catch (error) {
  console.error('Error running tests with coverage:');
  console.error(error.message);
}

// Final summary
console.log('\n=== CI Compatibility Check Summary ===');
if (totalIssues === 0) {
  console.log('✅ No issues found in test files');
} else {
  console.log(`❌ Found ${totalIssues} issues that might cause CI failures`);
}

// Add a new script to package.json if it doesn't exist
const packageJsonPath = path.join('package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts['check:ci']) {
    packageJson.scripts['check:ci'] = 'node scripts/check-ci-compatibility.js';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Added check:ci script to package.json');
  }
}
