module.exports = {
  // Run TypeScript compiler on all TypeScript files
  '**/*.ts': () => 'npm run typecheck',

  // Lint and fix TypeScript files
  'src/**/*.ts': [
    'eslint --fix',
    'prettier --write'
  ],

  // Run tests related to changed files
  'src/**/*.ts': (filenames) => {
    // Skip running tests if only test files were changed
    const nonTestFiles = filenames.filter(filename => !filename.includes('.test.ts'));
    if (nonTestFiles.length === 0) {
      return [];
    }

    // Run only unit tests for faster feedback
    return 'npm run test:unit';
  },

  // Format JSON, MD, and other files
  '*.{json,md,yml,yaml}': [
    'prettier --write'
  ]
};