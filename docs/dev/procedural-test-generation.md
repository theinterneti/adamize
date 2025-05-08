# Procedural Test Generation

This document describes the procedural test generation feature for the Adamize project, which automatically generates tests based on source code analysis.

## Overview

Procedural test generation is both a development tool and a user-facing feature of the Adamize extension. It analyzes TypeScript files to identify public methods, properties, and requirement tags, then generates test files with appropriate test tags linked to requirement tags.

The feature follows a hybrid approach:
1. Generate test skeletons automatically
2. Enhance tests manually with specific assertions and edge cases
3. Iteratively improve the generator based on feedback

## Components

### Test Generator Script

The basic test generator script (`scripts/generate-tests.js`) parses TypeScript files and generates test files:

```bash
npm run generate:tests <filepath>
```

Features:
- Parses TypeScript files using the TypeScript compiler API
- Extracts methods, classes, and requirement tags from source files
- Generates test content based on templates and extracted information
- Creates test files with appropriate test tags linked to requirement tags

### Coverage-Based Test Generator

The advanced coverage-based test generator (`scripts/generate-coverage-tests.js`) uses coverage data to identify untested code:

```bash
npm run generate:coverage-tests
```

Features:
- Loads coverage data from Istanbul/NYC reports
- Identifies files with low coverage and specific uncovered lines and functions
- Generates targeted tests for uncovered code
- Prioritizes files with the lowest coverage

## Implementation Details

### Source Code Analysis

The test generator analyzes source code to extract:

1. **Classes and Methods**: Identifies public methods, their parameters, and return types
2. **Requirement Tags**: Extracts REQ-XXX-YYY tags from JSDoc comments
3. **Dependencies**: Identifies dependencies that need to be mocked
4. **Error Handling**: Identifies potential error conditions

Example source code analysis:

```typescript
/**
 * Connect to the MCP server
 * @implements REQ-MCP-001 Connect to an MCP server
 * @returns True if connected successfully
 */
public async connect(): Promise<boolean> {
  try {
    // Implementation
    return true;
  } catch (error) {
    // Error handling
    return false;
  }
}
```

From this, the generator extracts:
- Method name: `connect`
- Return type: `Promise<boolean>`
- Requirement tag: `REQ-MCP-001`
- Error handling: Yes

### Test Generation

Based on the analysis, the generator creates test files with:

1. **Test Suite**: Creates a test suite for the class or module
2. **Test Cases**: Creates test cases for each public method
3. **Test Tags**: Links test tags to requirement tags
4. **Mocks**: Sets up mocks for dependencies
5. **Error Tests**: Creates tests for error conditions

Example generated test:

```typescript
/**
 * MCP Client Tests
 *
 * Tests for the MCP client implementation.
 *
 * @implements TEST-MCP-001 Test that the client can connect to an MCP server
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import axios from 'axios';
import { MCPClient } from '../../../mcp/mcpClient';

suite('MCP Client Test Suite', () => {
  // Stubs and mocks
  let axiosGetStub: sinon.SinonStub;

  // Setup before each test
  setup(() => {
    // Create stubs
    axiosGetStub = sinon.stub(axios, 'get');
  });

  // Teardown after each test
  teardown(() => {
    // Restore stubs
    sinon.restore();
  });

  // TEST-MCP-001: Test that the client can connect to an MCP server
  test('connect() should return true when server is available', async () => {
    // Arrange
    axiosGetStub.resolves({ status: 200, data: {} });
    const client = new MCPClient('http://localhost:8000');

    // Act
    const result = await client.connect();

    // Assert
    assert.strictEqual(result, true);
    assert.strictEqual(axiosGetStub.calledOnce, true);
  });

  // TEST-MCP-001a: Test that the client handles connection errors
  test('connect() should return false when server is unavailable', async () => {
    // Arrange
    axiosGetStub.rejects(new Error('Connection refused'));
    const client = new MCPClient('http://localhost:8000');

    // Act
    const result = await client.connect();

    // Assert
    assert.strictEqual(result, false);
    assert.strictEqual(axiosGetStub.calledOnce, true);
  });
});
```

### Coverage Analysis

The coverage-based generator analyzes coverage reports to identify:

1. **Uncovered Files**: Files with low overall coverage
2. **Uncovered Lines**: Specific lines that are not covered by tests
3. **Uncovered Branches**: Conditional branches that are not tested
4. **Uncovered Functions**: Functions that are not called in tests

It then generates targeted tests for the uncovered code.

### Coverage Visualization

The procedural test generation feature includes coverage visualization in the editor, which highlights uncovered code:

1. **Statement Coverage**: Highlights uncovered statements with a red background
2. **Function Coverage**: Highlights uncovered functions with an orange background
3. **Branch Coverage**: Highlights uncovered branches with a yellow background

The visualization is implemented in `src/ui/coverageVisualizationProvider.ts` and uses Jest coverage data from the coverage directory.

To use the coverage visualization:

1. Run tests with coverage: `npm run test:jest:coverage`
2. Load coverage data: `Adamize: Load Coverage Data`
3. View uncovered code in the editor
4. Generate tests for uncovered code: `Adamize: Generate Test for Uncovered Code`

## Integration with VS Code Extension

The procedural test generation feature is now integrated into the Adamize VS Code extension with the following components:

1. **Test Generation Commands**: Commands to generate tests for files and selections
2. **Coverage Visualization**: Decorations to show coverage gaps in the editor
3. **Quick Fix Actions**: Generate tests for uncovered methods with a click
4. **Test Template Management**: Support for customizing test templates

## Usage

### Basic Test Generation

To generate tests for a specific file:

```bash
npm run generate:tests src/mcp/mcpClient.ts [--template=<template-name>] [--item=<item-name>]
```

Options:
- `--template=<template-name>`: Specify the template to use (default, jest, tdd)
- `--item=<item-name>`: Generate tests only for the specified class, method, or function

### Coverage-Based Test Generation

To generate tests based on coverage data:

```bash
npm run test:jest:coverage
npm run generate:coverage-tests
```

### VS Code Commands

The following commands are available in the VS Code command palette:

- `Adamize: Generate Tests`: Open a quick pick to select a file to generate tests for
- `Adamize: Generate Tests for Current File`: Generate tests for the current file
- `Adamize: Generate Tests Based on Coverage`: Generate tests based on coverage data
- `Adamize: Generate Test for Selection`: Generate a test for the selected code
- `Adamize: Load Coverage Data`: Load coverage data for visualization
- `Adamize: Clear Coverage Data`: Clear coverage visualization
- `Adamize: Generate Test for Uncovered Code`: Generate a test for uncovered code

These commands are also available in the editor context menu when editing TypeScript files.

## Template Customization

The procedural test generation feature supports template customization through a JSON-based template system.

### Template Structure

Templates are stored in `templates/test-templates.json` and have the following structure:

```json
{
  "default": {
    "name": "Default Test Template",
    "description": "Default test template for TypeScript files",
    "fileTemplate": "...",
    "testTemplate": "...",
    "errorTestTemplate": "...",
    "classTestTemplate": "...",
    "methodTestTemplate": "...",
    "methodErrorTestTemplate": "..."
  }
}
```

### Template Variables

Templates use variables that are replaced with actual values during test generation:

- `{{imports}}`: Import statements
- `{{suiteName}}`: Test suite name
- `{{setupVars}}`: Setup variables
- `{{setupCode}}`: Setup code
- `{{tests}}`: Test cases
- `{{fileName}}`: Source file name
- `{{moduleName}}`: Module name
- `{{testTag}}`: Test tag
- `{{functionName}}`: Function name
- `{{className}}`: Class name
- `{{methodName}}`: Method name
- `{{asyncPrefix}}`: Async prefix
- `{{mocks}}`: Mock objects
- `{{actCode}}`: Act code
- `{{assertion}}`: Assertion code
- `{{errorSetup}}`: Error setup code
- `{{assertCode}}`: Assert code

### Available Templates

- `default`: Default template for VS Code extension development
- `jest`: Template for Jest tests
- `tdd`: Template for Test-Driven Development

## Best Practices

1. **Review Generated Tests**: Always review and enhance generated tests
2. **Add Edge Cases**: Add tests for edge cases that the generator might miss
3. **Maintain Test Quality**: Ensure tests follow the project's testing guidelines
4. **Update Templates**: Improve test templates based on experience
5. **Contribute Improvements**: Suggest improvements to the generator

## Future Improvements

1. **Enhanced Template System**: Add more template variables and support for custom template directories
2. **Better Coverage Visualization**: Improve the visualization with more detailed information about coverage
3. **Integration with CI/CD**: Automatically generate tests as part of the CI/CD pipeline
4. **AI-Powered Test Generation**: Integrate with AI services to generate more intelligent tests
5. **Test Maintenance**: Add tools for updating tests when the source code changes
6. **Smarter Analysis**: Improve source code analysis to better understand code semantics
7. **Better Mocking**: Generate more realistic mocks based on actual usage
8. **Test Data Generation**: Generate realistic test data for parameters
9. **Integration Tests**: Generate integration tests in addition to unit tests
10. **Cross-File Analysis**: Analyze dependencies across files for more comprehensive tests
