#!/usr/bin/env node

/**
 * Create Test Script
 * 
 * This script creates a new test file from a template.
 * 
 * Usage:
 *   node scripts/create-test.js <module-path> [--suite=<suite-name>]
 * 
 * Example:
 *   node scripts/create-test.js src/mcp/mcpClient
 *   node scripts/create-test.js src/mcp/mcpClient --suite=mcp
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Error: Module path is required');
  console.log('Usage: node scripts/create-test.js <module-path> [--suite=<suite-name>]');
  process.exit(1);
}

// Get the module path
const modulePath = args[0];

// Get the suite name (optional)
let suiteName = '';
args.slice(1).forEach(arg => {
  if (arg.startsWith('--suite=')) {
    suiteName = arg.split('=')[1];
  }
});

// Determine the test file path
const moduleBaseName = path.basename(modulePath);
const testFileName = `${moduleBaseName}.test.ts`;

let testFilePath;
if (suiteName) {
  testFilePath = path.join('src', 'test', 'suite', suiteName, testFileName);
  
  // Create the suite directory if it doesn't exist
  const suiteDir = path.join('src', 'test', 'suite', suiteName);
  if (!fs.existsSync(suiteDir)) {
    fs.mkdirSync(suiteDir, { recursive: true });
    console.log(`Created suite directory: ${suiteDir}`);
  }
} else {
  testFilePath = path.join('src', 'test', 'suite', testFileName);
}

// Check if the test file already exists
if (fs.existsSync(testFilePath)) {
  console.error(`Error: Test file already exists: ${testFilePath}`);
  process.exit(1);
}

// Read the template
const templatePath = path.join('src', 'test', 'templates', 'test.template.ts');
if (!fs.existsSync(templatePath)) {
  console.error(`Error: Template file not found: ${templatePath}`);
  process.exit(1);
}

let template = fs.readFileSync(templatePath, 'utf8');

// Generate the class name from the module path
const moduleParts = moduleBaseName.split('.');
const className = moduleParts[0].charAt(0).toUpperCase() + moduleParts[0].slice(1);

// Replace placeholders in the template
template = template.replace('Your Test Suite Name', `${className} Test Suite`);
template = template.replace('// import { YourClass } from \'../../path/to/your/module\';', 
  `import { ${className} } from '../../${modulePath.replace(/^src\//, '')}';`);

// Write the test file
fs.writeFileSync(testFilePath, template);

console.log(`Created test file: ${testFilePath}`);
