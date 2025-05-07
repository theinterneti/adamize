#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * 
 * This script tracks performance metrics over time by:
 * 1. Running benchmarks
 * 2. Storing results in a history file
 * 3. Generating reports and visualizations
 * 
 * Usage:
 *   node scripts/performance-monitor.js [--compare] [--report] [--history=<history-file>]
 * 
 * Example:
 *   node scripts/performance-monitor.js
 *   node scripts/performance-monitor.js --compare
 *   node scripts/performance-monitor.js --report
 *   node scripts/performance-monitor.js --history=custom-history.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const compareMode = args.includes('--compare');
const reportMode = args.includes('--report');
let historyFile = 'benchmark-history.json';

args.forEach(arg => {
  if (arg.startsWith('--history=')) {
    historyFile = arg.split('=')[1];
  }
});

// Set paths
const historyPath = path.join(__dirname, '..', historyFile);
const latestResultsPath = path.join(__dirname, '..', 'benchmark-results.json');
const reportPath = path.join(__dirname, '..', 'benchmark-report.md');

/**
 * Run benchmarks and get results
 * @returns {Array} Benchmark results
 */
async function runBenchmarks() {
  console.log('Running benchmarks...');
  
  try {
    // Run benchmarks
    execSync('npm run benchmark:ci', { stdio: 'inherit' });
    
    // Read results
    const results = JSON.parse(fs.readFileSync(latestResultsPath, 'utf8'));
    
    console.log(`Benchmarks completed with ${results.length} results`);
    
    return results;
  } catch (error) {
    console.error('Error running benchmarks:', error);
    process.exit(1);
  }
}

/**
 * Load benchmark history
 * @returns {Array} Benchmark history
 */
function loadHistory() {
  if (fs.existsSync(historyPath)) {
    try {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  } else {
    return [];
  }
}

/**
 * Save benchmark history
 * @param {Array} history Benchmark history
 */
function saveHistory(history) {
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    console.log(`History saved to ${historyPath}`);
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

/**
 * Add benchmark results to history
 * @param {Array} results Benchmark results
 * @param {Array} history Benchmark history
 * @returns {Array} Updated history
 */
function addToHistory(results, history) {
  const entry = {
    timestamp: new Date().toISOString(),
    commit: getGitCommit(),
    branch: getGitBranch(),
    results
  };
  
  history.push(entry);
  
  return history;
}

/**
 * Get current Git commit
 * @returns {string} Git commit hash
 */
function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    console.error('Error getting Git commit:', error);
    return 'unknown';
  }
}

/**
 * Get current Git branch
 * @returns {string} Git branch name
 */
function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch (error) {
    console.error('Error getting Git branch:', error);
    return 'unknown';
  }
}

/**
 * Compare current results with history
 * @param {Array} results Current benchmark results
 * @param {Array} history Benchmark history
 */
function compareWithHistory(results, history) {
  if (history.length === 0) {
    console.log('No history to compare with');
    return;
  }
  
  // Get the previous results
  const previousEntry = history[history.length - 2];
  
  if (!previousEntry) {
    console.log('No previous results to compare with');
    return;
  }
  
  console.log(`\nComparing with previous results from ${previousEntry.timestamp}`);
  console.log(`Previous commit: ${previousEntry.commit}`);
  console.log(`Previous branch: ${previousEntry.branch}`);
  
  // Compare each benchmark
  for (const result of results) {
    const previousResult = previousEntry.results.find(r => r.name === result.name);
    
    if (!previousResult) {
      console.log(`\n${result.name}: New benchmark, no previous data`);
      continue;
    }
    
    const avgDiff = result.average - previousResult.average;
    const avgPercent = (avgDiff / previousResult.average) * 100;
    
    console.log(`\n${result.name}:`);
    console.log(`  Current average: ${result.average.toFixed(2)}ms`);
    console.log(`  Previous average: ${previousResult.average.toFixed(2)}ms`);
    console.log(`  Difference: ${avgDiff.toFixed(2)}ms (${avgPercent.toFixed(2)}%)`);
    
    if (avgPercent > 10) {
      console.log('  ⚠️ PERFORMANCE REGRESSION: More than 10% slower');
    } else if (avgPercent < -10) {
      console.log('  ✅ PERFORMANCE IMPROVEMENT: More than 10% faster');
    }
  }
}

/**
 * Generate a performance report
 * @param {Array} history Benchmark history
 */
function generateReport(history) {
  if (history.length === 0) {
    console.log('No history to generate report from');
    return;
  }
  
  console.log('Generating performance report...');
  
  let report = '# Performance Benchmark Report\n\n';
  report += `Generated on: ${new Date().toISOString()}\n\n`;
  
  // Add summary of latest run
  const latestEntry = history[history.length - 1];
  report += `## Latest Run (${latestEntry.timestamp})\n\n`;
  report += `- Commit: ${latestEntry.commit}\n`;
  report += `- Branch: ${latestEntry.branch}\n\n`;
  
  // Add table of results
  report += '| Benchmark | Average (ms) | Min (ms) | Max (ms) | Std Dev (ms) |\n';
  report += '|-----------|--------------|----------|----------|-------------|\n';
  
  for (const result of latestEntry.results) {
    report += `| ${result.name} | ${result.average.toFixed(2)} | ${result.min.toFixed(2)} | ${result.max.toFixed(2)} | ${result.stdDev.toFixed(2)} |\n`;
  }
  
  report += '\n## Historical Trends\n\n';
  
  // For each benchmark, show historical trend
  const benchmarkNames = [...new Set(latestEntry.results.map(r => r.name))];
  
  for (const name of benchmarkNames) {
    report += `### ${name}\n\n`;
    report += '| Date | Commit | Average (ms) | Change (%) |\n';
    report += '|------|--------|--------------|------------|\n';
    
    let previousAvg = null;
    
    for (const entry of history) {
      const result = entry.results.find(r => r.name === name);
      
      if (result) {
        const shortCommit = entry.commit.substring(0, 7);
        const date = entry.timestamp.split('T')[0];
        
        let change = '';
        if (previousAvg !== null) {
          const changePercent = ((result.average - previousAvg) / previousAvg) * 100;
          change = `${changePercent.toFixed(2)}%`;
          
          if (changePercent > 0) {
            change = `+${change} 🔴`;
          } else if (changePercent < 0) {
            change = `${change} 🟢`;
          }
        }
        
        report += `| ${date} | ${shortCommit} | ${result.average.toFixed(2)} | ${change} |\n`;
        
        previousAvg = result.average;
      }
    }
    
    report += '\n';
  }
  
  // Write report to file
  fs.writeFileSync(reportPath, report);
  console.log(`Report saved to ${reportPath}`);
}

/**
 * Main function
 */
async function main() {
  // Load history
  const history = loadHistory();
  console.log(`Loaded history with ${history.length} entries`);
  
  if (reportMode) {
    // Generate report only
    generateReport(history);
    return;
  }
  
  // Run benchmarks
  const results = await runBenchmarks();
  
  // Add to history
  const updatedHistory = addToHistory(results, history);
  
  // Save history
  saveHistory(updatedHistory);
  
  if (compareMode) {
    // Compare with history
    compareWithHistory(results, updatedHistory);
  }
  
  // Generate report
  generateReport(updatedHistory);
}

// Run main function
main().catch(console.error);
