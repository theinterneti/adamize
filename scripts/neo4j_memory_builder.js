/**
 * Neo4j Memory Builder
 * 
 * This script builds a knowledge graph of the projects directory using Neo4j memory commands.
 * It creates entities for projects, directories, and important files, and establishes relationships between them.
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// Configuration
const PROJECTS_DIR = '/home/thein/projects';
const IGNORE_DIRS = [
  'node_modules', '.git', '.vscode', 'out', 'dist', 'build', 'coverage', '.cache'
];
const IMPORTANT_FILES = [
  'package.json', 'README.md', '.augment-guidelines', 'tsconfig.json', 
  'docker-compose.yml', 'Dockerfile', 'devcontainer.json'
];
const MAX_BATCH_SIZE = 10; // Maximum number of entities/relations to create in a single batch

// Helper function to read file content safely
function readFileSafe(filePath, maxSize = 10000) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > maxSize) {
      return `File too large (${stats.size} bytes)`;
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return `Error reading file: ${error.message}`;
  }
}

// Helper function to create entities in batches
async function createEntitiesBatch(entities) {
  if (entities.length === 0) return;
  
  for (let i = 0; i < entities.length; i += MAX_BATCH_SIZE) {
    const batch = entities.slice(i, i + MAX_BATCH_SIZE);
    try {
      await create_entities_memory({ entities: batch });
      console.log(`Created ${batch.length} entities (batch ${Math.floor(i / MAX_BATCH_SIZE) + 1})`);
    } catch (error) {
      console.error('Error creating entities:', error);
    }
  }
}

// Helper function to create relations in batches
async function createRelationsBatch(relations) {
  if (relations.length === 0) return;
  
  for (let i = 0; i < relations.length; i += MAX_BATCH_SIZE) {
    const batch = relations.slice(i, i + MAX_BATCH_SIZE);
    try {
      await create_relations_memory({ relations: batch });
      console.log(`Created ${batch.length} relations (batch ${Math.floor(i / MAX_BATCH_SIZE) + 1})`);
    } catch (error) {
      console.error('Error creating relations:', error);
    }
  }
}

// Process a project and add it to the knowledge graph
async function processProject(projectPath) {
  const projectName = path.basename(projectPath);
  console.log(`Processing project: ${projectName}`);
  
  const entities = [];
  const relations = [];
  
  // Create project entity
  const projectEntity = {
    name: projectName,
    entityType: 'Project',
    observations: [`Project directory: ${projectPath}`]
  };
  
  // Add package.json info if available
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSafe(packageJsonPath));
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
      console.error(`Error parsing package.json for ${projectName}:`, error.message);
    }
  }
  
  // Add README.md content if available
  const readmePath = path.join(projectPath, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readmeContent = readFileSafe(readmePath);
    projectEntity.observations.push(`README: ${readmeContent}`);
  }
  
  entities.push(projectEntity);
  
  // Process important files
  for (const fileName of IMPORTANT_FILES) {
    const filePath = path.join(projectPath, fileName);
    if (fs.existsSync(filePath)) {
      const fileContent = readFileSafe(filePath);
      entities.push({
        name: `${projectName}:${fileName}`,
        entityType: 'File',
        observations: [`Path: ${filePath}`, `Content: ${fileContent}`]
      });
      
      relations.push({
        from: projectName,
        to: `${projectName}:${fileName}`,
        relationType: 'contains'
      });
    }
  }
  
  // Process .devcontainer directory if it exists
  const devcontainerDir = path.join(projectPath, '.devcontainer');
  if (fs.existsSync(devcontainerDir) && fs.statSync(devcontainerDir).isDirectory()) {
    entities.push({
      name: `${projectName}:devcontainer`,
      entityType: 'Component',
      observations: ['DevContainer configuration for the project']
    });
    
    relations.push({
      from: projectName,
      to: `${projectName}:devcontainer`,
      relationType: 'has'
    });
    
    // Process important devcontainer files
    const devcontainerFiles = ['devcontainer.json', 'docker-compose.yml', 'Dockerfile'];
    for (const fileName of devcontainerFiles) {
      const filePath = path.join(devcontainerDir, fileName);
      if (fs.existsSync(filePath)) {
        const fileContent = readFileSafe(filePath);
        entities.push({
          name: `${projectName}:devcontainer:${fileName}`,
          entityType: 'File',
          observations: [`Path: ${filePath}`, `Content: ${fileContent}`]
        });
        
        relations.push({
          from: `${projectName}:devcontainer`,
          to: `${projectName}:devcontainer:${fileName}`,
          relationType: 'contains'
        });
      }
    }
  }
  
  // Create entities and relations
  await createEntitiesBatch(entities);
  await createRelationsBatch(relations);
}

// Main function to build the knowledge graph
async function buildKnowledgeGraph() {
  console.log('Building knowledge graph of projects...');
  
  try {
    // Get list of projects
    const projects = fs.readdirSync(PROJECTS_DIR)
      .filter(item => {
        const itemPath = path.join(PROJECTS_DIR, item);
        return fs.statSync(itemPath).isDirectory() && !IGNORE_DIRS.includes(item);
      })
      .map(item => path.join(PROJECTS_DIR, item));
    
    console.log(`Found ${projects.length} projects: ${projects.map(p => path.basename(p)).join(', ')}`);
    
    // Process each project
    for (const project of projects) {
      await processProject(project);
    }
    
    console.log('Knowledge graph built successfully!');
  } catch (error) {
    console.error('Error building knowledge graph:', error);
  }
}

// Run the main function
buildKnowledgeGraph();
