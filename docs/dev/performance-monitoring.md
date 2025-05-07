# Performance Monitoring

This document describes the performance monitoring system for the Adamize project, including how to track performance metrics over time, interpret trends, and identify regressions.

## Overview

The performance monitoring system tracks the performance of critical operations over time, allowing you to:

1. **Detect Regressions**: Identify when changes negatively impact performance
2. **Track Improvements**: Measure the impact of performance optimizations
3. **Establish Baselines**: Set performance expectations for different operations
4. **Monitor Trends**: Observe how performance changes over time

## Running Performance Monitoring

### Locally

To run performance monitoring locally:

```bash
npm run benchmark:monitor
```

This will:
1. Run benchmarks
2. Add the results to the benchmark history
3. Generate a performance report

To compare the latest results with previous runs:

```bash
npm run benchmark:compare
```

To generate a report without running benchmarks:

```bash
npm run benchmark:report
```

### In CI

Performance monitoring runs automatically in CI:
- On pushes to the main branch
- On a daily schedule
- When manually triggered

The results are uploaded as artifacts and can be downloaded from the GitHub Actions page.

## Benchmark History

Benchmark history is stored in the `benchmark-history.json` file, which contains:
- Timestamp of each run
- Git commit hash
- Git branch name
- Benchmark results

Example entry:

```json
{
  "timestamp": "2023-05-07T12:34:56.789Z",
  "commit": "1234567890abcdef",
  "branch": "main",
  "results": [
    {
      "name": "MCP Client Connection",
      "average": 123.45,
      "min": 100.12,
      "max": 150.67,
      "stdDev": 20.34
    }
  ]
}
```

## Performance Reports

Performance reports are generated in Markdown format and include:
- Summary of the latest run
- Table of benchmark results
- Historical trends for each benchmark

Example report:

```markdown
# Performance Benchmark Report

Generated on: 2023-05-07T12:34:56.789Z

## Latest Run (2023-05-07T12:34:56.789Z)

- Commit: 1234567890abcdef
- Branch: main

| Benchmark | Average (ms) | Min (ms) | Max (ms) | Std Dev (ms) |
|-----------|--------------|----------|----------|--------------|
| MCP Client Connection | 123.45 | 100.12 | 150.67 | 20.34 |

## Historical Trends

### MCP Client Connection

| Date | Commit | Average (ms) | Change (%) |
|------|--------|--------------|------------|
| 2023-05-06 | abcdef1 | 130.67 | |
| 2023-05-07 | 1234567 | 123.45 | -5.53% 🟢 |
```

## Interpreting Results

When interpreting performance monitoring results, consider:

1. **Absolute Values**: Are the durations acceptable for the operation being measured?
2. **Relative Changes**: How do the results compare to previous runs?
3. **Trends**: Is performance improving or degrading over time?
4. **Variability**: Is the standard deviation high, indicating inconsistent performance?

### Performance Regressions

Performance regressions are flagged when a benchmark is more than 10% slower than the previous run. These are marked with a warning in the report and in CI.

### Performance Improvements

Performance improvements are noted when a benchmark is more than 10% faster than the previous run. These are marked with a green indicator in the report.

## Adding New Benchmarks

To add a new benchmark to the performance monitoring system:

1. Add the benchmark to the `scripts/benchmark.js` file
2. Run the benchmark to establish a baseline
3. Add the benchmark to the performance report

## Best Practices

1. **Run Regularly**: Monitor performance regularly to catch regressions early
2. **Establish Baselines**: Run benchmarks before and after significant changes
3. **Investigate Regressions**: When a regression is detected, investigate the cause
4. **Document Improvements**: When performance improves, document what caused the improvement
5. **Consider Environment**: Be aware that performance can vary based on the environment

## Troubleshooting

If you encounter issues with performance monitoring:

1. **Check Environment**: Ensure the environment is consistent with previous runs
2. **Increase Iterations**: Run more iterations to get more reliable results
3. **Reset History**: If the history is corrupted, you can delete the history file and start fresh
4. **Check CI Configuration**: Ensure the CI workflow is configured correctly
