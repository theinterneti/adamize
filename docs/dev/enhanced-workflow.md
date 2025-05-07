# Enhanced Development Workflow

This document describes the enhanced development workflow for the Adamize project, including pre-commit and pre-push hooks, release automation, branch naming conventions, and code quality metrics.

## Pre-commit Workflow

The pre-commit workflow is designed to catch issues early and provide fast feedback to developers. It runs automatically before each commit.

### What's Checked

- **Linting and Formatting**: ESLint and Prettier are run on all changed files
- **TypeScript Compilation**: The TypeScript compiler is run to check for type errors
- **Optimized Testing**: Only tests related to changed files are run for faster feedback

### Configuration

The pre-commit checks are configured in the following files:

- `.husky/pre-commit`: The pre-commit hook script
- `.lintstagedrc.js`: Configuration for lint-staged, which runs linters on staged files

## Pre-push Workflow

The pre-push workflow is more comprehensive and is designed to ensure that the code will pass CI checks. It runs automatically before pushing to the remote repository.

### What's Checked

- **Full Test Suite**: All tests are run with coverage to ensure that the code works as expected
- **CI Compatibility**: A script is run to check that the code will pass CI checks
- **Branch Naming**: Ensures that branch names follow the project's naming convention
- **Security Vulnerabilities**: Checks for security vulnerabilities in dependencies

### Configuration

The pre-push checks are configured in the following files:

- `.husky/pre-push`: The pre-push hook script
- `scripts/check-ci-compatibility.js`: Script to check CI compatibility
- `scripts/check-branch-name.js`: Script to check branch naming convention

## Branch Naming Conventions

Branch names should follow this pattern:

```
(feature|bugfix|hotfix|release|docs|refactor|test|ci)/name-with-hyphens
```

Examples of valid branch names:
- `feature/add-new-command`
- `bugfix/fix-connection-issue`
- `docs/update-readme`
- `refactor/improve-error-handling`

The branch naming convention is enforced by the `check:branch` script, which is run as part of the pre-push workflow.

## Commit Message Format

Commit messages follow the Conventional Commits format, which helps with generating changelogs and versioning.

Examples of valid commit messages:
- `feat: add new command to list MCP tools`
- `fix: resolve connection issue with MCP server`
- `docs: update README with installation instructions`
- `refactor: improve error handling in MCP client`

The commit message format is configured in the following files:
- `.husky/commit-msg`: The commit-msg hook script
- `commitlint.config.js`: Configuration for commitlint

## Release Automation

The project uses standard-version for release automation, which automatically generates changelogs and version numbers based on commit messages.

### Available Commands

- `npm run release`: Generate a new release based on commit messages
- `npm run release:minor`: Generate a new minor release
- `npm run release:major`: Generate a new major release
- `npm run release:patch`: Generate a new patch release

## Code Quality Metrics

The project uses ESLint with additional plugins to enforce code quality metrics:

- **SonarJS**: Detects bugs and code smells
- **Complexity**: Limits the complexity of functions

### Configuration

The code quality metrics are configured in the following files:
- `.eslintrc.js`: Configuration for ESLint and plugins

## Security Scanning

The project includes security scanning to detect vulnerabilities in dependencies.

### Available Commands

- `npm run security:check`: Check for security vulnerabilities
- `npm run security:fix`: Fix security vulnerabilities

## Pre-PR Checks

Before creating a pull request, run the following command to ensure that the code will pass CI checks:

```bash
npm run pre:pr
```

This command runs:
- Linting
- Type checking
- Unit tests
- CI compatibility check
- Security check
- Branch naming check

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

## Dependency Management

The project uses automated dependency management tools to keep dependencies up-to-date:

- **GitHub Dependabot**: Automatically creates PRs for dependency updates and security fixes
- **Renovate**: Provides more flexible dependency management with advanced grouping and scheduling

For more details, see [dependency-management.md](./dependency-management.md).

## Troubleshooting

If you encounter issues with the development workflow, try the following:

1. **Reinstall Husky**: Run `npm run prepare` to reinstall Husky
2. **Check Permissions**: Ensure that the hook scripts are executable (`chmod +x .husky/*`)
3. **Check Configuration**: Ensure that the configuration files are correct
4. **Run Checks Manually**: Run the checks manually to see if they pass
