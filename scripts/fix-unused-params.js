/**
 * Script to fix unused parameters in TypeScript files
 * 
 * This script automatically adds underscore prefix to unused parameters
 * to comply with the TypeScript naming convention and suppress warnings.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const ts = require('typescript');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const BACKUP = !process.argv.includes('--no-backup');
const SPECIFIC_FILES = process.argv.find(arg => arg.startsWith('--files='))?.split('=')[1]?.split(',');

// Find all TypeScript files
let tsFiles = [];
if (SPECIFIC_FILES) {
  tsFiles = SPECIFIC_FILES.map(file => path.resolve(file));
} else {
  tsFiles = glob.sync('src/**/*.ts');
}

// Statistics
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  totalChanges: 0,
  unusedParams: 0
};

// Process each file
tsFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Parse the TypeScript file
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Find unused parameters
    const unusedParams = [];
    const paramPositions = [];
    
    // Visit each node in the AST
    function visit(node) {
      // Check if node is a parameter
      if (ts.isParameter(node) && node.name && ts.isIdentifier(node.name)) {
        const paramName = node.name.getText(sourceFile);
        
        // Skip if already has underscore prefix
        if (paramName.startsWith('_')) {
          return;
        }
        
        // Get the function/method body
        let body = null;
        if (node.parent && (ts.isFunctionDeclaration(node.parent) || 
                           ts.isMethodDeclaration(node.parent) || 
                           ts.isArrowFunction(node.parent))) {
          body = node.parent.body;
        }
        
        // Skip if no body found
        if (!body) {
          return;
        }
        
        // Check if parameter is used in the body
        let isUsed = false;
        
        function checkUsage(bodyNode) {
          if (ts.isIdentifier(bodyNode) && bodyNode.getText(sourceFile) === paramName) {
            isUsed = true;
            return;
          }
          ts.forEachChild(bodyNode, checkUsage);
        }
        
        checkUsage(body);
        
        // If parameter is not used, add to the list
        if (!isUsed) {
          unusedParams.push(paramName);
          paramPositions.push({
            name: paramName,
            start: node.name.getStart(sourceFile),
            end: node.name.getEnd(sourceFile)
          });
        }
      }
      
      ts.forEachChild(node, visit);
    }
    
    ts.forEachChild(sourceFile, visit);
    
    // If no unused parameters found, skip
    if (unusedParams.length === 0) {
      stats.filesProcessed++;
      return;
    }
    
    // Sort positions in reverse order to avoid offset issues
    paramPositions.sort((a, b) => b.start - a.start);
    
    // Create new content with prefixed parameters
    let newContent = content;
    let fileModified = false;
    
    for (const position of paramPositions) {
      const prefix = '_';
      const oldParam = position.name;
      const newParam = prefix + oldParam;
      
      // Replace parameter name
      newContent = 
        newContent.substring(0, position.start) + 
        newParam + 
        newContent.substring(position.end);
      
      fileModified = true;
      stats.unusedParams++;
      stats.totalChanges++;
      
      if (VERBOSE) {
        console.log(`  - Fixed unused parameter "${oldParam}" -> "${newParam}" in ${filePath}`);
      }
    }
    
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
        console.log(`✅ Fixed unused parameters in ${filePath}`);
      } else if (!VERBOSE) {
        console.log(`🔍 Would fix unused parameters in ${filePath} (dry run)`);
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
console.log(`Unused parameters fixed: ${stats.unusedParams}`);

if (DRY_RUN) {
  console.log('\n⚠️ This was a dry run. No files were modified.');
  console.log('Run without --dry-run to apply changes.');
}
