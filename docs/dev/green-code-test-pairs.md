# GREEN Code-Test Pairs Identification

This document describes the GREEN code-test pairs identification feature, which helps with Test-Driven Development (TDD) by automatically identifying, staging, and optionally committing passing tests and their corresponding implementations.

## Overview

In Test-Driven Development, we follow the "Red-Green-Refactor" cycle:

1. **Red**: Write a failing test
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Improve the code while keeping the test passing

The GREEN code-test pairs identification feature helps with this workflow by automatically identifying when tests pass (the "Green" phase) and staging the relevant files for commit. This makes it easier to commit code at the right point in the TDD cycle.

## Features

- **Automatic Test Running**: Runs tests to identify passing tests
- **Implementation File Mapping**: Maps test files to their implementation files
- **Automatic Staging**: Stages passing tests and their implementations
- **Automatic Committing**: Optionally commits the staged files
- **Tag-Based Mapping**: Uses the project's tagging system (REQ-XXX-YYY, TEST-XXX-YYY, IMPL-XXX-YYY) to map tests to implementations
- **Commit Message Generation**: Generates commit messages based on test descriptions

## Usage

### Command Line

The feature can be used directly from the command line:

```bash
# Identify and stage passing tests and their implementations
npm run identify:green

# Identify, stage, and commit passing tests
npm run identify:green:commit

# Dry run (show what would be staged/committed without actually doing it)
npm run identify:green:dry

# Run with custom options
node scripts/identify-green-pairs.js --verbose --commit --message="feat: implement feature X"
```

### TDD Integration

The feature is integrated with the TDD workflow:

```bash
# Watch for changes and automatically stage passing tests
npm run tdd:auto-stage

# Watch for changes and automatically commit passing tests
npm run tdd:auto-commit
```

### Options

The `identify-green-pairs.js` script supports the following options:

- `--stage`: Stage the files for commit (default: true)
- `--no-stage`: Don't stage the files
- `--commit`: Automatically commit the files (default: false)
- `--message=<commit-message>`: Custom commit message
- `--verbose`: Show detailed output
- `--dry-run`: Show what would be staged/committed without actually doing it

## How It Works

1. **Test Running**: The script runs Jest tests and captures the results in JSON format
2. **Test Analysis**: It analyzes the test results to identify passing tests
3. **Implementation Mapping**: It maps test files to implementation files using:
   - File naming conventions (e.g., `foo.test.ts` -> `foo.ts`)
   - Directory structure patterns
   - Tag-based mapping (matching TEST-XXX-YYY with IMPL-XXX-YYY tags)
4. **Staging**: It stages the passing test files and their implementations
5. **Committing**: If enabled, it commits the staged files with a generated or custom message

## Implementation Details

### File Mapping Strategies

The script uses several strategies to map test files to implementation files:

1. **Pattern-Based Mapping**: Uses predefined patterns to map test files to implementation files
   - `src/test/suite/path/to/file.test.ts` -> `src/path/to/file.ts`
   - `src/test/suite/mcp/file.test.ts` -> `src/mcp/file.ts`

2. **Simple Replacement**: Falls back to simple path replacement if no pattern matches
   - Replaces `src/test/suite/` with `src/`
   - Removes `.test.ts` suffix

3. **Tag-Based Mapping**: Uses the project's tagging system to map tests to implementations
   - Extracts TEST-XXX-YYY tags from test files
   - Searches for IMPL-XXX-YYY tags in implementation files
   - Maps tests to implementations with matching tags

### Commit Message Generation

The script generates commit messages based on test descriptions:

- For a single passing test: `feat: implement <test description>`
- For multiple passing tests: `feat: implement <count> passing tests` with a list of test descriptions

## Configuration

The script can be configured by modifying the following constants in `scripts/identify-green-pairs.js`:

- `TEST_FILE_SUFFIX`: The suffix for test files (default: `.test.ts`)
- `IMPLEMENTATION_PATTERNS`: Patterns for mapping test files to implementation files
- `REQ_TAG_PATTERN`, `TEST_TAG_PATTERN`, `IMPL_TAG_PATTERN`: Regular expressions for extracting tags

## Integration with Git Workflow

This feature is designed to integrate with the project's Git workflow:

- It respects the conventional commits format
- It can be used with pre-commit hooks
- It can be integrated with CI/CD pipelines

## Future Improvements

Potential future improvements include:

- **Granular Staging**: Stage only the specific functions that pass tests, not entire files
- **Dependency Tracking**: If A depends on B and B's tests pass, stage both
- **Interactive Mode**: Allow reviewing and confirming staging decisions
- **Coverage-Based Mapping**: Use code coverage to improve mapping accuracy
- **Custom Mapping Rules**: Allow defining custom mapping rules in configuration
