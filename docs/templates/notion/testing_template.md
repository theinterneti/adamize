# Advanced Testing and Refinement Template

## Feature/Component Under Test

[Describe the feature or component being tested]

## Edge Cases

| Edge Case ID | Description | Test Status | Notes |
|--------------|-------------|-------------|-------|
| EC-001 | [Edge case description] | [Status] | [Notes] |
| EC-002 | [Edge case description] | [Status] | [Notes] |
| EC-003 | [Edge case description] | [Status] | [Notes] |

### Edge Case Test Implementation

```typescript
// Example edge case test
test('should handle [edge case]', () => {
  // Arrange
  const edgeInput = [edge case input];
  
  // Act
  const result = functionUnderTest(edgeInput);
  
  // Assert
  expect(result).toBe([expected value]);
});
```

## Integration Tests

| Integration Test ID | Components Involved | Description | Status |
|--------------------|---------------------|-------------|--------|
| IT-001 | [Components] | [Description] | [Status] |
| IT-002 | [Components] | [Description] | [Status] |
| IT-003 | [Components] | [Description] | [Status] |

### Integration Test Implementation

```typescript
// Example integration test
describe('Integration between [Component A] and [Component B]', () => {
  test('should [expected behavior]', () => {
    // Arrange
    const componentA = new ComponentA();
    const componentB = new ComponentB(componentA);
    
    // Act
    const result = componentB.methodThatUsesComponentA();
    
    // Assert
    expect(result).toBe([expected value]);
  });
});
```

## Performance Tests

| Performance Test ID | Description | Baseline | Target | Actual | Status |
|--------------------|-------------|----------|--------|--------|--------|
| PT-001 | [Description] | [Baseline] | [Target] | [Actual] | [Status] |
| PT-002 | [Description] | [Baseline] | [Target] | [Actual] | [Status] |
| PT-003 | [Description] | [Baseline] | [Target] | [Actual] | [Status] |

### Performance Test Implementation

```typescript
// Example performance test
test('should process [operation] within [time] ms', () => {
  // Arrange
  const input = [input value];
  
  // Act
  const startTime = performance.now();
  functionUnderTest(input);
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Assert
  expect(duration).toBeLessThan([target time]);
});
```

## AI Test Generation

### Generated Tests

| Generated Test ID | Description | Status | AI Tool Used |
|-------------------|-------------|--------|--------------|
| GT-001 | [Description] | [Status] | [AI Tool] |
| GT-002 | [Description] | [Status] | [AI Tool] |
| GT-003 | [Description] | [Status] | [AI Tool] |

### AI Test Generation Approach

[Describe the approach used for AI test generation]

## Manual Testing

### Test Scenarios

| Scenario ID | Description | Steps | Expected Result | Actual Result | Status |
|-------------|-------------|-------|-----------------|---------------|--------|
| MS-001 | [Description] | [Steps] | [Expected] | [Actual] | [Status] |
| MS-002 | [Description] | [Steps] | [Expected] | [Actual] | [Status] |
| MS-003 | [Description] | [Steps] | [Expected] | [Actual] | [Status] |

## Bug Tracking

| Bug ID | Description | Severity | Status | Fix |
|--------|-------------|----------|--------|-----|
| BUG-001 | [Description] | [Severity] | [Status] | [Fix] |
| BUG-002 | [Description] | [Severity] | [Status] | [Fix] |
| BUG-003 | [Description] | [Severity] | [Status] | [Fix] |

## Completion Conditions

- [ ] Edge cases identified and tested
- [ ] Integration tests implemented and passing
- [ ] Performance tests implemented and meeting targets
- [ ] AI test generation explored and evaluated
- [ ] Manual testing completed
- [ ] All critical bugs fixed

## Loop Conditions

- [ ] Edge cases not adequately covered
- [ ] Integration tests failing or incomplete
- [ ] Performance not meeting targets
- [ ] AI test generation not explored
- [ ] Manual testing incomplete
- [ ] Critical bugs remaining

## Related Issues

- [Link to GitHub issue]
- [Link to Linear issue]

## Notes

[Any additional notes or context]
