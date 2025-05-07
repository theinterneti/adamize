# Pre-Commit Workflow

This document describes the pre-commit workflow for the Adamize project. The workflow is designed to ensure that code quality is maintained and that CI checks pass before code is committed or pushed to the repository.

## Overview

The pre-commit workflow consists of several checks that are run automatically before code is committed or pushed:

1. **Pre-Commit Checks**: Run before each commit to ensure code quality
   - Linting and formatting
   - TypeScript compilation
   - Unit tests

2. **Pre-Push Checks**: Run before pushing to the remote repository
   - Full test suite with coverage
   - CI compatibility check

## Pre-Commit Checks

The pre-commit checks are run automatically before each commit. They are designed to be fast and to catch common issues early.

### What's Checked

- **Linting and Formatting**: ESLint and Prettier are run on all changed files
- **TypeScript Compilation**: The TypeScript compiler is run to check for type errors
- **Unit Tests**: Jest unit tests are run to ensure that the code works as expected

### Configuration

The pre-commit checks are configured in the following files:

- `.husky/pre-commit`: The pre-commit hook script
- `.lintstagedrc.js`: Configuration for lint-staged, which runs linters on staged files

## Pre-Push Checks

The pre-push checks are run automatically before pushing to the remote repository. They are more comprehensive than the pre-commit checks and are designed to ensure that the code will pass CI checks.

### What's Checked

- **Full Test Suite**: All tests are run with coverage to ensure that the code works as expected
- **CI Compatibility**: A script is run to check that the code will pass CI checks

### Configuration

The pre-push checks are configured in the following files:

- `.husky/pre-push`: The pre-push hook script
- `scripts/check-ci-compatibility.js`: Script to check CI compatibility

## Commit Message Format

Commit messages are checked to ensure they follow the Conventional Commits format. This helps with generating changelogs and versioning.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit
- `wip`: Work in progress

### Configuration

The commit message format is configured in the following files:

- `.husky/commit-msg`: The commit-msg hook script
- `commitlint.config.js`: Configuration for commitlint

## Skipping Checks

In some cases, you may need to skip the pre-commit or pre-push checks. This should be done sparingly and only when necessary.

### Skipping Pre-Commit Checks

```bash
git commit -m "your message" --no-verify
```

### Skipping Pre-Push Checks

```bash
git push --no-verify
```

## Troubleshooting

If you encounter issues with the pre-commit workflow, try the following:

1. **Reinstall Husky**: Run `npm run prepare` to reinstall Husky
2. **Check Permissions**: Ensure that the hook scripts are executable (`chmod +x .husky/*`)
3. **Check Configuration**: Ensure that the configuration files are correct
4. **Run Checks Manually**: Run the checks manually to see if they pass

## Best Practices

- **Commit Often**: Make small, focused commits that are easy to review
- **Write Good Commit Messages**: Follow the Conventional Commits format
- **Fix Issues Early**: Fix issues as soon as they are detected
- **Run CI Checks Locally**: Run `npm run check:ci` before pushing to ensure that CI checks will pass
