# API Documentation

This document describes the API documentation workflow for the Adamize project, including how to generate documentation, view it, and write effective documentation comments.

## Overview

API documentation is essential for understanding the codebase and facilitating collaboration. The project uses TypeDoc to generate documentation from TypeScript code comments.

## Generating Documentation

### Locally

To generate API documentation locally:

```bash
npm run docs:generate
```

This will generate documentation in the `docs/api` directory.

To view the documentation in a browser:

```bash
npm run docs:serve
```

This will start a local server and open the documentation in your default browser.

### In CI

Documentation is automatically generated as part of the CI workflow. The generated documentation is uploaded as an artifact and can be downloaded from the GitHub Actions page.

## Documentation Structure

The generated documentation includes:

- **Modules**: Logical groupings of related code
- **Classes**: Class definitions, methods, and properties
- **Interfaces**: Interface definitions and properties
- **Functions**: Function definitions and parameters
- **Types**: Type definitions and aliases
- **Variables**: Constant and variable definitions

## Writing Documentation Comments

TypeDoc uses JSDoc-style comments to generate documentation. Here are some guidelines for writing effective documentation comments:

### Basic Comment Structure

```typescript
/**
 * Brief description of the function/class/interface
 * 
 * More detailed description if needed
 * 
 * @param paramName Description of the parameter
 * @returns Description of the return value
 */
```

### Classes

```typescript
/**
 * Class description
 * 
 * @class ClassName
 * @implements {InterfaceName}
 */
class ClassName implements InterfaceName {
  /**
   * Property description
   * 
   * @type {PropertyType}
   */
  public propertyName: PropertyType;

  /**
   * Constructor description
   * 
   * @param {ParameterType} paramName - Parameter description
   */
  constructor(paramName: ParameterType) {
    // ...
  }

  /**
   * Method description
   * 
   * @param {ParameterType} paramName - Parameter description
   * @returns {ReturnType} Return value description
   */
  public methodName(paramName: ParameterType): ReturnType {
    // ...
  }
}
```

### Interfaces

```typescript
/**
 * Interface description
 * 
 * @interface InterfaceName
 */
interface InterfaceName {
  /**
   * Property description
   * 
   * @type {PropertyType}
   */
  propertyName: PropertyType;

  /**
   * Method description
   * 
   * @param {ParameterType} paramName - Parameter description
   * @returns {ReturnType} Return value description
   */
  methodName(paramName: ParameterType): ReturnType;
}
```

### Functions

```typescript
/**
 * Function description
 * 
 * @param {ParameterType} paramName - Parameter description
 * @returns {ReturnType} Return value description
 * @throws {ErrorType} Description of when the error is thrown
 */
function functionName(paramName: ParameterType): ReturnType {
  // ...
}
```

### Modules

```typescript
/**
 * Module description
 * 
 * @module moduleName
 * @requires otherModule
 */
```

### Including Examples

```typescript
/**
 * Function description
 * 
 * @example
 * ```typescript
 * const result = functionName('example');
 * console.log(result); // Expected output
 * ```
 * 
 * @param {string} paramName - Parameter description
 * @returns {string} Return value description
 */
function functionName(paramName: string): string {
  // ...
}
```

### Linking to Other Documentation

```typescript
/**
 * See {@link OtherClass} for more information
 * 
 * @see OtherClass
 * @see {@link https://example.com|External Link}
 */
```

### Requirement Tags

```typescript
/**
 * Function description
 * 
 * @REQ-XXX-YYY Requirement tag
 * @TEST-XXX-YYY Test tag
 * @IMPL-XXX-YYY Implementation tag
 */
```

## Best Practices

1. **Be Concise**: Write clear, concise descriptions
2. **Document Public API**: Focus on documenting the public API
3. **Include Examples**: Provide examples for complex functionality
4. **Document Parameters**: Describe all parameters and return values
5. **Document Exceptions**: Describe when and why exceptions are thrown
6. **Use Links**: Link to related documentation
7. **Keep Updated**: Update documentation when code changes

## Troubleshooting

If documentation generation fails:

1. **Check Syntax**: Ensure that documentation comments are properly formatted
2. **Check TypeScript**: Ensure that TypeScript code compiles without errors
3. **Check Configuration**: Verify that the TypeDoc configuration is correct
4. **Check Dependencies**: Ensure all dependencies are installed correctly
