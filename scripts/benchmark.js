#!/usr/bin/env node

/**
 * Performance Benchmarking Script
 *
 * This script measures the performance of critical operations in the Adamize extension.
 * It runs a series of benchmarks and generates a report with the results.
 *
 * Usage:
 *   node scripts/benchmark.js [--output=<output-file>] [--iterations=<number>]
 *
 * Example:
 *   node scripts/benchmark.js
 *   node scripts/benchmark.js --output=benchmark-results.json --iterations=10
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
let outputFile = 'benchmark-results.json';
let iterations = 5;

args.forEach(arg => {
  if (arg.startsWith('--output=')) {
    outputFile = arg.split('=')[1];
  } else if (arg.startsWith('--iterations=')) {
    iterations = parseInt(arg.split('=')[1], 10);
  }
});

// Ensure the output directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Define benchmarks
const benchmarks = [
  {
    name: 'MCP Client Connection',
    description: 'Measures the time it takes to connect to an MCP server',
    setup: () => {
      // Compile the code if needed
      try {
        execSync('npm run compile', { stdio: 'ignore' });
      } catch (error) {
        console.error('Error compiling code:', error.message);
      }
    },
    run: async () => {
      try {
        // Import the MCPClient class
        const { MCPClient } = require('../out/mcp/mcpClient');

        // Create a client with a mock server URL
        const client = new MCPClient('http://localhost:8000');

        // Measure connection time
        const start = performance.now();
        await client.connect();
        return performance.now() - start;
      } catch (error) {
        console.error('Error in MCP Client Connection benchmark:', error.message);
        return -1; // Indicate error
      }
    }
  },
  {
    name: 'Memory Client Search',
    description: 'Measures the time it takes to search the memory client',
    setup: () => {
      // No additional setup needed
    },
    run: async () => {
      try {
        // Import the MemoryClient class
        const { MemoryClient } = require('../out/memory/memoryClient');

        // Create a client with a mock server URL
        const client = new MemoryClient('http://localhost:8001');

        // Measure search time
        const start = performance.now();
        await client.searchNodes('test query');
        return performance.now() - start;
      } catch (error) {
        console.error('Error in Memory Client Search benchmark:', error.message);
        return -1; // Indicate error
      }
    }
  },
  {
    name: 'Extension Activation',
    description: 'Measures the time it takes to activate the extension',
    setup: () => {
      // No additional setup needed
    },
    run: async () => {
      try {
        // Import the extension
        const extension = require('../out/extension');

        // Measure activation time
        const start = performance.now();
        await extension.activate({ subscriptions: [] });
        return performance.now() - start;
      } catch (error) {
        console.error('Error in Extension Activation benchmark:', error.message);
        return -1; // Indicate error
      }
    }
  },
  {
    name: 'MCP Tool Discovery',
    description: 'Measures the time it takes to discover MCP tools',
    setup: () => {
      // No additional setup needed
    },
    run: async () => {
      try {
        // Import the MCPClient class
        const { MCPClient } = require('../out/mcp/mcpClient');

        // Create a client with a mock server URL
        const client = new MCPClient('http://localhost:8000');

        // Connect to the server
        await client.connect();

        // Measure tool discovery time
        const start = performance.now();
        await client.discoverTools();
        return performance.now() - start;
      } catch (error) {
        console.error('Error in MCP Tool Discovery benchmark:', error.message);
        return -1; // Indicate error
      }
    }
  },
  {
    name: 'MCP Function Call',
    description: 'Measures the time it takes to call an MCP function',
    setup: () => {
      // No additional setup needed
    },
    run: async () => {
      try {
        // Import the MCPClient class
        const { MCPClient } = require('../out/mcp/mcpClient');

        // Create a client with a mock server URL
        const client = new MCPClient('http://localhost:8000');

        // Connect to the server
        await client.connect();

        // Discover tools
        await client.discoverTools();

        // Measure function call time
        const start = performance.now();
        await client.callFunction('test-tool', 'test-function', { param: 'value' });
        return performance.now() - start;
      } catch (error) {
        console.error('Error in MCP Function Call benchmark:', error.message);
        return -1; // Indicate error
      }
    }
  },
  {
    name: 'Enhanced MCP Client Connection',
    description: 'Measures the time it takes to connect to an MCP server using the enhanced client',
    setup: () => {
      // No additional setup needed
    },
    run: async () => {
      try {
        // Import the EnhancedMCPClient class
        const { EnhancedMCPClient } = require('../out/mcp/enhancedMcpClient');

        // Create a client with a mock server URL
        const client = new EnhancedMCPClient('http://localhost:8000');

        // Measure connection time
        const start = performance.now();
        await client.connect();
        return performance.now() - start;
      } catch (error) {
        console.error('Error in Enhanced MCP Client Connection benchmark:', error.message);
        return -1; // Indicate error
      }
    }
  },
  {
    name: 'File System Operations',
    description: 'Measures the time it takes to perform common file system operations',
    setup: () => {
      // Create a temporary directory for testing
      const tempDir = path.join(__dirname, '..', 'temp-benchmark');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    },
    run: async () => {
      try {
        const tempDir = path.join(__dirname, '..', 'temp-benchmark');
        const testFile = path.join(tempDir, 'test-file.txt');

        // Measure file system operations time
        const start = performance.now();

        // Write to file
        fs.writeFileSync(testFile, 'Test content');

        // Read from file
        const content = fs.readFileSync(testFile, 'utf8');

        // Check file stats
        const stats = fs.statSync(testFile);

        // Delete file
        fs.unlinkSync(testFile);

        return performance.now() - start;
      } catch (error) {
        console.error('Error in File System Operations benchmark:', error.message);
        return -1; // Indicate error
      } finally {
        // Clean up
        const tempDir = path.join(__dirname, '..', 'temp-benchmark');
        if (fs.existsSync(tempDir)) {
          try {
            fs.rmdirSync(tempDir, { recursive: true });
          } catch (error) {
            console.error('Error cleaning up temp directory:', error.message);
          }
        }
      }
    }
  },
  {
    name: 'Model Manager Operations',
    description: 'Measures the time it takes to perform model manager operations',
    setup: () => {
      // Create a mock output channel
      global.mockOutputChannel = {
        appendLine: () => {},
        append: () => {},
        clear: () => {},
        show: () => {},
        hide: () => {},
        dispose: () => {}
      };

      // Create a mock extension context
      global.mockContext = {
        globalStorageUri: {
          fsPath: path.join(__dirname, '..', 'temp-benchmark')
        },
        subscriptions: []
      };

      // Create the temp directory
      const tempDir = path.join(__dirname, '..', 'temp-benchmark', 'models');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    },
    run: async () => {
      try {
        // Import the ModelManager class
        const { ModelManager } = require('../out/utils/modelManager');

        // Create a model manager
        const manager = new ModelManager(global.mockContext, global.mockOutputChannel);

        // Measure model manager operations time
        const start = performance.now();

        // Discover local models
        await manager.discoverLocalModels();

        // List models
        await manager.listModels();

        return performance.now() - start;
      } catch (error) {
        console.error('Error in Model Manager Operations benchmark:', error.message);
        return -1; // Indicate error
      } finally {
        // Clean up
        const tempDir = path.join(__dirname, '..', 'temp-benchmark');
        if (fs.existsSync(tempDir)) {
          try {
            fs.rmdirSync(tempDir, { recursive: true });
          } catch (error) {
            console.error('Error cleaning up temp directory:', error.message);
          }
        }

        // Clean up globals
        delete global.mockOutputChannel;
        delete global.mockContext;
      }
    }
  }
];

// Run benchmarks
async function runBenchmarks() {
  console.log('Running performance benchmarks...');

  const results = [];

  for (const benchmark of benchmarks) {
    console.log(`\nBenchmark: ${benchmark.name}`);
    console.log(benchmark.description);

    // Run setup
    console.log('Setting up...');
    benchmark.setup();

    // Run benchmark multiple times
    const durations = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`  Iteration ${i + 1}/${iterations}...`);
      const duration = await benchmark.run();

      if (duration >= 0) {
        durations.push(duration);
        console.log(`  Duration: ${duration.toFixed(2)}ms`);
      } else {
        console.log('  Failed to run benchmark');
      }
    }

    // Calculate statistics
    if (durations.length > 0) {
      const avg = durations.reduce((sum, val) => sum + val, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);

      // Calculate standard deviation
      const variance = durations.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);

      console.log(`\nResults for ${benchmark.name}:`);
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  Min: ${min.toFixed(2)}ms`);
      console.log(`  Max: ${max.toFixed(2)}ms`);
      console.log(`  Std Dev: ${stdDev.toFixed(2)}ms`);

      results.push({
        name: benchmark.name,
        description: benchmark.description,
        iterations: durations.length,
        average: avg,
        min,
        max,
        stdDev,
        durations
      });
    } else {
      console.log(`\nNo valid results for ${benchmark.name}`);

      results.push({
        name: benchmark.name,
        description: benchmark.description,
        error: 'Failed to run benchmark'
      });
    }
  }

  // Save results
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\nBenchmark results saved to ${outputFile}`);
}

// Run benchmarks
runBenchmarks().catch(error => {
  console.error('Error running benchmarks:', error);
  process.exit(1);
});
