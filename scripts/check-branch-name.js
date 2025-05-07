#!/usr/bin/env node

/**
 * Check Branch Name Script
 * 
 * This script checks if the current branch name follows the naming convention:
 * (feature|bugfix|hotfix|release|docs|refactor|test|ci)/name-with-hyphens
 * 
 * Usage:
 *   node scripts/check-branch-name.js
 * 
 * Example:
 *   node scripts/check-branch-name.js
 */

const { execSync } = require('child_process');

// Get the current branch name
let branchName;
try {
  branchName = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
} catch (error) {
  console.error('Error getting branch name:', error.message);
  process.exit(1);
}

// Skip check for main, master, and develop branches
if (['main', 'master', 'develop'].includes(branchName)) {
  console.log(`Branch '${branchName}' is a standard branch, skipping check.`);
  process.exit(0);
}

// Define the branch naming convention
const pattern = /^(feature|bugfix|hotfix|release|docs|refactor|test|ci)\/[a-z0-9-]+$/;

// Check if the branch name follows the convention
if (!pattern.test(branchName)) {
  console.error(`Error: Branch name "${branchName}" does not follow the convention:`);
  console.error('(feature|bugfix|hotfix|release|docs|refactor|test|ci)/name-with-hyphens');
  console.error('\nExamples of valid branch names:');
  console.error('  feature/add-new-command');
  console.error('  bugfix/fix-connection-issue');
  console.error('  docs/update-readme');
  console.error('  refactor/improve-error-handling');
  process.exit(1);
}

console.log(`Branch name "${branchName}" follows the naming convention.`);
