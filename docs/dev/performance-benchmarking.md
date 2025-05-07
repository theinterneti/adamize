# Performance Benchmarking

This document describes the performance benchmarking workflow for the Adamize project, including how to run benchmarks, interpret results, and add new benchmarks.

## Overview

Performance benchmarking is essential for ensuring that the Adamize extension remains responsive and efficient. The project includes a benchmarking system that measures the performance of critical operations and tracks changes over time.

## Running Benchmarks

### Locally

To run benchmarks locally:

```bash
npm run benchmark
```

This will run all benchmarks and output the results to the console.

You can also specify an output file and the number of iterations:

```bash
npm run benchmark -- --output=my-results.json --iterations=10
```

### In CI

Benchmarks are automatically run as part of the CI workflow. The results are uploaded as artifacts and can be downloaded from the GitHub Actions page.

## Benchmark Results

Benchmark results include the following metrics:

- **Average**: The average duration of the benchmark across all iterations
- **Min**: The minimum duration of the benchmark
- **Max**: The maximum duration of the benchmark
- **Std Dev**: The standard deviation of the benchmark durations
- **Durations**: An array of all durations for each iteration

Example result:

```json
{
  "name": "MCP Client Connection",
  "description": "Measures the time it takes to connect to an MCP server",
  "iterations": 5,
  "average": 123.45,
  "min": 100.12,
  "max": 150.67,
  "stdDev": 20.34,
  "durations": [120.12, 130.45, 100.12, 150.67, 115.89]
}
```

## Adding New Benchmarks

To add a new benchmark, edit the `scripts/benchmark.js` file and add a new entry to the `benchmarks` array:

```javascript
{
  name: 'My New Benchmark',
  description: 'Description of what this benchmark measures',
  setup: () => {
    // Setup code to run before the benchmark
  },
  run: async () => {
    // Code to benchmark
    const start = performance.now();
    // ... code to measure ...
    return performance.now() - start;
  }
}
```

## Best Practices

1. **Isolate Operations**: Ensure that benchmarks measure specific operations in isolation
2. **Consistent Environment**: Run benchmarks in a consistent environment for comparable results
3. **Multiple Iterations**: Always run multiple iterations to account for variability
4. **Benchmark Critical Paths**: Focus on benchmarking operations that are critical to user experience
5. **Track Over Time**: Compare benchmark results over time to identify performance regressions

## Interpreting Results

When interpreting benchmark results, consider the following:

1. **Absolute Values**: Are the durations acceptable for the operation being measured?
2. **Relative Changes**: How do the results compare to previous runs?
3. **Variability**: Is the standard deviation high, indicating inconsistent performance?
4. **Outliers**: Are there any extreme values that might indicate issues?

## Troubleshooting

If benchmarks are failing or showing unexpected results:

1. **Check Dependencies**: Ensure all dependencies are installed correctly
2. **Check Environment**: Verify that the environment is consistent with previous runs
3. **Isolate Issues**: Run specific benchmarks in isolation to identify problematic ones
4. **Increase Iterations**: Run more iterations to get more reliable results
5. **Debug Mode**: Add logging to the benchmark code to understand what's happening
