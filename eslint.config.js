const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    // Global ignores
    ignores: ['out/**', 'dist/**', '**/*.d.ts', 'node_modules/**', '.vscode-test/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Non-type-aware rules for all TypeScript files
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/semi': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'curly': 'warn',
      'eqeqeq': 'warn',
      'no-throw-literal': 'warn',
      'semi': 'off',
    },
  },
  {
    // Type-aware rules for source files (excluding tests and type definitions)
    files: ['src/**/*.ts'],
    ignores: ['src/test/**/*.ts', 'src/types/**/*.ts', '**/*.d.ts'],
    ...tseslint.configs.recommendedTypeChecked[0],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: '.',
      },
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'default',
          format: ['camelCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          prefix: ['I'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
      ],
      '@typescript-eslint/semi': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      'curly': 'warn',
      'eqeqeq': 'warn',
      'no-throw-literal': 'warn',
      'semi': 'off',
    },
  },
  prettierConfig,
);
