/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/test/**',
    '!**/node_modules/**',
    '!**/out/**',
    '!**/.vscode-test/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: ['**/src/test/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/',
    '/.vscode-test/'
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/runtipi/',
    '<rootDir>/tipi/',
    '<rootDir>/.vscode-test/'
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/.vscode-test/'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  verbose: true,
  testTimeout: 30000,
  // Haste configuration to handle module name collisions
  haste: {
    forceNodeFilesystemAPI: true,
    throwOnModuleCollision: false,
  },
  // Use .jestignore file
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.vscode-test/'
  ],
};
