# Test Generation Features

This document describes the test generation features in the Adamize project.

## Overview

Adamize provides several test generation features to help you write tests for your code:

1. **Procedural Test Generation**: Generate tests based on source code analysis
2. **Coverage-Based Test Generation**: Generate tests based on coverage data
3. **AI-Powered Test Generation**: Generate tests using AI assistance
4. **Enhanced Template System**: Customize test templates with advanced features

## Procedural Test Generation

Procedural test generation analyzes your TypeScript files to identify classes, methods, and functions, then generates tests for them.

### Usage

From the command line:

```bash
npm run generate:tests src/path/to/file.ts
```

From VS Code:

1. Open the command palette (Ctrl+Shift+P)
2. Select "Adamize: Generate Tests"
3. Select the file to generate tests for

Or:

1. Right-click on a TypeScript file in the editor
2. Select "Adamize: Generate Tests for Current File"

### Options

- `--template=<template-name>`: Specify the template to use (default, jest, tdd, enhanced, ai-assisted)
- `--item=<item-name>`: Generate tests only for the specified class, method, or function

## Coverage-Based Test Generation

Coverage-based test generation analyzes coverage data to identify uncovered code, then generates tests for it.

### Usage

From the command line:

```bash
npm run test:coverage
npm run generate:coverage-tests
```

From VS Code:

1. Open the command palette (Ctrl+Shift+P)
2. Select "Adamize: Generate Tests Based on Coverage"

### Options

- `--threshold=<coverage-threshold>`: Specify the coverage threshold (default: 60)

## AI-Powered Test Generation

AI-powered test generation uses local LLMs to generate more intelligent tests with better assertions and edge cases.

### Usage

From the command line:

```bash
npm run generate:ai-tests src/path/to/file.ts
```

From VS Code:

1. Open the command palette (Ctrl+Shift+P)
2. Select "Adamize: Generate AI-Powered Tests"
3. Select the file to generate tests for
4. Select the LLM model to use

Or:

1. Right-click on a TypeScript file in the editor
2. Select "Adamize: Generate AI-Powered Tests for Current File"

### Options

- `--model=<model-name>`: Specify the LLM model to use (default: codellama:7b)
- `--provider=<provider>`: Specify the LLM provider to use (default: ollama)
- `--endpoint=<endpoint>`: Specify the LLM endpoint to use (default: http://localhost:11434/api/generate)

### Requirements

- Ollama installed and running
- CodeLlama model downloaded (`ollama pull codellama:7b`)

## Enhanced Template System

The enhanced template system provides more flexibility and power for generating tests.

### Features

- **More Template Variables**: Additional variables for more flexible templates
- **Variable Transformations**: Support for transforming variables (camelCase, pascalCase, etc.)
- **Conditional Blocks**: Support for conditional content based on variable values
- **Template Inheritance**: Support for templates that extend other templates
- **Custom Template Directories**: Support for loading templates from custom directories

### Usage

Specify the template to use when generating tests:

```bash
npm run generate:tests src/path/to/file.ts --template=enhanced
```

### Custom Templates

You can create custom templates in the following locations:

- `templates/custom/test-templates.json`
- `.vscode/templates/test-templates.json`

See [Enhanced Template System](../dev/enhanced-template-system.md) for more details.

## Integration with VS Code

Adamize integrates with VS Code to provide a seamless test generation experience:

- **Commands**: Generate tests from the command palette
- **Context Menu**: Generate tests from the editor context menu
- **Coverage Visualization**: Visualize coverage data in the editor
- **Quick Fix Actions**: Generate tests for uncovered code with a click

## Configuration

You can configure the test generation features in the VS Code settings:

```json
{
  "adamize.testGeneration": {
    "defaultTemplate": "enhanced",
    "coverageThreshold": 80,
    "aiTestGeneration": {
      "enabled": true,
      "defaultModel": "codellama:7b",
      "defaultProvider": "ollama",
      "endpoint": "http://localhost:11434/api/generate"
    }
  }
}
```

## Best Practices

1. **Start with Procedural Test Generation**: Generate basic tests for your code
2. **Use Coverage-Based Test Generation**: Identify and fill coverage gaps
3. **Use AI-Powered Test Generation**: Generate more intelligent tests with better assertions and edge cases
4. **Customize Templates**: Create custom templates for your project's needs
5. **Review and Enhance**: Always review and enhance generated tests
