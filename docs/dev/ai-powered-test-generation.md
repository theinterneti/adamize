# AI-Powered Test Generation

This document describes the AI-powered test generation feature for the Adamize project, which uses local LLMs to generate more intelligent tests.

## Overview

AI-powered test generation builds on the procedural test generation feature by adding AI capabilities to:

1. **Understand Code**: Better understand the purpose and behavior of code
2. **Generate Edge Cases**: Identify potential edge cases and generate tests for them
3. **Improve Assertions**: Generate more specific and meaningful assertions
4. **Maintain Tests**: Update tests when code changes

## Components

### AI Test Generator

The AI test generator uses the LLM client to generate tests based on code analysis:

```typescript
/**
 * Generate AI-powered tests for a file
 * @param filePath Path to the file
 * @param llmClient LLM client
 * @returns Generated tests
 */
async function generateAITests(filePath: string, llmClient: LLMClient): Promise<string> {
  // Analyze the code
  const codeAnalysis = analyzeCode(filePath);
  
  // Generate a prompt for the LLM
  const prompt = generatePrompt(codeAnalysis);
  
  // Send the prompt to the LLM
  const response = await llmClient.sendPrompt(prompt);
  
  // Parse the response
  const tests = parseResponse(response);
  
  return tests;
}
```

### AI Templates

AI-powered test generation uses special templates that include placeholders for AI-generated content:

```json
{
  "ai-assisted": {
    "name": "AI-Assisted Test Template",
    "description": "Template for AI-assisted test generation",
    "extends": "enhanced",
    "testTemplate": "  /**\n   * {{testTag}}: Test that {{functionName}}() works correctly\n   * \n   * @function {{functionName}}\n   * @param {{{parameterList}}} Parameters\n   * @returns {{{returnType}}} Return value\n   * @ai_description {{aiDescription}}\n   */\n  test('{{functionName.camelCase}}() should work correctly', {{asyncPrefix}}() => {\n    // Arrange\n    {{mocks}}\n\n    // Act\n    {{actCode}}\n\n    // Assert\n    {{assertion}}\n    \n    {{aiGeneratedAssertions}}\n  });\n"
  }
}
```

### LLM Integration

The AI test generator integrates with local LLMs through the MCP bridge:

```typescript
/**
 * Generate AI-powered tests using the MCP bridge
 * @param filePath Path to the file
 * @param mcpBridge MCP bridge
 * @returns Generated tests
 */
async function generateAITestsWithMCP(filePath: string, mcpBridge: MCPBridge): Promise<string> {
  // Analyze the code
  const codeAnalysis = analyzeCode(filePath);
  
  // Generate a prompt for the LLM
  const prompt = generatePrompt(codeAnalysis);
  
  // Send the prompt to the LLM through the MCP bridge
  const response = await mcpBridge.sendPrompt(prompt);
  
  // Parse the response
  const tests = parseResponse(response);
  
  return tests;
}
```

## Implementation

### Code Analysis

The code analysis component extracts information from the code to help the LLM understand it:

```typescript
/**
 * Analyze code to extract information for the LLM
 * @param filePath Path to the file
 * @returns Code analysis
 */
function analyzeCode(filePath: string): CodeAnalysis {
  // Parse the code
  const sourceFile = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  
  // Extract classes, methods, functions, etc.
  const classes = extractClasses(sourceFile);
  const functions = extractFunctions(sourceFile);
  const imports = extractImports(sourceFile);
  const exports = extractExports(sourceFile);
  const comments = extractComments(sourceFile);
  
  return {
    classes,
    functions,
    imports,
    exports,
    comments
  };
}
```

### Prompt Generation

The prompt generation component creates a prompt for the LLM based on the code analysis:

```typescript
/**
 * Generate a prompt for the LLM
 * @param codeAnalysis Code analysis
 * @returns Prompt for the LLM
 */
function generatePrompt(codeAnalysis: CodeAnalysis): string {
  return `
You are an expert test engineer. Your task is to generate tests for the following code:

${formatCodeForPrompt(codeAnalysis)}

Please generate tests that:
1. Test the functionality of each method and function
2. Test edge cases and error handling
3. Use meaningful assertions
4. Follow the project's testing style

For each test, provide:
1. A description of what the test is checking
2. The test code
3. Explanations for any complex assertions or setup
`;
}
```

### Response Parsing

The response parsing component extracts the generated tests from the LLM response:

```typescript
/**
 * Parse the LLM response to extract tests
 * @param response LLM response
 * @returns Extracted tests
 */
function parseResponse(response: string): string {
  // Extract test descriptions
  const descriptions = extractTestDescriptions(response);
  
  // Extract test code
  const testCode = extractTestCode(response);
  
  // Extract explanations
  const explanations = extractExplanations(response);
  
  // Combine into a structured format
  return formatTests(descriptions, testCode, explanations);
}
```

## Usage

To use AI-powered test generation:

```bash
npm run generate:ai-tests src/mcp/mcpClient.ts
```

Or from VS Code:

1. Open the command palette (Ctrl+Shift+P)
2. Select "Adamize: Generate AI-Powered Tests"
3. Select the file to generate tests for

## Configuration

AI-powered test generation can be configured in the VS Code settings:

```json
{
  "adamize.aiTestGeneration": {
    "enabled": true,
    "llmProvider": "ollama",
    "llmModel": "codellama:7b",
    "llmEndpoint": "http://localhost:11434/api/generate",
    "temperature": 0.7,
    "maxTokens": 2000,
    "promptTemplate": "templates/ai-prompts/test-generation.txt"
  }
}
```

## Future Improvements

1. **Interactive Test Generation**: Allow users to interactively refine the generated tests
2. **Test Improvement Suggestions**: Analyze existing tests and suggest improvements
3. **Natural Language Requirements**: Allow users to specify requirements in natural language
4. **Test Documentation**: Generate better test documentation
5. **Test Maintenance**: Update tests when the source code changes
