/**
 * Benchmark script for evaluating Qwen 3 models on TypeScript code fixing tasks
 *
 * This script measures:
 * 1. Quality of fixes (accuracy in addressing TypeScript errors)
 * 2. Processing speed (tokens per second)
 * 3. Memory usage during inference
 * 4. Comparison with baseline performance
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const MODELS = ['qwen3:8b', 'qwen3:4b', 'qwen3-typescript', 'qwen3-4b-typescript'];

// Sample TypeScript files with known issues
const TEST_FILES = [
  {
    name: 'Naming Conventions',
    path: 'benchmark/naming-conventions.ts',
    content: `
// Test file with naming convention issues
class UserManager {
  // Private property without underscore
  private userId: string;
  private userRole: string;

  // Constructor with unused parameter
  constructor(userId: string, userRole: string, config: any) {
    this.userId = userId;
    this.userRole = userRole;
  }

  // Method with snake_case parameter
  public getUserDetails(user_id: string, include_metadata: boolean) {
    return {
      id: user_id,
      role: this.userRole,
      metadata: include_metadata ? { lastLogin: new Date() } : undefined
    };
  }
}

// Enum with uppercase members
enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended"
}

// Interface without I prefix
interface UserData {
  id: string;
  role: string;
  status: UserStatus;
  last_login_date: Date;
}
`,
    expectedFixes: [
      'private _userId',
      'private _userRole',
      'constructor(userId: string, userRole: string, _config: any)',
      'getUserDetails(userId: string, includeMetadata: boolean)',
      'enum UserStatus {\n  active = "active",\n  inactive = "inactive",\n  suspended = "suspended"',
      'interface IUserData',
      'lastLoginDate: Date',
    ],
  },
  {
    name: 'Type Safety',
    path: 'benchmark/type-safety.ts',
    content: `
// Test file with type safety issues
function processData(data: any) {
  return data.map(item => item.value * 2);
}

// Missing return type
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Implicit any
const filterItems = (items, predicate) => {
  return items.filter(predicate);
};

// @ts-ignore instead of @ts-expect-error
// @ts-ignore
const unsafeOperation = (input) => {
  return input.nonExistentMethod();
};

class DataProcessor {
  // Method with implicit return type
  process(data) {
    return data.processed;
  }

  // Method with any parameter
  validate(input) {
    return typeof input.id === 'string';
  }
}
`,
    expectedFixes: [
      'function processData(data: any[])',
      'function calculateTotal(items: { price: number }[]): number',
      'const filterItems = <T>(items: T[], predicate: (item: T) => boolean): T[]',
      '@ts-expect-error',
      'process(data: any): any',
      'validate(input: { id: any }): boolean',
    ],
  },
  {
    name: 'Missing Implementations',
    path: 'benchmark/missing-implementations.ts',
    content: `
// Test file with missing implementations
interface ILogger {
  log(message: string): void;
  error(message: string, error?: Error): void;
  warn(message: string): void;
  debug(message: string, data?: any): void;
}

class ConsoleLogger implements ILogger {
  log(message: string): void {
    console.log(message);
  }

  error(message: string, error?: Error): void {
    console.error(message, error);
  }

  // Missing implementation
  warn(message: string): void;

  // Missing implementation
  debug(message: string, data?: any): void;
}

abstract class BaseService {
  protected abstract initialize(): Promise<void>;
  protected abstract shutdown(): Promise<void>;

  public async start(): Promise<void> {
    await this.initialize();
    console.log('Service started');
  }

  public async stop(): Promise<void> {
    await this.shutdown();
    console.log('Service stopped');
  }
}

class UserService extends BaseService {
  // Missing implementation of abstract methods
}
`,
    expectedFixes: [
      'warn(message: string): void {\n    console.warn(message);\n  }',
      'debug(message: string, data?: any): void {\n    console.debug(message, data);\n  }',
      'protected async initialize(): Promise<void> {\n    // Implementation\n  }',
      'protected async shutdown(): Promise<void> {\n    // Implementation\n  }',
    ],
  },
];

// Create benchmark directory and test files
function setupBenchmarkFiles() {
  console.log('Setting up benchmark files...');

  if (!fs.existsSync('benchmark')) {
    fs.mkdirSync('benchmark');
  }

  TEST_FILES.forEach(file => {
    fs.writeFileSync(file.path, file.content);
    console.log(`Created ${file.path}`);
  });
}

// Run TypeScript compiler to check for errors
function countTypeScriptErrors(filePath) {
  try {
    const result = execSync(`npx tsc ${filePath} --noEmit`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return 0;
  } catch (error) {
    // Count the number of errors
    const errorOutput = error.stdout || '';
    const errorCount = (errorOutput.match(/error TS\d+:/g) || []).length;
    return errorCount;
  }
}

// Calculate fix accuracy
function calculateFixAccuracy(originalContent, fixedContent, expectedFixes) {
  let score = 0;

  expectedFixes.forEach(expectedFix => {
    if (fixedContent.includes(expectedFix)) {
      score++;
    }
  });

  return {
    fixedCount: score,
    totalExpected: expectedFixes.length,
    percentage: Math.round((score / expectedFixes.length) * 100),
  };
}

// Run benchmark for a specific model and file
async function benchmarkModelOnFile(model, testFile) {
  console.log(`\nBenchmarking ${model} on ${testFile.name}...`);

  const originalContent = fs.readFileSync(testFile.path, 'utf8');
  const originalErrorCount = countTypeScriptErrors(testFile.path);

  console.log(`Original TypeScript errors: ${originalErrorCount}`);

  const prompt = `
Fix TypeScript errors in this file:
\`\`\`typescript
${originalContent}
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

  // Measure execution time and memory usage
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

  try {
    // Run the model
    const { stdout, stderr } = await execPromise(
      `ollama run ${model} "${prompt.replace(/"/g, '\\"')}"`,
      {
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large outputs
      }
    );

    const endTime = process.hrtime(startTime);
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    const executionTimeMs = endTime[0] * 1000 + endTime[1] / 1000000;
    const memoryUsageMB = endMemory - startMemory;

    // Extract code from response
    const codeMatch =
      stdout.match(/```typescript\n([\s\S]*?)\n```/) ||
      stdout.match(/```ts\n([\s\S]*?)\n```/) ||
      stdout.match(/```\n([\s\S]*?)\n```/);

    if (codeMatch && codeMatch[1]) {
      const fixedCode = codeMatch[1];

      // Write fixed code to a temporary file
      const tempFilePath = `${testFile.path}.fixed`;
      fs.writeFileSync(tempFilePath, fixedCode);

      // Count errors in fixed code
      const fixedErrorCount = countTypeScriptErrors(tempFilePath);

      // Calculate accuracy
      const accuracy = calculateFixAccuracy(originalContent, fixedCode, testFile.expectedFixes);

      // Calculate tokens per second (approximate)
      const inputTokens = originalContent.split(/\s+/).length;
      const outputTokens = fixedCode.split(/\s+/).length;
      const totalTokens = inputTokens + outputTokens;
      const tokensPerSecond = Math.round(totalTokens / (executionTimeMs / 1000));

      // Clean up
      fs.unlinkSync(tempFilePath);

      return {
        model,
        testFile: testFile.name,
        originalErrorCount,
        fixedErrorCount,
        errorReductionPercent:
          originalErrorCount > 0
            ? Math.round(((originalErrorCount - fixedErrorCount) / originalErrorCount) * 100)
            : 0,
        accuracy,
        executionTimeMs,
        memoryUsageMB,
        tokensPerSecond,
      };
    } else {
      console.error('Could not extract code from model response');
      return {
        model,
        testFile: testFile.name,
        error: 'Could not extract code from model response',
      };
    }
  } catch (error) {
    console.error(`Error running model: ${error.message}`);
    return {
      model,
      testFile: testFile.name,
      error: error.message,
    };
  }
}

// Run all benchmarks
async function runBenchmarks() {
  setupBenchmarkFiles();

  const results = [];

  for (const model of MODELS) {
    for (const testFile of TEST_FILES) {
      const result = await benchmarkModelOnFile(model, testFile);
      results.push(result);

      // Print individual result
      console.log('\nResult:');
      console.log(JSON.stringify(result, null, 2));
    }
  }

  // Aggregate results by model
  const aggregatedResults = {};

  MODELS.forEach(model => {
    const modelResults = results.filter(r => r.model === model && !r.error);

    if (modelResults.length > 0) {
      const avgExecutionTime =
        modelResults.reduce((sum, r) => sum + r.executionTimeMs, 0) / modelResults.length;
      const avgMemoryUsage =
        modelResults.reduce((sum, r) => sum + r.memoryUsageMB, 0) / modelResults.length;
      const avgTokensPerSecond =
        modelResults.reduce((sum, r) => sum + r.tokensPerSecond, 0) / modelResults.length;
      const avgAccuracy =
        modelResults.reduce((sum, r) => sum + r.accuracy.percentage, 0) / modelResults.length;
      const avgErrorReduction =
        modelResults.reduce((sum, r) => sum + r.errorReductionPercent, 0) / modelResults.length;

      aggregatedResults[model] = {
        avgExecutionTimeMs: Math.round(avgExecutionTime),
        avgMemoryUsageMB: Math.round(avgMemoryUsage * 100) / 100,
        avgTokensPerSecond: Math.round(avgTokensPerSecond),
        avgAccuracyPercent: Math.round(avgAccuracy),
        avgErrorReductionPercent: Math.round(avgErrorReduction),
      };
    }
  });

  // Print summary
  console.log('\n=== BENCHMARK SUMMARY ===');
  console.log(JSON.stringify(aggregatedResults, null, 2));

  // Save results to file
  fs.writeFileSync(
    'benchmark-results.json',
    JSON.stringify(
      {
        detailed: results,
        summary: aggregatedResults,
      },
      null,
      2
    )
  );

  console.log('\nBenchmark complete! Results saved to benchmark-results.json');
}

// Run the benchmarks
runBenchmarks().catch(console.error);
