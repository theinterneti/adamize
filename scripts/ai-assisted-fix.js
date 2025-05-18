/**
 * AI-assisted code fixing script
 * 
 * This script uses Ollama with the Qwen 3 TypeScript model to analyze and fix
 * TypeScript code issues in the specified files.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MODEL = process.argv.find(arg => arg.startsWith('--model='))?.split('=')[1] || 'qwen3-typescript';
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const BACKUP = !process.argv.includes('--no-backup');
const MAX_RETRIES = 3;
const SPECIFIC_FILES = process.argv.find(arg => arg.startsWith('--files='))?.split('=')[1]?.split(',');

// Default components order if no specific files provided
const COMPONENTS_ORDER = [
  // Core types first
  'src/mcp/mcpTypes.ts',
  'src/mcp/bridge/bridgeTypes.ts',
  
  // Core services next
  'src/mcp/llmClient.ts',
  'src/mcp/mcpToolRegistry.ts',
  
  // Main components
  'src/mcp/mcpBridge.ts',
  'src/mcp/mcpBridgeManager.ts',
  
  // UI components
  'src/ui/mcpChatView.ts',
  'src/ui/mcpServerExplorerView.ts'
];

// Statistics
const stats = {
  filesProcessed: 0,
  filesFixed: 0,
  filesFailed: 0
};

/**
 * Fix a TypeScript file using AI
 * @param {string} filePath Path to the file
 * @returns {Promise<boolean>} Success status
 */
async function fixFile(filePath) {
  console.log(`\n🔍 Processing ${filePath}...`);
  
  try {
    // Read the file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Create prompt for the AI
    const prompt = `
Fix TypeScript errors in this file:
\`\`\`typescript
${content}
\`\`\`

Focus on:
1. Fixing naming conventions (private properties with underscore)
2. Adding proper type definitions
3. Fixing unused variables (add underscore prefix)
4. Replacing @ts-ignore with @ts-expect-error
5. Adding missing implementations
6. Fixing interface names (add I prefix)
7. Fixing enum member names (use camelCase)
8. Converting snake_case properties to camelCase

Return ONLY the fixed code without explanations.
`;

    // Call Ollama
    let result;
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        if (VERBOSE) {
          console.log(`  - Calling Ollama (attempt ${retries + 1}/${MAX_RETRIES})...`);
        }
        
        result = execSync(`ollama run ${MODEL} "${prompt.replace(/"/g, '\\"')}"`, { 
          maxBuffer: 1024 * 1024 * 10  // 10MB buffer for large files
        }).toString();
        
        break;
      } catch (error) {
        retries++;
        console.error(`  - Error calling Ollama (attempt ${retries}/${MAX_RETRIES}):`, error.message);
        
        if (retries >= MAX_RETRIES) {
          throw new Error(`Failed to call Ollama after ${MAX_RETRIES} attempts`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Extract code from response
    const codeMatch = result.match(/```typescript\n([\s\S]*?)\n```/) || 
                      result.match(/```ts\n([\s\S]*?)\n```/) ||
                      result.match(/```\n([\s\S]*?)\n```/);
                      
    if (codeMatch && codeMatch[1]) {
      const fixedCode = codeMatch[1];
      
      // Skip if no changes
      if (fixedCode === content) {
        console.log(`  - No changes needed for ${filePath}`);
        stats.filesProcessed++;
        return true;
      }
      
      if (!DRY_RUN) {
        // Backup original file
        if (BACKUP) {
          fs.writeFileSync(`${filePath}.bak`, content);
          if (VERBOSE) {
            console.log(`  - Created backup at ${filePath}.bak`);
          }
        }
        
        // Write fixed code
        fs.writeFileSync(filePath, fixedCode);
      }
      
      console.log(`✅ ${DRY_RUN ? 'Would fix' : 'Fixed'} ${filePath}`);
      stats.filesFixed++;
      stats.filesProcessed++;
      return true;
    } else {
      console.log(`❌ Could not extract code for ${filePath}`);
      stats.filesFailed++;
      stats.filesProcessed++;
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    stats.filesFailed++;
    stats.filesProcessed++;
    return false;
  }
}

/**
 * Run TypeScript compiler to check for errors
 * @returns {boolean} Success status
 */
function runTypeScriptCheck() {
  try {
    console.log('\n🔍 Running TypeScript check...');
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ TypeScript check passed!');
    return true;
  } catch (error) {
    console.log('⚠️ TypeScript check still has errors');
    if (VERBOSE) {
      console.log(error.stdout.toString());
    }
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`🤖 Starting AI-assisted fix with model: ${MODEL}`);
  
  // First run ESLint auto-fixes
  console.log("\n🔧 Running ESLint auto-fixes...");
  try {
    execSync('npx eslint --ext .ts src --fix', { stdio: 'inherit' });
  } catch (error) {
    console.log("⚠️ ESLint completed with some errors (this is expected)");
  }
  
  // Process files
  const filesToProcess = SPECIFIC_FILES || COMPONENTS_ORDER;
  
  for (const filePath of filesToProcess) {
    await fixFile(filePath);
    
    // Run TypeScript check after each file to see progress
    if (!DRY_RUN) {
      runTypeScriptCheck();
    }
  }
  
  // Print summary
  console.log('\n📊 Summary:');
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files fixed: ${stats.filesFixed}`);
  console.log(`Files failed: ${stats.filesFailed}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️ This was a dry run. No files were modified.');
    console.log('Run without --dry-run to apply changes.');
  }
  
  console.log('\n✨ Completed AI-assisted fixes!');
}

// Run the main function
main().catch(console.error);
