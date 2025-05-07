#!/usr/bin/env node

/**
 * Create Enhanced Test Script
 * 
 * This script creates a new test file from the enhanced template.
 * It includes proper requirement and test tags, and ensures CI/CD compatibility.
 * 
 * Usage:
 *   node scripts/create-enhanced-test.js <module-path> [--suite=<suite-name>] [--req=<requirement-prefix>]
 * 
 * Example:
 *   node scripts/create-enhanced-test.js src/mcp/mcpClient
 *   node scripts/create-enhanced-test.js src/mcp/mcpClient --suite=mcp --req=MCP
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Error: Module path is required');
  console.log('Usage: node scripts/create-enhanced-test.js <module-path> [--suite=<suite-name>] [--req=<requirement-prefix>]');
  process.exit(1);
}

// Get the module path
const modulePath = args[0];

// Get the suite name and requirement prefix (optional)
let suiteName = '';
let reqPrefix = '';

args.slice(1).forEach(arg => {
  if (arg.startsWith('--suite=')) {
    suiteName = arg.split('=')[1];
  } else if (arg.startsWith('--req=')) {
    reqPrefix = arg.split('=')[1];
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

// Read the enhanced template
const templatePath = path.join('src', 'test', 'templates', 'enhanced-test.template.ts');
if (!fs.existsSync(templatePath)) {
  console.error(`Error: Enhanced template file not found: ${templatePath}`);
  process.exit(1);
}

let template = fs.readFileSync(templatePath, 'utf8');

// Generate the class name from the module path
const moduleParts = moduleBaseName.split('.');
const className = moduleParts[0].charAt(0).toUpperCase() + moduleParts[0].slice(1);

// If no requirement prefix is provided, use the class name
if (!reqPrefix) {
  reqPrefix = className.toUpperCase();
}

// Replace placeholders in the template
template = template.replace('Your Test Suite Name', `${className} Test Suite`);
template = template.replace('// import { YourClass } from \'../../path/to/your/module\';', 
  `import { ${className} } from '../../${modulePath.replace(/^src\//, '')}';`);

// Replace requirement and test tags
template = template.replace(/REQ-XXX-YYY/g, `REQ-${reqPrefix}-001`);
template = template.replace(/TEST-XXX-YYY/g, `TEST-${reqPrefix}-001`);

// Add specific test cases based on the module type
if (modulePath.includes('mcp')) {
  // Add MCP-specific test cases
  const mcpTests = `
  // TEST-${reqPrefix}-001: Test that the client can connect to an MCP server successfully
  test('connect() should return true when server is available', async () => {
    // Arrange
    // TODO: Set up test

    // Act
    // const result = await instance.connect();

    // Assert
    // assert.strictEqual(result, true);
  });

  // TEST-${reqPrefix}-001a: Test that the client handles connection errors gracefully
  test('connect() should return false when server is not available', async () => {
    // Arrange
    // TODO: Set up test

    // Act
    // const result = await instance.connect();

    // Assert
    // assert.strictEqual(result, false);
  });`;

  // Add before the last closing brace
  template = template.replace(/}\s*$/, mcpTests + '\n});\n');
} else if (modulePath.includes('memory')) {
  // Add memory-specific test cases
  const memoryTests = `
  // TEST-${reqPrefix}-001: Test that the client can connect to a memory server
  test('connect() should call MCP client connect method', async () => {
    // Arrange
    // TODO: Set up test

    // Act
    // const result = await instance.connect();

    // Assert
    // assert.strictEqual(result, true);
  });

  // TEST-${reqPrefix}-002: Test that the client can search nodes
  test('searchNodes() should call MCP client with correct parameters', async () => {
    // Arrange
    // TODO: Set up test

    // Act
    // const result = await instance.searchNodes('query');

    // Assert
    // assert.strictEqual(result.status, 'success');
  });`;

  // Add before the last closing brace
  template = template.replace(/}\s*$/, memoryTests + '\n});\n');
}

// Write the test file
fs.writeFileSync(testFilePath, template);

console.log(`Created enhanced test file: ${testFilePath}`);

// Add a new script to package.json if it doesn't exist
const packageJsonPath = path.join('package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts['create:enhanced-test']) {
    packageJson.scripts['create:enhanced-test'] = 'node scripts/create-enhanced-test.js';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Added create:enhanced-test script to package.json');
  }
}
