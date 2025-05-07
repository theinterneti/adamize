# Adamize VS Code Extension Development Container

This is a development container configuration for building VS Code extensions for the Adamize project.

## Features

- Node.js 18 development environment
- TypeScript and ESLint pre-configured
- VS Code extension development tools pre-installed
- Docker-in-Docker support
- Git and GitHub CLI integration

## Getting Started

1. Open the project in VS Code
2. When prompted, click "Reopen in Container"
3. Wait for the container to build and initialize
4. Start developing your VS Code extension!

## Development Workflow

1. Make changes to the code in the `src` directory
2. Press F5 to launch a new VS Code window with your extension loaded
3. Run commands from the Command Palette (`Ctrl+Shift+P`) to test your extension
4. Set breakpoints in your code to debug issues
5. Run tests with `npm test`

## Building and Packaging

To package your extension for distribution:

```bash
npm run vscode:prepublish
npx @vscode/vsce package
```

This will create a `.vsix` file that can be installed in VS Code.

## Troubleshooting

If you encounter issues with the development container:

1. Try rebuilding the container: Command Palette > "Remote-Containers: Rebuild Container"
2. Check Docker logs: `docker logs <container_id>`
3. Verify that Docker is running correctly on your host machine
4. Ensure your VS Code has the Remote - Containers extension installed

## Additional Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
