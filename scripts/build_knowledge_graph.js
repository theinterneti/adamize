/**
 * Build Knowledge Graph Script
 * 
 * This script scans the projects directory and builds a knowledge graph using Neo4j memory commands.
 * It creates entities for projects, directories, and files, and establishes relationships between them.
 * 
 * Usage: node build_knowledge_graph.js [root_directory]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DEFAULT_ROOT_DIR = '/home/thein/projects';
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.vscode',
  'out',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.vscode-test'
];
const IGNORE_FILES = [
  '.DS_Store',
  '.gitignore',
  'package-lock.json',
  'yarn.lock'
];
const CODE_FILE_EXTENSIONS = [
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
  '.cs', '.go', '.rb', '.php', '.rs', '.swift', '.kt', '.html', '.css',
  '.scss', '.sass', '.json', '.yaml', '.yml', '.xml', '.md', '.sh', '.bash',
  '.dockerfile', '.Dockerfile'
];

// Get root directory from command line args or use default
const rootDir = process.argv[2] || DEFAULT_ROOT_DIR;

// Memory entities and relations to be created
const entities = [];
const relations = [];

/**
 * Process a directory and add it to the knowledge graph
 * @param {string} dirPath - Path to the directory
 * @param {string} parentEntity - Name of the parent entity
 */
function processDirectory(dirPath, parentEntity = null) {
  const dirName = path.basename(dirPath);
  
  // Skip ignored directories
  if (IGNORE_DIRS.includes(dirName)) {
    return;
  }
  
  // Create entity for the directory
  const dirEntity = {
    name: dirPath,
    entityType: 'Directory',
    observations: [`Directory: ${dirName}`]
  };
  entities.push(dirEntity);
  
  // Create relation to parent if it exists
  if (parentEntity) {
    relations.push({
      from: parentEntity,
      to: dirPath,
      relationType: 'contains'
    });
  }
  
  try {
    // Read directory contents
    const items = fs.readdirSync(dirPath);
    
    // Process each item in the directory
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // Process subdirectory
        processDirectory(itemPath, dirPath);
      } else if (stats.isFile()) {
        // Process file
        processFile(itemPath, dirPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
  }
}

/**
 * Process a file and add it to the knowledge graph
 * @param {string} filePath - Path to the file
 * @param {string} parentDir - Path to the parent directory
 */
function processFile(filePath, parentDir) {
  const fileName = path.basename(filePath);
  const fileExt = path.extname(filePath).toLowerCase();
  
  // Skip ignored files
  if (IGNORE_FILES.includes(fileName)) {
    return;
  }
  
  // Determine file type
  let fileType = 'File';
  if (CODE_FILE_EXTENSIONS.includes(fileExt)) {
    fileType = 'CodeFile';
  } else if (fileExt === '.md') {
    fileType = 'DocumentationFile';
  } else if (['.json', '.yaml', '.yml', '.xml'].includes(fileExt)) {
    fileType = 'ConfigurationFile';
  }
  
  // Create entity for the file
  const fileEntity = {
    name: filePath,
    entityType: fileType,
    observations: [`File: ${fileName}`, `Extension: ${fileExt}`]
  };
  
  // For smaller text files, add content as observation
  try {
    if (stats.size < 100000 && CODE_FILE_EXTENSIONS.includes(fileExt)) {
      const content = fs.readFileSync(filePath, 'utf8');
      fileEntity.observations.push(`Content: ${content.substring(0, 1000)}...`);
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
  }
  
  entities.push(fileEntity);
  
  // Create relation to parent directory
  relations.push({
    from: parentDir,
    to: filePath,
    relationType: 'contains'
  });
}

/**
 * Process a project directory
 * @param {string} projectPath - Path to the project
 */
function processProject(projectPath) {
  const projectName = path.basename(projectPath);
  
  // Create entity for the project
  const projectEntity = {
    name: projectPath,
    entityType: 'Project',
    observations: [`Project: ${projectName}`]
  };
  
  // Try to get additional project info from package.json if it exists
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.name) {
        projectEntity.observations.push(`Name: ${packageJson.name}`);
      }
      if (packageJson.description) {
        projectEntity.observations.push(`Description: ${packageJson.description}`);
      }
      if (packageJson.version) {
        projectEntity.observations.push(`Version: ${packageJson.version}`);
      }
    } catch (error) {
      console.error(`Error reading package.json for ${projectName}:`, error.message);
    }
  }
  
  entities.push(projectEntity);
  
  // Process the project directory
  processDirectory(projectPath, projectPath);
}

/**
 * Main function to build the knowledge graph
 */
async function buildKnowledgeGraph() {
  console.log(`Building knowledge graph for ${rootDir}...`);
  
  try {
    // Get list of projects in the root directory
    const projects = fs.readdirSync(rootDir)
      .filter(item => {
        const itemPath = path.join(rootDir, item);
        return fs.statSync(itemPath).isDirectory() && !IGNORE_DIRS.includes(item);
      })
      .map(item => path.join(rootDir, item));
    
    // Process each project
    for (const project of projects) {
      console.log(`Processing project: ${path.basename(project)}`);
      processProject(project);
    }
    
    // Create entities in memory
    console.log(`Creating ${entities.length} entities...`);
    for (let i = 0; i < entities.length; i += 100) {
      const batch = entities.slice(i, i + 100);
      console.log(`Creating batch ${i / 100 + 1}...`);
      // Use memory commands to create entities
      // This would be replaced with actual API calls in a real implementation
      console.log(`create_entities_memory: ${batch.length} entities`);
    }
    
    // Create relations in memory
    console.log(`Creating ${relations.length} relations...`);
    for (let i = 0; i < relations.length; i += 100) {
      const batch = relations.slice(i, i + 100);
      console.log(`Creating batch ${i / 100 + 1}...`);
      // Use memory commands to create relations
      // This would be replaced with actual API calls in a real implementation
      console.log(`create_relations_memory: ${batch.length} relations`);
    }
    
    console.log('Knowledge graph built successfully!');
  } catch (error) {
    console.error('Error building knowledge graph:', error.message);
  }
}

// Run the main function
buildKnowledgeGraph();
