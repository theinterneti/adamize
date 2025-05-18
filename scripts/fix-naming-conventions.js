/**
 * Script to fix naming convention issues in TypeScript files
 * 
 * This script automatically fixes common naming convention issues:
 * 1. Private class properties without leading underscore
 * 2. Enum members not in camelCase
 * 3. Interface names without 'I' prefix
 * 4. Type property names not in camelCase (e.g., snake_case)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

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

// Patterns to fix
const patterns = [
  // Fix private property naming (add leading underscore)
  {
    name: 'Private property without leading underscore',
    regex: /private\s+([a-zA-Z0-9]+)(\s*:\s*[a-zA-Z<>[\]|&\s]+)/g,
    replacement: (match, propName, type) => {
      // Skip if already has underscore
      if (propName.startsWith('_')) {
        return match;
      }
      return `private _${propName}${type}`;
    },
    count: 0
  },
  // Fix enum member naming (convert to camelCase)
  {
    name: 'Enum member not in camelCase',
    regex: /(\s+)([A-Z][A-Z0-9_]+)(\s*=\s*['"][^'"]+['"])/g,
    replacement: (match, space, enumMember, value) => {
      // Convert to camelCase
      const camelCase = enumMember.charAt(0).toLowerCase() + 
        enumMember.slice(1).toLowerCase().replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
      return `${space}${camelCase}${value}`;
    },
    count: 0
  },
  // Fix interface names (add I prefix)
  {
    name: 'Interface without I prefix',
    regex: /interface\s+([A-Z][a-zA-Z0-9]*)(?!\s+extends\s+I[A-Z])/g,
    replacement: (match, interfaceName) => {
      // Skip if already has I prefix
      if (interfaceName.startsWith('I')) {
        return match;
      }
      return `interface I${interfaceName}`;
    },
    count: 0
  },
  // Fix type property names (convert snake_case to camelCase)
  {
    name: 'Type property in snake_case',
    regex: /(\s+)([a-z][a-z0-9_]+)(_[a-z][a-z0-9_]*)(\s*:\s*[a-zA-Z<>[\]|&\s]+)/g,
    replacement: (match, space, prefix, snakePart, type) => {
      // Convert to camelCase
      const camelCase = prefix + snakePart.replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
      return `${space}${camelCase}${type}`;
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
tsFiles.forEach(filePath => {
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
        console.log(`✅ Fixed naming conventions in ${filePath}`);
      } else if (!VERBOSE) {
        console.log(`🔍 Would fix naming conventions in ${filePath} (dry run)`);
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
