#!/usr/bin/env node

/**
 * Generate Tests Script
 *
 * This script generates test files based on source code analysis.
 * It analyzes TypeScript files to identify public methods, properties, and requirement tags,
 * then generates test files with appropriate test tags linked to requirement tags.
 *
 * Usage:
 *   node scripts/generate-tests.js <source-file-path> [--suite=<suite-name>] [--req=<requirement-prefix>]
 *
 * Example:
 *   node scripts/generate-tests.js src/mcp/mcpClient.ts
 *   node scripts/generate-tests.js src/mcp/mcpClient.ts --suite=mcp --req=MCP
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const glob = require('glob');

// Parse command line arguments
const args = process.argv.slice(2);
let sourceFilePath = '';
let suiteName = '';
let reqPrefix = '';
let templateName = 'default';
let itemFilter = '';

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg.startsWith('--')) {
    // Handle options
    if (arg.startsWith('--suite=')) {
      suiteName = arg.split('=')[1];
    } else if (arg.startsWith('--req=')) {
      reqPrefix = arg.split('=')[1];
    } else if (arg.startsWith('--template=')) {
      templateName = arg.split('=')[1];
    } else if (arg.startsWith('--item=')) {
      itemFilter = arg.split('=')[1];
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

// Load templates
const templatesPath = path.join('templates', 'test-templates.json');
let templates = {};
let config = {
  customTemplateDirectories: ['.vscode/templates', 'templates/custom'],
  defaultTemplate: 'tdd',
  variableTransformers: {
    camelCase: (str) => str.charAt(0).toLowerCase() + str.slice(1),
    pascalCase: (str) => str.charAt(0).toUpperCase() + str.slice(1),
    snakeCase: (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).toLowerCase(),
    kebabCase: (str) => str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).toLowerCase()
  }
};

// Load templates from the main templates file
if (fs.existsSync(templatesPath)) {
  try {
    const templateData = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
    templates = { ...templateData };

    // Extract config if it exists
    if (templateData.config) {
      config = { ...config, ...templateData.config };
      delete templates.config; // Remove config from templates object
    }

    console.log(`Loaded templates from ${templatesPath}`);
  } catch (error) {
    console.error(`Error loading templates: ${error.message}`);
    // Continue with default templates
  }
}

// Load templates from custom directories
if (config.customTemplateDirectories && Array.isArray(config.customTemplateDirectories)) {
  config.customTemplateDirectories.forEach(dir => {
    const customTemplatesPath = path.join(dir, 'test-templates.json');
    if (fs.existsSync(customTemplatesPath)) {
      try {
        const customTemplates = JSON.parse(fs.readFileSync(customTemplatesPath, 'utf8'));
        // Merge custom templates with existing templates (custom templates take precedence)
        templates = { ...templates, ...customTemplates };
        console.log(`Loaded custom templates from ${customTemplatesPath}`);
      } catch (error) {
        console.error(`Error loading custom templates from ${customTemplatesPath}: ${error.message}`);
      }
    }
  });
}

// Process template inheritance
Object.keys(templates).forEach(templateKey => {
  const currentTemplate = templates[templateKey];
  if (currentTemplate.extends && templates[currentTemplate.extends]) {
    const parentTemplate = templates[currentTemplate.extends];
    // Create a new template that inherits from the parent
    templates[templateKey] = {
      ...parentTemplate,
      ...currentTemplate
    };
  }
});

// Convert string function definitions to actual functions
if (config.variableTransformers) {
  Object.keys(config.variableTransformers).forEach(key => {
    if (typeof config.variableTransformers[key] === 'string') {
      try {
        // eslint-disable-next-line no-eval
        config.variableTransformers[key] = eval(`(${config.variableTransformers[key]})`);
      } catch (error) {
        console.error(`Error evaluating transformer function for ${key}: ${error.message}`);
        // Provide a default function that returns the input
        config.variableTransformers[key] = (str) => str;
      }
    }
  });
}

// Use the specified template or fall back to default
const templateToUse = templates[templateName] || templates[config.defaultTemplate] || templates.default;

// Create a deep copy of the template to avoid modifying the original
const template = JSON.parse(JSON.stringify(templateToUse)) || {
  fileTemplate: "import * as assert from 'assert';\nimport * as sinon from 'sinon';\nimport * as vscode from 'vscode';\n{{imports}}\n\nsuite('{{suiteName}}', () => {\n  {{setupVars}}\n  \n  setup(() => {\n    {{setupCode}}\n  });\n  \n  teardown(() => {\n    // Restore all stubs\n    sinon.restore();\n  });\n\n  {{tests}}\n});\n",
  testTemplate: "  test('{{functionName}}() should work correctly', {{asyncPrefix}}() => {\n    // Arrange\n    {{mocks}}\n\n    // Act\n    {{actCode}}\n\n    // Assert\n    {{assertion}}\n  });\n",
  errorTestTemplate: "  test('{{functionName}}() should handle errors gracefully', {{asyncPrefix}}() => {\n    // Arrange\n    {{errorSetup}}\n\n    // Act & Assert\n    {{assertCode}}\n  });\n"
};

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
            isAsync: member.modifiers && member.modifiers.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)
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
      isAsync: node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)
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

// If no suite name is provided, use the directory name
if (!suiteName) {
  suiteName = path.basename(sourceDir);
}

// If no requirement prefix is provided, use the class name or file name
if (!reqPrefix) {
  if (classes.length > 0) {
    reqPrefix = classes[0].name.toUpperCase();
  } else {
    reqPrefix = sourceFileName.toUpperCase();
  }
}

// Generate test file content
let testContent = `/**
 * ${reqPrefix} Tests
 *
 * Tests for the ${reqPrefix} implementation.
 *
 * Requirements being tested:
`;

// Add requirement tags
requirementTags.forEach(tag => {
  testContent += ` * - REQ-${tag}: Description of requirement\n`;
});

testContent += ` *
 * Test tags:
`;

// Add test tags
let testTagIndex = 1;
classes.forEach(cls => {
  cls.methods.forEach(method => {
    const testTag = `TEST-${reqPrefix}-${testTagIndex.toString().padStart(3, '0')}`;
    testContent += ` * - ${testTag}: Test that ${method.name}() works correctly\n`;
    testTagIndex++;

    // Add error handling test
    testContent += ` * - ${testTag}a: Test that ${method.name}() handles errors gracefully\n`;
    testTagIndex++;
  });
});

functions.forEach(func => {
  const testTag = `TEST-${reqPrefix}-${testTagIndex.toString().padStart(3, '0')}`;
  testContent += ` * - ${testTag}: Test that ${func.name}() works correctly\n`;
  testTagIndex++;

  // Add error handling test
  testContent += ` * - ${testTag}a: Test that ${func.name}() handles errors gracefully\n`;
  testTagIndex++;
});

testContent += ` */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
`;

// Enhanced import handling
// Define regex patterns for different import styles
const defaultImportRegex = /import\s+(\w+)\s+from\s+['"](.+?)['"];/g;
const namedImportRegex = /import\s+{\s*([\w\s,]+)\s*}\s+from\s+['"](.+?)['"];/g;
const namespaceImportRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"](.+?)['"];/g;
const mixedImportRegex = /import\s+(\w+)\s*,\s*{\s*([\w\s,]+)\s*}\s+from\s+['"](.+?)['"];/g;

// Create a map to store imports by module path
const importMap = new Map();

// Helper function to add to import map
const addToImportMap = (modulePath, importType, importNames) => {
  if (!importMap.has(modulePath)) {
    importMap.set(modulePath, { default: null, named: [], namespace: null });
  }

  const moduleImports = importMap.get(modulePath);

  if (importType === 'default') {
    moduleImports.default = importNames;
  } else if (importType === 'named') {
    // Split by comma and trim each name
    const names = importNames.split(',').map(name => name.trim());
    moduleImports.named.push(...names);
  } else if (importType === 'namespace') {
    moduleImports.namespace = importNames;
  }
};

// Process default imports
let match;
while ((match = defaultImportRegex.exec(sourceCode)) !== null) {
  const importName = match[1];
  const importPath = match[2];
  if (!importPath.startsWith('.')) {
    addToImportMap(importPath, 'default', importName);
  }
}

// Process named imports
while ((match = namedImportRegex.exec(sourceCode)) !== null) {
  const importNames = match[1];
  const importPath = match[2];
  if (!importPath.startsWith('.')) {
    addToImportMap(importPath, 'named', importNames);
  }
}

// Process namespace imports
while ((match = namespaceImportRegex.exec(sourceCode)) !== null) {
  const importName = match[1];
  const importPath = match[2];
  if (!importPath.startsWith('.')) {
    addToImportMap(importPath, 'namespace', importName);
  }
}

// Process mixed imports
while ((match = mixedImportRegex.exec(sourceCode)) !== null) {
  const defaultImport = match[1];
  const namedImports = match[2];
  const importPath = match[3];
  if (!importPath.startsWith('.')) {
    addToImportMap(importPath, 'default', defaultImport);
    addToImportMap(importPath, 'named', namedImports);
  }
}

// Group imports by external vs internal
const externalImports = [];
const internalImports = [];

// Generate import statements
importMap.forEach((importTypes, modulePath) => {
  let importStatement = 'import ';
  const importParts = [];

  if (importTypes.default) {
    importParts.push(importTypes.default);
  }

  if (importTypes.named.length > 0) {
    // Remove duplicates
    const uniqueNamed = [...new Set(importTypes.named)];
    importParts.push(`{ ${uniqueNamed.join(', ')} }`);
  }

  if (importTypes.namespace) {
    importParts.push(`* as ${importTypes.namespace}`);
  }

  // If no specific imports were found, use namespace import
  if (importParts.length === 0) {
    const moduleName = modulePath.split('/').pop();
    importStatement += `* as ${moduleName} from '${modulePath}';`;
  } else {
    importStatement += `${importParts.join(', ')} from '${modulePath}';`;
  }

  externalImports.push(importStatement);
});

// Add standard test imports
testContent += `import * as assert from 'assert';\n`;
testContent += `import * as sinon from 'sinon';\n`;
testContent += `import * as vscode from 'vscode';\n`;

// Add other external imports
if (externalImports.length > 0) {
  testContent += externalImports.join('\n') + '\n';
}

// Add import for the module being tested
const relativeSrcPath = path.relative('src/test/suite', 'src');
const relativeModulePath = path.join(relativeSrcPath, relativePath, sourceFileName);

// Extract exported functions and classes
const exportedItems = [];
if (classes.length > 0) {
  exportedItems.push(...classes.map(c => c.name));
}
if (functions.length > 0) {
  exportedItems.push(...functions.map(f => f.name));
}

// Add enums if they exist
const enumRegex = /export\s+enum\s+(\w+)/g;
let enumMatch;
while ((enumMatch = enumRegex.exec(sourceCode)) !== null) {
  exportedItems.push(enumMatch[1]);
}

// Add interfaces if they exist
const interfaceRegex = /export\s+interface\s+(\w+)/g;
let interfaceMatch;
while ((interfaceMatch = interfaceRegex.exec(sourceCode)) !== null) {
  exportedItems.push(interfaceMatch[1]);
}

// Add types if they exist
const typeRegex = /export\s+type\s+(\w+)/g;
let typeMatch;
while ((typeMatch = typeRegex.exec(sourceCode)) !== null) {
  exportedItems.push(typeMatch[1]);
}

// Add import statement for the module being tested
if (exportedItems.length > 0) {
  testContent += `import { ${exportedItems.join(', ')} } from '${relativeModulePath.replace(/\\/g, '/')}';\n\n`;
} else {
  testContent += `import * as moduleUnderTest from '${relativeModulePath.replace(/\\/g, '/')}';\n\n`;
}

// Add test suite
testContent += `suite('${reqPrefix} Test Suite', () => {
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

// Helper function to generate test values based on parameter type
const generateTestValue = (paramType) => {
  if (!paramType) return '/* parameter */';

  // Extract the base type (remove arrays, promises, etc.)
  let baseType = paramType.replace(/\[\]$/, '').replace(/Promise<(.+)>/, '$1');

  // Handle union types (take the first one)
  if (baseType.includes('|')) {
    baseType = baseType.split('|')[0].trim();
  }

  // Generate appropriate test value based on type
  switch (baseType.toLowerCase()) {
    case 'string':
      return '"test-string"';
    case 'number':
      return '42';
    case 'boolean':
      return 'true';
    case 'any':
      return '{}';
    case 'object':
      return '{}';
    case 'array':
      return '[]';
    case 'function':
      return '() => {}';
    case 'date':
      return 'new Date()';
    case 'regexp':
      return '/test/';
    case 'map':
      return 'new Map()';
    case 'set':
      return 'new Set()';
    case 'promise':
      return 'Promise.resolve()';
    case 'buffer':
      return 'Buffer.from("")';
    case 'error':
      return 'new Error("test error")';
    default:
      // If it's a custom type, create a mock object
      if (baseType.charAt(0) === baseType.charAt(0).toUpperCase()) {
        return `{} as ${baseType}`; // TypeScript casting for custom types
      }
      return '/* parameter */';
  }
};

// Helper function to generate assertion based on return type
const generateAssertion = (returnType, resultVar) => {
  if (!returnType || returnType === 'void' || returnType === 'undefined') {
    return '// No assertion needed for void return type';
  }

  // Extract the base type (remove arrays, promises, etc.)
  let baseType = returnType.replace(/\[\]$/, '').replace(/Promise<(.+)>/, '$1');

  // Handle union types (take the first one)
  if (baseType.includes('|')) {
    baseType = baseType.split('|')[0].trim();
  }

  // Generate appropriate assertion based on type
  switch (baseType.toLowerCase()) {
    case 'string':
      return `assert.strictEqual(typeof ${resultVar}, 'string');`;
    case 'number':
      return `assert.strictEqual(typeof ${resultVar}, 'number');`;
    case 'boolean':
      return `assert.strictEqual(typeof ${resultVar}, 'boolean');`;
    case 'object':
      return `assert.ok(${resultVar});`;
    case 'array':
      return `assert.ok(Array.isArray(${resultVar}));`;
    case 'any':
      return `assert.ok(${resultVar});`;
    case 'null':
      return `assert.strictEqual(${resultVar}, null);`;
    case 'undefined':
      return `assert.strictEqual(${resultVar}, undefined);`;
    default:
      // If it's a custom type, check if it's an instance of that type
      if (baseType.charAt(0) === baseType.charAt(0).toUpperCase()) {
        return `assert.ok(${resultVar});`;
      }
      return `assert.ok(${resultVar});`;
  }
};

// Helper function to generate mock for a parameter
const generateMock = (paramName, paramType) => {
  if (!paramType) return '';

  // Extract the base type (remove arrays, promises, etc.)
  let baseType = paramType.replace(/\[\]$/, '').replace(/Promise<(.+)>/, '$1');

  // Handle union types (take the first one)
  if (baseType.includes('|')) {
    baseType = baseType.split('|')[0].trim();
  }

  // Generate appropriate mock based on type
  switch (baseType.toLowerCase()) {
    case 'vscode.outputchannel':
      return `const ${paramName} = sinon.createStubInstance(vscode.OutputChannel);`;
    case 'vscode.window':
      return `const ${paramName} = sinon.stub(vscode.window);`;
    case 'vscode.workspace':
      return `const ${paramName} = sinon.stub(vscode.workspace);`;
    case 'vscode.commands':
      return `const ${paramName} = sinon.stub(vscode.commands);`;
    case 'function':
      return `const ${paramName} = sinon.stub();`;
    default:
      // If it's a custom type that might need mocking
      if (baseType.charAt(0) === baseType.charAt(0).toUpperCase()) {
        return `const ${paramName} = sinon.createStubInstance(${baseType});`;
      }
      return '';
  }
};

/**
 * Process a template string with variable replacements and conditional blocks
 * @param {string} templateString The template string to process
 * @param {object} context The context object with variable values
 * @returns {string} The processed template string
 */
function processTemplate(templateString, context) {
  if (!templateString) return '';

  // Process conditional blocks
  let processedTemplate = processConditionalBlocks(templateString, context);

  // Replace variables
  processedTemplate = replaceVariables(processedTemplate, context);

  return processedTemplate;
}

/**
 * Process conditional blocks in a template string
 * @param {string} templateString The template string to process
 * @param {object} context The context object with variable values
 * @returns {string} The processed template string
 */
function processConditionalBlocks(templateString, context) {
  // Process {{#if condition}}...{{/if}} blocks
  let result = templateString;
  const ifRegex = /{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;

  result = result.replace(ifRegex, (match, condition, content) => {
    // Evaluate the condition
    try {
      // Parse the condition
      const conditionParts = condition.split(/\s+/);
      let conditionResult = false;

      if (conditionParts.length === 1) {
        // Simple variable check
        conditionResult = Boolean(context[conditionParts[0]]);
      } else if (conditionParts.length === 3) {
        // Comparison
        const left = context[conditionParts[0]] !== undefined ? context[conditionParts[0]] : conditionParts[0];
        const operator = conditionParts[1];
        const right = context[conditionParts[2]] !== undefined ? context[conditionParts[2]] : conditionParts[2];

        switch (operator) {
          case '===':
          case '==':
            conditionResult = left == right;
            break;
          case '!==':
          case '!=':
            conditionResult = left != right;
            break;
          case '>':
            conditionResult = left > right;
            break;
          case '>=':
            conditionResult = left >= right;
            break;
          case '<':
            conditionResult = left < right;
            break;
          case '<=':
            conditionResult = left <= right;
            break;
          default:
            conditionResult = false;
        }
      }

      return conditionResult ? content : '';
    } catch (error) {
      console.error(`Error evaluating condition "${condition}": ${error.message}`);
      return '';
    }
  });

  return result;
}

/**
 * Replace variables in a template string
 * @param {string} templateString The template string to process
 * @param {object} context The context object with variable values
 * @returns {string} The processed template string
 */
function replaceVariables(templateString, context) {
  // Replace {{variable}} with context.variable
  return templateString.replace(/{{([^}]+)}}/g, (match, variableName) => {
    // Check if it's a transformed variable (e.g., {{className.camelCase}})
    if (variableName.includes('.')) {
      const parts = variableName.split('.');
      const baseVar = parts[0];
      const transformer = parts[1];

      if (context[variableName] !== undefined) {
        return context[variableName];
      } else if (context[baseVar] !== undefined && config.variableTransformers[transformer]) {
        return config.variableTransformers[transformer](context[baseVar]);
      }
    }

    // Regular variable replacement
    return context[variableName] !== undefined ? context[variableName] : match;
  });
}

// Generate tests using templates
let testsContent = '';
testTagIndex = 1;

// Filter classes and functions based on itemFilter if provided
const filteredClasses = itemFilter
  ? classes.filter(cls => cls.name === itemFilter || cls.methods.some(m => m.name === itemFilter))
  : classes;

const filteredFunctions = itemFilter
  ? functions.filter(func => func.name === itemFilter)
  : functions;

// Add tests for each class
filteredClasses.forEach(cls => {
  // Add class test if template has one
  if (template.classTestTemplate) {
    const testTag = `TEST-${reqPrefix}-${testTagIndex.toString().padStart(3, '0')}`;

    // Create a context object with all variables for template replacement
    const classContext = {
      testTag,
      className: cls.name
    };

    // Apply variable transformers
    Object.keys(config.variableTransformers).forEach(transformer => {
      const transformerFn = config.variableTransformers[transformer];
      // Add transformed versions of variables
      classContext[`className.${transformer}`] = transformerFn(cls.name);
    });

    // Replace template variables
    let classTest = processTemplate(template.classTestTemplate, classContext);

    testsContent += classTest;
    testTagIndex++;
  }

  // Add tests for each method
  const filteredMethods = itemFilter && cls.methods.some(m => m.name === itemFilter)
    ? cls.methods.filter(m => m.name === itemFilter)
    : cls.methods;

  filteredMethods.forEach(method => {
    const testTag = `TEST-${reqPrefix}-${testTagIndex.toString().padStart(3, '0')}`;
    const instanceName = cls.name.charAt(0).toLowerCase() + cls.name.slice(1);

    // Generate parameter values
    const paramValues = method.parameters.map(param => generateTestValue(param.type));

    // Generate mocks for complex parameters
    const mocks = method.parameters
      .map(param => generateMock(param.name, param.type))
      .filter(mock => mock !== '') // Remove empty mocks
      .join('\n    ');

    // Generate assertion based on return type
    const assertion = generateAssertion(method.returnType, 'result');

    // Generate act code
    const actCode = `${method.isAsync ? 'const result = await ' : 'const result = '}${instanceName}.${method.name}(${paramValues.join(', ')});`;

    // Generate assert code for error test
    const assertCode = `${method.isAsync ? 'await ' : ''}assert.doesNotThrow(() => {
      ${method.isAsync ? 'return ' : ''}${instanceName}.${method.name}(${paramValues.join(', ')});
    });`;

    // Create a context object with all variables for template replacement
    const methodContext = {
      testTag,
      className: cls.name,
      methodName: method.name,
      asyncPrefix: method.isAsync ? 'async ' : '',
      mocks,
      actCode,
      assertion,
      parameterList: method.parameters.map(p => `${p.name}: ${p.type}`).join(', '),
      returnType: method.returnType,
      hasErrorHandling: false, // Default value, could be determined by code analysis
      errorSetup: '// TODO: Set up error condition\n    // Example: sinon.stub(dependency, \'method\').throws(new Error(\'Test error\'));',
      assertCode,
      edgeCaseDescription: 'Empty input',
      edgeCaseMocks: '// TODO: Set up edge case mocks',
      edgeCaseActCode: actCode.replace(/\(.*?\)/, '()'), // Simple example: call with no parameters
      edgeCaseAssertion: assertion
    };

    // Apply variable transformers
    Object.keys(config.variableTransformers).forEach(transformer => {
      const transformerFn = config.variableTransformers[transformer];
      // Add transformed versions of variables
      methodContext[`className.${transformer}`] = transformerFn(cls.name);
      methodContext[`methodName.${transformer}`] = transformerFn(method.name);
    });

    // Replace template variables for method test
    let methodTest = processTemplate(template.methodTestTemplate, methodContext);
    testsContent += methodTest;
    testTagIndex++;

    // Add error handling test
    let methodErrorTest = processTemplate(template.methodErrorTestTemplate, methodContext);
    testsContent += methodErrorTest;
    testTagIndex++;

    // Add edge case test if the template has one
    if (template.methodEdgeCaseTestTemplate) {
      let methodEdgeCaseTest = processTemplate(template.methodEdgeCaseTestTemplate, methodContext);
      testsContent += methodEdgeCaseTest;
      testTagIndex++;
    }
  });
});

// Add tests for each function
filteredFunctions.forEach(func => {
  const testTag = `TEST-${reqPrefix}-${testTagIndex.toString().padStart(3, '0')}`;

  // Generate parameter values
  const paramValues = func.parameters.map(param => generateTestValue(param.type));

  // Generate mocks for complex parameters
  const mocks = func.parameters
    .map(param => generateMock(param.name, param.type))
    .filter(mock => mock !== '') // Remove empty mocks
    .join('\n    ');

  // Generate assertion based on return type
  const assertion = generateAssertion(func.returnType, 'result');

  // Generate act code
  const actCode = `${func.isAsync ? 'const result = await ' : 'const result = '}${func.name}(${paramValues.join(', ')});`;

  // Generate assert code for error test
  const assertCode = `${func.isAsync ? 'await ' : ''}assert.doesNotThrow(() => {
    ${func.isAsync ? 'return ' : ''}${func.name}(${paramValues.join(', ')});
  });`;

  // Create a context object with all variables for template replacement
  const functionContext = {
    testTag,
    functionName: func.name,
    asyncPrefix: func.isAsync ? 'async ' : '',
    mocks,
    actCode,
    assertion,
    parameterList: func.parameters.map(p => `${p.name}: ${p.type}`).join(', '),
    returnType: func.returnType,
    hasErrorHandling: false, // Default value, could be determined by code analysis
    errorSetup: '// TODO: Set up error condition\n    // Example: sinon.stub(dependency, \'method\').throws(new Error(\'Test error\'));',
    assertCode,
    edgeCaseDescription: 'Empty input',
    edgeCaseMocks: '// TODO: Set up edge case mocks',
    edgeCaseActCode: actCode.replace(/\(.*?\)/, '()'), // Simple example: call with no parameters
    edgeCaseAssertion: assertion,
    aiDescription: `This function ${func.name} is responsible for...`,
    aiErrorDescription: `This function ${func.name} might throw errors when...`,
    aiGeneratedAssertions: '// AI-generated assertions would go here',
    aiGeneratedErrorAssertions: '// AI-generated error assertions would go here'
  };

  // Apply variable transformers
  Object.keys(config.variableTransformers).forEach(transformer => {
    const transformerFn = config.variableTransformers[transformer];
    // Add transformed versions of variables
    functionContext[`functionName.${transformer}`] = transformerFn(func.name);
  });

  // Replace template variables for function test
  let functionTest = processTemplate(template.testTemplate, functionContext);
  testsContent += functionTest;
  testTagIndex++;

  // Add error handling test
  let functionErrorTest = processTemplate(template.errorTestTemplate, functionContext);
  testsContent += functionErrorTest;
  testTagIndex++;

  // Add edge case test if the template has one
  if (template.edgeCaseTestTemplate) {
    let functionEdgeCaseTest = processTemplate(template.edgeCaseTestTemplate, functionContext);
    testsContent += functionEdgeCaseTest;
    testTagIndex++;
  }
});

// Generate the final test file content using the file template
const imports = exportedItems.length > 0
  ? `import { ${exportedItems.join(', ')} } from '${relativeModulePath.replace(/\\/g, '/')}';\n`
  : `import * as moduleUnderTest from '${relativeModulePath.replace(/\\/g, '/')}';\n`;

// Setup variables
const setupVars = 'let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;';

// Setup code
const setupCode = `// Create stubs
    outputChannelStub = sinon.createStubInstance(vscode.OutputChannel);

    // Stub VS Code window.createOutputChannel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(vscode.window, 'createOutputChannel').returns(outputChannelStub as any);`;

// Create a context object for the file template
const fileContext = {
  imports,
  suiteName: `${reqPrefix} Test Suite`,
  setupVars,
  setupCode,
  tests: testsContent,
  fileName: sourceFileName,
  moduleName: sourceFileName
};

// Process the file template
const finalTestContent = processTemplate(template.fileTemplate, fileContext);

// Write the test file
fs.writeFileSync(testFilePath, finalTestContent);

console.log(`Generated test file: ${testFilePath}`);

// Log template used
console.log(`Used template: ${templateName}`);

// Log item filter if used
if (itemFilter) {
  console.log(`Filtered by item: ${itemFilter}`);
}

// Add a new script to package.json if it doesn't exist
const packageJsonPath = path.join('package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (!packageJson.scripts['generate:tests']) {
    packageJson.scripts['generate:tests'] = 'node scripts/generate-tests.js';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Added generate:tests script to package.json');
  }
}
