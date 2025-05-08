#!/usr/bin/env node

/**
 * Generate AI-Powered Tests Script
 *
 * This script generates tests using AI assistance.
 * It analyzes TypeScript files to identify public methods, properties, and requirement tags,
 * then uses an LLM to generate tests with appropriate assertions and edge cases.
 *
 * Usage:
 *   node scripts/generate-ai-tests.js <source-file-path> [--model=<model-name>] [--provider=<provider>]
 *
 * Example:
 *   node scripts/generate-ai-tests.js src/mcp/mcpClient.ts
 *   node scripts/generate-ai-tests.js src/mcp/mcpClient.ts --model=codellama:7b --provider=ollama
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { execSync } = require('child_process');
const fetch = require('node-fetch');

// Parse command line arguments
const args = process.argv.slice(2);
let sourceFilePath = '';
let modelName = 'codellama:7b';
let provider = 'ollama';
let endpoint = 'http://localhost:11434/api/generate';

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg.startsWith('--')) {
    // Handle options
    if (arg.startsWith('--model=')) {
      modelName = arg.split('=')[1];
    } else if (arg.startsWith('--provider=')) {
      provider = arg.split('=')[1];
    } else if (arg.startsWith('--endpoint=')) {
      endpoint = arg.split('=')[1];
    }
  } else {
    // Assume it's the file path
    sourceFilePath = arg;
  }
}

if (!sourceFilePath) {
  console.error('Please provide a source file path');
  process.exit(1);
}

// Ensure the source file exists
if (!fs.existsSync(sourceFilePath)) {
  console.error(`Source file not found: ${sourceFilePath}`);
  process.exit(1);
}

// Determine the test file path
const sourceFileName = path.basename(sourceFilePath, '.ts');
const sourceDir = path.dirname(sourceFilePath);
const relativePath = path.relative('src', sourceDir);
const testDir = path.join('src/test/suite', relativePath);
const testFilePath = path.join(testDir, `${sourceFileName}.test.ts`);

// Create the test directory if it doesn't exist
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Read the source file
const sourceCode = fs.readFileSync(sourceFilePath, 'utf8');

// Parse the source file
const sourceFile = ts.createSourceFile(
  sourceFilePath,
  sourceCode,
  ts.ScriptTarget.Latest,
  true
);

// Extract class and method information
const classes = [];
const functions = [];
const requirementTags = [];

// Function to extract JSDoc comments
function getJSDocComments(node) {
  const comments = [];
  const nodePos = node.pos;

  // Get the source text from the start of the file to the node position
  const sourceText = sourceCode.substring(0, nodePos);

  // Find the last comment block before the node
  const commentRegex = /\/\*\*[\s\S]*?\*\//g;
  let match;

  while ((match = commentRegex.exec(sourceText)) !== null) {
    if (match.index + match[0].length >= nodePos - 10) {
      comments.push(match[0]);
    }
  }

  return comments;
}

// Function to extract requirement tags from JSDoc comments
function extractRequirementTags(comments) {
  const tags = [];

  comments.forEach(comment => {
    const reqTagRegex = /@implements\s+REQ-([A-Z0-9-]+)/g;
    let match;

    while ((match = reqTagRegex.exec(comment)) !== null) {
      tags.push(match[1]);
    }
  });

  return tags;
}

// Visit each node in the source file
function visit(node) {
  // Check for classes
  if (ts.isClassDeclaration(node) && node.name) {
    const className = node.name.text;
    const classComments = getJSDocComments(node);
    const classTags = extractRequirementTags(classComments);

    const methods = [];

    // Extract class methods
    node.members.forEach(member => {
      if (ts.isMethodDeclaration(member) && member.name) {
        const methodName = member.name.text;
        const methodComments = getJSDocComments(member);
        const methodTags = extractRequirementTags(methodComments);

        // Only include public methods
        if (!member.modifiers || !member.modifiers.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)) {
          methods.push({
            name: methodName,
            requirementTags: methodTags,
            parameters: member.parameters.map(p => ({
              name: p.name.text,
              type: p.type ? sourceCode.substring(p.type.pos, p.type.end) : 'any'
            })),
            returnType: member.type ? sourceCode.substring(member.type.pos, member.type.end) : 'void',
            isAsync: member.modifiers && member.modifiers.some(m => m.kind === ts.SyntaxKind.AsyncKeyword),
            body: member.body ? sourceCode.substring(member.body.pos, member.body.end) : ''
          });

          // Add method tags to the global list
          methodTags.forEach(tag => {
            if (!requirementTags.includes(tag)) {
              requirementTags.push(tag);
            }
          });
        }
      }
    });

    classes.push({
      name: className,
      requirementTags: classTags,
      methods
    });

    // Add class tags to the global list
    classTags.forEach(tag => {
      if (!requirementTags.includes(tag)) {
        requirementTags.push(tag);
      }
    });
  }

  // Check for functions
  if (ts.isFunctionDeclaration(node) && node.name) {
    const functionName = node.name.text;
    const functionComments = getJSDocComments(node);
    const functionTags = extractRequirementTags(functionComments);

    functions.push({
      name: functionName,
      requirementTags: functionTags,
      parameters: node.parameters.map(p => ({
        name: p.name.text,
        type: p.type ? sourceCode.substring(p.type.pos, p.type.end) : 'any'
      })),
      returnType: node.type ? sourceCode.substring(node.type.pos, node.type.end) : 'void',
      isAsync: node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.AsyncKeyword),
      body: node.body ? sourceCode.substring(node.body.pos, node.body.end) : ''
    });

    // Add function tags to the global list
    functionTags.forEach(tag => {
      if (!requirementTags.includes(tag)) {
        requirementTags.push(tag);
      }
    });
  }

  // Visit child nodes
  ts.forEachChild(node, visit);
}

// Start the visit
visit(sourceFile);

// Generate a prompt for the LLM
function generatePrompt() {
  let prompt = `You are an expert test engineer. Your task is to generate tests for the following TypeScript code:

\`\`\`typescript
${sourceCode}
\`\`\`

I need you to generate tests for the following:

`;

  // Add classes and methods
  classes.forEach(cls => {
    prompt += `Class: ${cls.name}\n`;
    cls.methods.forEach(method => {
      prompt += `  Method: ${method.name}\n`;
      prompt += `    Parameters: ${method.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}\n`;
      prompt += `    Return Type: ${method.returnType}\n`;
      prompt += `    Is Async: ${method.isAsync}\n`;
    });
  });

  // Add functions
  functions.forEach(func => {
    prompt += `Function: ${func.name}\n`;
    prompt += `  Parameters: ${func.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}\n`;
    prompt += `  Return Type: ${func.returnType}\n`;
    prompt += `  Is Async: ${func.isAsync}\n`;
  });

  prompt += `
For each class, method, and function, please provide:

1. A description of what it does
2. Test cases that cover normal operation
3. Test cases that cover edge cases
4. Test cases that cover error handling

For each test case, provide:
1. A description of what the test is checking
2. The test code with appropriate assertions
3. Explanations for any complex assertions or setup

Please format your response as JSON with the following structure:

\`\`\`json
{
  "classes": [
    {
      "name": "ClassName",
      "description": "Description of the class",
      "methods": [
        {
          "name": "methodName",
          "description": "Description of the method",
          "tests": [
            {
              "type": "normal",
              "description": "Description of the test",
              "code": "test code here",
              "explanation": "Explanation of the test"
            },
            {
              "type": "edge",
              "description": "Description of the edge case test",
              "code": "test code here",
              "explanation": "Explanation of the test"
            },
            {
              "type": "error",
              "description": "Description of the error handling test",
              "code": "test code here",
              "explanation": "Explanation of the test"
            }
          ]
        }
      ]
    }
  ],
  "functions": [
    {
      "name": "functionName",
      "description": "Description of the function",
      "tests": [
        {
          "type": "normal",
          "description": "Description of the test",
          "code": "test code here",
          "explanation": "Explanation of the test"
        },
        {
          "type": "edge",
          "description": "Description of the edge case test",
          "code": "test code here",
          "explanation": "Explanation of the test"
        },
        {
          "type": "error",
          "description": "Description of the error handling test",
          "code": "test code here",
          "explanation": "Explanation of the test"
        }
      ]
    }
  ]
}
\`\`\`
`;

  return prompt;
}

// Send the prompt to the LLM
async function sendPromptToLLM(prompt) {
  console.log(`Sending prompt to ${provider} (${modelName})...`);

  try {
    let response;

    if (provider === 'ollama') {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: false
        })
      });

      const data = await response.json();
      return data.response;
    } else {
      console.error(`Unsupported provider: ${provider}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error sending prompt to LLM: ${error.message}`);
    process.exit(1);
  }
}

// Generate tests using the LLM
async function generateTests() {
  const prompt = generatePrompt();
  const response = await sendPromptToLLM(prompt);

  try {
    // Extract JSON from the response
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
    
    if (!jsonMatch) {
      console.error('Could not extract JSON from LLM response');
      console.log('Response:', response);
      process.exit(1);
    }

    const jsonStr = jsonMatch[1];
    const testData = JSON.parse(jsonStr);

    // Generate test file content
    let testContent = `/**
 * AI-Generated Tests for ${sourceFileName}
 *
 * These tests were generated using AI assistance.
 * Please review and modify as needed.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
`;

    // Add import for the module being tested
    const relativeSrcPath = path.relative('src/test/suite', 'src');
    const relativeModulePath = path.join(relativeSrcPath, relativePath, sourceFileName);

    // Extract exported items
    const exportedItems = [];
    testData.classes.forEach(cls => {
      exportedItems.push(cls.name);
    });
    testData.functions.forEach(func => {
      exportedItems.push(func.name);
    });

    if (exportedItems.length > 0) {
      testContent += `import { ${exportedItems.join(', ')} } from '${relativeModulePath.replace(/\\/g, '/')}';\n\n`;
    } else {
      testContent += `import * as moduleUnderTest from '${relativeModulePath.replace(/\\/g, '/')}';\n\n`;
    }

    // Add test suite
    testContent += `suite('${sourceFileName} Tests', () => {
  // Stubs and mocks
  let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;

  // Setup before each test
  setup(() => {
    // Create stubs
    outputChannelStub = sinon.createStubInstance(vscode.OutputChannel);

    // Stub VS Code window.createOutputChannel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(vscode.window, 'createOutputChannel').returns(outputChannelStub as any);
  });

  // Teardown after each test
  teardown(() => {
    // Restore all stubs
    sinon.restore();
  });

`;

    // Add tests for each class
    testData.classes.forEach(cls => {
      testContent += `  // Tests for ${cls.name} class\n`;
      testContent += `  // ${cls.description}\n\n`;

      // Add tests for each method
      cls.methods.forEach(method => {
        testContent += `  // Tests for ${cls.name}.${method.name} method\n`;
        testContent += `  // ${method.description}\n\n`;

        // Add tests
        method.tests.forEach(test => {
          testContent += `  // ${test.type.toUpperCase()} TEST: ${test.description}\n`;
          testContent += `  ${test.code}\n\n`;
        });
      });
    });

    // Add tests for each function
    testData.functions.forEach(func => {
      testContent += `  // Tests for ${func.name} function\n`;
      testContent += `  // ${func.description}\n\n`;

      // Add tests
      func.tests.forEach(test => {
        testContent += `  // ${test.type.toUpperCase()} TEST: ${test.description}\n`;
        testContent += `  ${test.code}\n\n`;
      });
    });

    testContent += '});\n';

    // Write the test file
    fs.writeFileSync(testFilePath, testContent);
    console.log(`Generated AI-powered test file: ${testFilePath}`);

    // Add a new script to package.json if it doesn't exist
    const packageJsonPath = path.join('package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      if (!packageJson.scripts['generate:ai-tests']) {
        packageJson.scripts['generate:ai-tests'] = 'node scripts/generate-ai-tests.js';
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('Added generate:ai-tests script to package.json');
      }
    }
  } catch (error) {
    console.error(`Error generating tests: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
generateTests();
