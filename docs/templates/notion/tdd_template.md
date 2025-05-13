# Test-Based Development Loop Template

## Feature/Requirement

[Describe the specific, small requirement to implement]

## Test Plan

### Test Cases

| Test ID | Description | Expected Result | Status |
|---------|-------------|-----------------|--------|
| TC-001 | [Test case description] | [Expected result] | [Status] |
| TC-002 | [Test case description] | [Expected result] | [Status] |
| TC-003 | [Test case description] | [Expected result] | [Status] |

### Test Implementation

```typescript
// Example test code
describe('[Feature name]', () => {
  test('should [expected behavior]', () => {
    // Arrange
    const input = [input value];
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe([expected value]);
  });
});
```

## Implementation Plan

### Approach

[Describe the approach to implementing this feature]

### Code Structure

```typescript
// Example implementation code
function functionName(param: ParamType): ReturnType {
  // Implementation
}
```

## Refactoring Opportunities

- [ ] [Refactoring opportunity 1]
- [ ] [Refactoring opportunity 2]
- [ ] [Refactoring opportunity 3]

## TDD Cycle Status

### Red Phase

- [ ] Tests written
- [ ] Tests fail for the right reason

### Green Phase

- [ ] Minimum code written to pass tests
- [ ] All tests pass

### Refactor Phase

- [ ] Code refactored for clarity and maintainability
- [ ] All tests still pass after refactoring

## Completion Conditions

- [ ] Have identified the single, smallest requirement to implement
- [ ] Have written tests that clearly define the requirement's behavior
- [ ] The tests now pass with the minimum necessary code
- [ ] Code is refactored and all tests still pass

## Loop Conditions

- [ ] Cannot identify a small, testable piece of functionality
- [ ] Tests do not fail, or do not accurately reflect the desired requirement
- [ ] Tests still fail, or the code written is overly complex for the requirement
- [ ] Refactoring breaks the tests, or the code is still messy

## Related Issues

- [Link to GitHub issue]
- [Link to Linear issue]

## Notes

[Any additional notes or context]
