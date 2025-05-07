# Dependency Management

This document describes the dependency management workflow for the Adamize project, including automated updates with Dependabot and Renovate.

## Overview

The project uses two complementary tools for dependency management:

1. **GitHub Dependabot**: Integrated directly with GitHub, provides security alerts and automated updates
2. **Renovate**: More flexible dependency management with advanced grouping and scheduling options

Both tools automatically create pull requests when updates are available, allowing you to review changes before merging.

## GitHub Dependabot

Dependabot is configured to:

- Check for npm package updates weekly (every Monday)
- Check for GitHub Actions updates weekly
- Group minor and patch updates for development and production dependencies
- Limit the number of open pull requests to 10
- Add appropriate labels to pull requests
- Assign reviewers automatically

### Configuration

Dependabot is configured in the `.github/dependabot.yml` file. You can customize the configuration by editing this file.

### Security Alerts

Dependabot also provides security alerts for vulnerable dependencies. These alerts appear in the "Security" tab of your GitHub repository.

## Renovate

Renovate is configured to:

- Run on a schedule (after 10pm and before 5am)
- Group updates by type (dev dependencies, production dependencies, etc.)
- Auto-merge minor and patch updates for dev dependencies
- Maintain lock files automatically
- Provide a dependency dashboard for monitoring updates

### Configuration

Renovate is configured in the `renovate.json` file at the root of the repository. You can customize the configuration by editing this file.

### Dependency Dashboard

Renovate creates a "Dependency Dashboard" issue in your repository, which provides an overview of all pending updates and allows you to control when updates are processed.

## Manual Dependency Updates

While automated tools handle most updates, you may sometimes need to update dependencies manually:

```bash
# Update a specific package
npm update package-name

# Update all packages according to package.json
npm update

# Update a package to a specific version
npm install package-name@version
```

After updating dependencies manually, make sure to run tests to ensure everything still works:

```bash
npm run test
```

## Handling Dependency Conflicts

If you encounter dependency conflicts:

1. Check the error message to identify conflicting packages
2. Update the conflicting packages one by one
3. If conflicts persist, consider using `npm ls package-name` to see the dependency tree
4. For complex conflicts, you might need to use `npm-check-updates` or similar tools

## Best Practices

1. **Review Changes**: Always review the changes in dependency update pull requests
2. **Check Breaking Changes**: Pay special attention to major version updates, which may include breaking changes
3. **Run Tests**: Make sure all tests pass after updating dependencies
4. **Update Gradually**: Update dependencies gradually, especially for major versions
5. **Keep Documentation Updated**: Update documentation if dependency changes require it

## Troubleshooting

If you encounter issues with dependency updates:

1. **Check Logs**: Review the logs in the pull request to identify the issue
2. **Manual Update**: Try updating the dependency manually to see if you can reproduce the issue
3. **Skip Update**: If an update is causing problems, you can skip it by closing the pull request
4. **Pin Version**: For problematic dependencies, consider pinning to a specific version in package.json
