/**
 * Script to update test expectations and fix common test issues
 * 
 * This script automatically fixes common test issues:
 * 1. ExtensionMode.Test references (which may not exist in some VS Code versions)
 * 2. OutputChannel mock creation issues
 * 3. Missing mock implementations
 * 4. Incorrect test expectations
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const BACKUP = !process.argv.includes('--no-backup');
const SPECIFIC_FILES = process.argv.find(arg => arg.startsWith('--files='))?.split('=')[1]?.split(',');

// Find all test files
let testFiles = [];
if (SPECIFIC_FILES) {
  testFiles = SPECIFIC_FILES.map(file => path.resolve(file));
} else {
  testFiles = glob.sync('src/test/**/*.test.ts');
}

// Patterns to fix common test issues
const patterns = [
  // Fix ExtensionMode.Test references
  {
    name: 'ExtensionMode.Test reference',
    regex: /vscode\.ExtensionMode\.Test/g,
    replacement: '1 /* vscode.ExtensionMode.Test */',
    count: 0
  },
  // Fix OutputChannel mock creation with sinon
  {
    name: 'OutputChannel sinon mock',
    regex: /sinon\.createStubInstance\(vscode\.OutputChannel\)/g,
    replacement: '{ appendLine: sinon.stub(), append: sinon.stub(), clear: sinon.stub(), show: sinon.stub(), hide: sinon.stub(), dispose: sinon.stub() }',
    count: 0
  },
  // Fix OutputChannel mock creation with jest
  {
    name: 'OutputChannel jest mock',
    regex: /jest\.mocked<vscode\.OutputChannel>/g,
    replacement: 'jest.mocked<any>',
    count: 0
  },
  // Fix jest.Mocked references
  {
    name: 'jest.Mocked reference',
    regex: /jest\.Mocked</g,
    replacement: 'jest.Mock<',
    count: 0
  },
  // Fix mockOutputChannel initialization before reference
  {
    name: 'mockOutputChannel reference before initialization',
    regex: /(jest\.fn\(\)\.mockReturnValue\(mockOutputChannel\))/g,
    replacement: 'jest.fn().mockReturnValue({ appendLine: jest.fn(), append: jest.fn(), clear: jest.fn(), show: jest.fn(), hide: jest.fn(), dispose: jest.fn() })',
    count: 0
  },
  // Fix mockWebviewPanel initialization before reference
  {
    name: 'mockWebviewPanel reference before initialization',
    regex: /(jest\.fn\(\)\.mockReturnValue\(mockWebviewPanel\))/g,
    replacement: 'jest.fn().mockReturnValue({ webview: { onDidReceiveMessage: jest.fn(), postMessage: jest.fn(), html: "" }, onDidDispose: jest.fn(), reveal: jest.fn(), dispose: jest.fn() })',
    count: 0
  },
  // Fix mockCommands initialization before reference
  {
    name: 'mockCommands reference before initialization',
    regex: /(mockCommands,)/g,
    replacement: '{ registerCommand: jest.fn(), executeCommand: jest.fn() },',
    count: 0
  },
  // Fix ViewColumn.One reference
  {
    name: 'ViewColumn.One reference',
    regex: /vscode\.ViewColumn\.One/g,
    replacement: '1 /* vscode.ViewColumn.One */',
    count: 0
  },
  // Fix missing tool_calls property in ChatMessage interface
  {
    name: 'Missing tool_calls in ChatMessage',
    regex: /(interface ChatMessage \{[^}]*\})/g,
    replacement: (match) => {
      if (!match.includes('tool_calls')) {
        return match.replace(/\}$/, '\n  tool_calls?: any[];\n}');
      }
      return match;
    },
    count: 0
  },
  // Fix missing streamPrompt method in LLMClient
  {
    name: 'Missing streamPrompt in LLMClient',
    regex: /(class LLMClient \{[^]*?sendPrompt[^]*?\})/gs,
    replacement: (match) => {
      if (!match.includes('streamPrompt')) {
        return match.replace(/\}$/, '\n  streamPrompt(prompt: string, handlers: any): Promise<void> {\n    return Promise.resolve();\n  }\n}');
      }
      return match;
    },
    count: 0
  }
];

// Statistics
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  totalChanges: 0
};

// Process each file
testFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileModified = false;
    
    // Apply each pattern
    patterns.forEach(pattern => {
      const matches = newContent.match(pattern.regex) || [];
      if (matches.length > 0) {
        const originalContent = newContent;
        newContent = newContent.replace(pattern.regex, pattern.replacement);
        
        // Count changes
        if (originalContent !== newContent) {
          pattern.count += matches.length;
          fileModified = true;
          stats.totalChanges += matches.length;
          
          if (VERBOSE) {
            console.log(`  - Fixed ${matches.length} instances of "${pattern.name}" in ${filePath}`);
          }
        }
      }
    });
    
    // Save changes if needed
    if (fileModified) {
      stats.filesModified++;
      
      if (!DRY_RUN) {
        // Create backup if requested
        if (BACKUP) {
          fs.writeFileSync(`${filePath}.bak`, content);
        }
        
        // Write changes
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ Fixed test expectations in ${filePath}`);
      } else if (!VERBOSE) {
        console.log(`🔍 Would fix test expectations in ${filePath} (dry run)`);
      }
    }
    
    stats.filesProcessed++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

// Print summary
console.log('\n📊 Summary:');
console.log(`Files processed: ${stats.filesProcessed}`);
console.log(`Files modified: ${stats.filesModified}`);
console.log(`Total changes: ${stats.totalChanges}`);

patterns.forEach(pattern => {
  console.log(`- ${pattern.name}: ${pattern.count} fixes`);
});

if (DRY_RUN) {
  console.log('\n⚠️ This was a dry run. No files were modified.');
  console.log('Run without --dry-run to apply changes.');
}
