# Enhanced Template System

This document describes the enhanced template system for the Adamize project, which provides more flexibility and power for generating tests.

## Overview

The enhanced template system builds on the existing template system with the following new features:

1. **More Template Variables**: Additional variables for more flexible templates
2. **Variable Transformations**: Support for transforming variables (camelCase, pascalCase, etc.)
3. **Conditional Blocks**: Support for conditional content based on variable values
4. **Template Inheritance**: Support for templates that extend other templates
5. **Custom Template Directories**: Support for loading templates from custom directories

## Template Structure

Templates are defined in JSON files with the following structure:

```json
{
  "templateName": {
    "name": "Template Name",
    "description": "Template description",
    "extends": "parentTemplateName",
    "fileTemplate": "...",
    "testTemplate": "...",
    "errorTestTemplate": "...",
    "classTestTemplate": "...",
    "methodTestTemplate": "...",
    "methodErrorTestTemplate": "...",
    "edgeCaseTestTemplate": "...",
    "methodEdgeCaseTestTemplate": "..."
  },
  "config": {
    "customTemplateDirectories": [
      ".vscode/templates",
      "templates/custom"
    ],
    "defaultTemplate": "tdd",
    "variableTransformers": {
      "camelCase": "function(str) { return str.charAt(0).toLowerCase() + str.slice(1); }",
      "pascalCase": "function(str) { return str.charAt(0).toUpperCase() + str.slice(1); }",
      "snakeCase": "function(str) { return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).toLowerCase(); }",
      "kebabCase": "function(str) { return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).toLowerCase(); }"
    }
  }
}
```

## Template Variables

The enhanced template system supports the following variables:

### Basic Variables

- `{{testTag}}`: The test tag (e.g., TEST-MCP-001)
- `{{className}}`: The class name
- `{{methodName}}`: The method name
- `{{functionName}}`: The function name
- `{{asyncPrefix}}`: The async prefix (e.g., "async " or "")
- `{{mocks}}`: The mocks for the test
- `{{actCode}}`: The code to execute in the test
- `{{assertion}}`: The assertion for the test
- `{{imports}}`: The imports for the test file
- `{{suiteName}}`: The test suite name
- `{{setupVars}}`: The setup variables
- `{{setupCode}}`: The setup code
- `{{tests}}`: The tests
- `{{fileName}}`: The source file name
- `{{moduleName}}`: The source module name

### Advanced Variables

- `{{parameterList}}`: The list of parameters with types
- `{{returnType}}`: The return type of the method or function
- `{{hasErrorHandling}}`: Whether the method or function has error handling
- `{{errorSetup}}`: The error setup code
- `{{assertCode}}`: The assertion code for error tests
- `{{edgeCaseDescription}}`: The description of the edge case
- `{{edgeCaseMocks}}`: The mocks for the edge case test
- `{{edgeCaseActCode}}`: The code to execute in the edge case test
- `{{edgeCaseAssertion}}`: The assertion for the edge case test
- `{{aiDescription}}`: The AI-generated description of the function or method
- `{{aiErrorDescription}}`: The AI-generated description of error handling
- `{{aiGeneratedAssertions}}`: The AI-generated assertions
- `{{aiGeneratedErrorAssertions}}`: The AI-generated error assertions

### Transformed Variables

You can transform variables using the following syntax:

```
{{variableName.transformer}}
```

For example:

- `{{className.camelCase}}`: The class name in camelCase
- `{{methodName.pascalCase}}`: The method name in PascalCase
- `{{functionName.snakeCase}}`: The function name in snake_case
- `{{className.kebabCase}}`: The class name in kebab-case

## Conditional Blocks

You can include conditional content using the following syntax:

```
{{#if condition}}
  Content to include if condition is true
{{/if}}
```

For example:

```
{{#if returnType !== 'void'}}
  // Additional assertions for specific return type
{{/if}}
```

Conditions can be:

- Simple variable checks: `{{#if hasErrorHandling}}`
- Comparisons: `{{#if returnType !== 'void'}}`

## Template Inheritance

Templates can extend other templates using the `extends` property. When a template extends another template, it inherits all properties from the parent template, but can override specific properties.

For example:

```json
{
  "enhanced": {
    "name": "Enhanced Test Template",
    "description": "Enhanced test template with advanced variable support",
    "extends": "tdd",
    "testTemplate": "...",
    "errorTestTemplate": "..."
  }
}
```

In this example, the `enhanced` template extends the `tdd` template, inheriting all properties except `testTemplate` and `errorTestTemplate`, which it overrides.

## Custom Template Directories

You can specify custom directories for templates in the `config` section:

```json
{
  "config": {
    "customTemplateDirectories": [
      ".vscode/templates",
      "templates/custom"
    ]
  }
}
```

Templates in custom directories will be merged with the main templates, with custom templates taking precedence.

## Usage

To use the enhanced template system, specify the template name when generating tests:

```bash
npm run generate:tests src/mcp/mcpClient.ts --template=enhanced
```

You can also set the default template in the `config` section:

```json
{
  "config": {
    "defaultTemplate": "enhanced"
  }
}
```

## Examples

### Basic Template

```json
{
  "default": {
    "name": "Default Test Template",
    "description": "Default test template for TypeScript files",
    "fileTemplate": "import * as assert from 'assert';\nimport * as sinon from 'sinon';\nimport * as vscode from 'vscode';\n{{imports}}\n\nsuite('{{suiteName}}', () => {\n  // Stubs and mocks\n  {{setupVars}}\n  \n  // Setup before each test\n  setup(() => {\n    {{setupCode}}\n  });\n  \n  // Teardown after each test\n  teardown(() => {\n    // Restore all stubs\n    sinon.restore();\n  });\n\n  {{tests}}\n});\n",
    "testTemplate": "  // {{testTag}}: Test that {{functionName}}() works correctly\n  test('{{functionName}}() should work correctly', {{asyncPrefix}}() => {\n    // Arrange\n    {{mocks}}\n\n    // Act\n    {{actCode}}\n\n    // Assert\n    {{assertion}}\n  });\n"
  }
}
```

### Enhanced Template

```json
{
  "enhanced": {
    "name": "Enhanced Test Template",
    "description": "Enhanced test template with advanced variable support",
    "extends": "tdd",
    "testTemplate": "  /**\n   * {{testTag}}: Test that {{functionName}}() works correctly\n   * \n   * @function {{functionName}}\n   * @param {{{parameterList}}} Parameters\n   * @returns {{{returnType}}} Return value\n   */\n  test('{{functionName.camelCase}}() should work correctly', {{asyncPrefix}}() => {\n    // Arrange\n    {{mocks}}\n\n    // Act\n    {{actCode}}\n\n    // Assert\n    {{assertion}}\n    \n    {{#if returnType !== 'void'}}\n    // Additional assertions for specific return type\n    {{/if}}\n  });\n"
  }
}
```

## Implementation Details

The enhanced template system is implemented in the `scripts/generate-tests.js` file. The key components are:

1. **Template Loading**: Templates are loaded from the main template file and custom directories
2. **Template Inheritance**: Templates can extend other templates
3. **Variable Transformers**: Functions for transforming variables
4. **Template Processing**: Functions for processing templates with variable replacements and conditional blocks

See the code for more details.
