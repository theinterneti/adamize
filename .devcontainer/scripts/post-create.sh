#!/bin/bash
set -e

echo "Setting up VS Code extension development environment..."

# Create necessary directories if they don't exist
mkdir -p src/test/suite
mkdir -p .vscode

# Create .vscode/launch.json if it doesn't exist
if [ ! -f ".vscode/launch.json" ]; then
    echo "Creating launch.json..."
    cat > .vscode/launch.json << 'LAUNCH_EOL'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
LAUNCH_EOL
fi

# Create .vscode/tasks.json if it doesn't exist
if [ ! -f ".vscode/tasks.json" ]; then
    echo "Creating tasks.json..."
    cat > .vscode/tasks.json << 'TASKS_EOL'
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "watch",
      "problemMatcher": "$tsc-watch",
      "isBackground": true,
      "presentation": {
        "reveal": "never"
      },
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
TASKS_EOL
fi

# Create package.json if it doesn't exist
if [ ! -f "package.json" ]; then
    echo "Creating package.json..."
    cat > package.json << 'PACKAGE_EOL'
{
  "name": "adamize",
  "displayName": "Adamize",
  "description": "VS Code extension for Adamize",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "adamize.helloWorld",
        "title": "Hello World"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/glob": "^8.1.0",
    "@types/mocha": "^10.0.6",
    "@types/node": "20.x",
    "@typescript-eslint/eslint-plugin": "^6.13.1",
    "@typescript-eslint/parser": "^6.13.1",
    "eslint": "^8.54.0",
    "glob": "^10.3.10",
    "mocha": "^10.2.0",
    "typescript": "^5.3.2",
    "@vscode/test-electron": "^2.3.8"
  }
}
PACKAGE_EOL
fi

# Create tsconfig.json if it doesn't exist
if [ ! -f "tsconfig.json" ]; then
    echo "Creating tsconfig.json..."
    cat > tsconfig.json << 'TSCONFIG_EOL'
{
  "compilerOptions": {
    "module": "Node16",
    "target": "ES2022",
    "outDir": "out",
    "lib": ["ES2022"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedParameters": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
TSCONFIG_EOL
fi

# Create .eslintrc.json if it doesn't exist
if [ ! -f ".eslintrc.json" ]; then
    echo "Creating .eslintrc.json..."
    cat > .eslintrc.json << 'ESLINT_EOL'
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/naming-convention": [
      "warn",
      {
        "selector": "default",
        "format": ["camelCase"]
      },
      {
        "selector": "variable",
        "format": ["camelCase", "UPPER_CASE"]
      },
      {
        "selector": "parameter",
        "format": ["camelCase"],
        "leadingUnderscore": "allow"
      },
      {
        "selector": "memberLike",
        "modifiers": ["private"],
        "format": ["camelCase"],
        "leadingUnderscore": "require"
      },
      {
        "selector": "typeLike",
        "format": ["PascalCase"]
      }
    ],
    "@typescript-eslint/semi": "warn",
    "curly": "warn",
    "eqeqeq": "warn",
    "no-throw-literal": "warn",
    "semi": "off"
  },
  "ignorePatterns": ["out", "**/*.d.ts"]
}
ESLINT_EOL
fi

# Create .prettierrc if it doesn't exist
if [ ! -f ".prettierrc" ]; then
    echo "Creating .prettierrc..."
    cat > .prettierrc << 'PRETTIER_EOL'
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
PRETTIER_EOL
fi

# Create basic extension files if they don't exist
if [ ! -d "src" ]; then
    echo "Creating basic extension files..."
    mkdir -p src
    
    # Create extension.ts
    cat > src/extension.ts << 'EXTENSION_EOL'
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "adamize" is now active!');

  let disposable = vscode.commands.registerCommand('adamize.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World from Adamize!');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
EXTENSION_EOL
    
    # Create test files
    mkdir -p src/test/suite
    
    # Create index.ts
    cat > src/test/suite/index.ts << 'TEST_INDEX_EOL'
import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((c, e) => {
    glob('**/**.test.js', { cwd: testsRoot }).then((files) => {
      // Add files to the test suite
      files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Run the mocha test
        mocha.run(failures => {
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (err) {
        console.error(err);
        e(err);
      }
    }).catch(err => {
      console.error(err);
      e(err);
    });
  });
}
TEST_INDEX_EOL
    
    # Create extension.test.ts
    cat > src/test/suite/extension.test.ts << 'TEST_EXTENSION_EOL'
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(0, [1, 2, 3].indexOf(1));
  });
});
TEST_EXTENSION_EOL
    
    # Create runTest.ts
    cat > src/test/runTest.ts << 'RUN_TEST_EOL'
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Download VS Code, unzip it and run the integration test
    await runTests({ extensionDevelopmentPath, extensionTestsPath });
  } catch (err) {
    console.error('Failed to run tests', err);
    process.exit(1);
  }
}

main();
RUN_TEST_EOL
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo "VS Code extension development environment setup completed!"
