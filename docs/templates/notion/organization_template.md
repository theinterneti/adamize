# Code Organization and Documentation Template

## Code Structure Review

### Current Structure

```
[Project Name]/
├── [Directory 1]/
│   ├── [File 1]
│   └── [File 2]
├── [Directory 2]/
│   ├── [File 3]
│   └── [File 4]
└── [Other directories and files]
```

### Proposed Changes

```
[Project Name]/
├── [Directory 1]/
│   ├── [File 1]
│   └── [File 2]
├── [Directory 2]/
│   ├── [File 3]
│   └── [File 4]
└── [Other directories and files]
```

### Rationale for Changes

[Explain why the proposed changes improve the code organization]

## Code Documentation

### Files Requiring Comments

| File | Status | Notes |
|------|--------|-------|
| [File 1] | [Status] | [Notes] |
| [File 2] | [Status] | [Notes] |
| [File 3] | [Status] | [Notes] |

### Example Comments

```typescript
/**
 * [Function/Class name]
 * 
 * [Description of what this function/class does]
 * 
 * @param {[Type]} [paramName] - [Description of parameter]
 * @returns {[Type]} [Description of return value]
 * @throws {[Error Type]} [Description of when this error is thrown]
 * 
 * @example
 * // [Example usage]
 * const result = functionName(param);
 */
```

## API Documentation

### Public APIs

| API | Description | Status |
|-----|-------------|--------|
| [API 1] | [Description] | [Status] |
| [API 2] | [Description] | [Status] |
| [API 3] | [Description] | [Status] |

### API Documentation Example

```typescript
/**
 * [API Name]
 * 
 * [Description of what this API does]
 * 
 * @param {[Type]} [paramName] - [Description of parameter]
 * @returns {Promise<[Type]>} [Description of return value]
 * @throws {[Error Type]} [Description of when this error is thrown]
 * 
 * @example
 * // [Example usage]
 * const result = await apiName(param);
 */
```

## User Documentation

### User Guide Sections

| Section | Status | Notes |
|---------|--------|-------|
| [Section 1] | [Status] | [Notes] |
| [Section 2] | [Status] | [Notes] |
| [Section 3] | [Status] | [Notes] |

### Example User Guide Section

```markdown
# [Section Title]

## Overview

[Brief overview of this section]

## Usage

[How to use this feature]

## Examples

[Examples of using this feature]

## Troubleshooting

[Common issues and solutions]
```

## Completion Conditions

- [ ] Code structure is logical and easy to navigate
- [ ] Complex code sections are adequately commented
- [ ] Public APIs are documented
- [ ] User documentation is complete and clear

## Loop Conditions

- [ ] Code structure is confusing or inconsistent
- [ ] Complex code lacks adequate comments
- [ ] Public APIs are not documented
- [ ] User documentation is incomplete or unclear

## Related Issues

- [Link to GitHub issue]
- [Link to Linear issue]

## Notes

[Any additional notes or context]
