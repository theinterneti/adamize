# Test Generation Examples

This document provides examples of the test generation features in the Adamize project.

## Procedural Test Generation

### Source Code

```typescript
/**
 * Calculator class for basic arithmetic operations
 * @implements REQ-CALC-001 Perform basic arithmetic operations
 */
export class Calculator {
  /**
   * Add two numbers
   * @param a First number
   * @param b Second number
   * @returns Sum of a and b
   * @implements REQ-CALC-002 Add two numbers
   */
  add(a: number, b: number): number {
    return a + b;
  }

  /**
   * Subtract two numbers
   * @param a First number
   * @param b Second number
   * @returns Difference of a and b
   * @implements REQ-CALC-003 Subtract two numbers
   */
  subtract(a: number, b: number): number {
    return a - b;
  }

  /**
   * Multiply two numbers
   * @param a First number
   * @param b Second number
   * @returns Product of a and b
   * @implements REQ-CALC-004 Multiply two numbers
   */
  multiply(a: number, b: number): number {
    return a * b;
  }

  /**
   * Divide two numbers
   * @param a First number
   * @param b Second number
   * @returns Quotient of a and b
   * @throws Error if b is zero
   * @implements REQ-CALC-005 Divide two numbers
   */
  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
}
```

### Generated Test (Default Template)

```typescript
/**
 * CALC Tests
 *
 * Tests for the CALC implementation.
 *
 * Requirements being tested:
 * - REQ-CALC-001: Description of requirement
 * - REQ-CALC-002: Description of requirement
 * - REQ-CALC-003: Description of requirement
 * - REQ-CALC-004: Description of requirement
 * - REQ-CALC-005: Description of requirement
 *
 * Test tags:
 * - TEST-CALC-001: Test that add() works correctly
 * - TEST-CALC-001a: Test that add() handles errors gracefully
 * - TEST-CALC-002: Test that subtract() works correctly
 * - TEST-CALC-002a: Test that subtract() handles errors gracefully
 * - TEST-CALC-003: Test that multiply() works correctly
 * - TEST-CALC-003a: Test that multiply() handles errors gracefully
 * - TEST-CALC-004: Test that divide() works correctly
 * - TEST-CALC-004a: Test that divide() handles errors gracefully
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { Calculator } from '../../src/calculator';

suite('CALC Test Suite', () => {
  // Stubs and mocks
  let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;

  // Setup before each test
  setup(() => {
    // Create stubs
    outputChannelStub = sinon.createStubInstance(vscode.OutputChannel);

    // Stub VS Code window.createOutputChannel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(vscode.window, 'createOutputChannel').returns(outputChannelStub as any);
  });

  // Teardown after each test
  teardown(() => {
    // Restore all stubs
    sinon.restore();
  });

  // TEST-CALC-001: Test that add() works correctly
  test('add() should work correctly', () => {
    // Arrange
    const calculator = new Calculator();

    // Act
    const result = calculator.add(2, 3);

    // Assert
    assert.strictEqual(result, 5);
  });

  // TEST-CALC-001a: Test that add() handles errors gracefully
  test('add() should handle errors gracefully', () => {
    // Arrange
    const calculator = new Calculator();

    // Act & Assert
    assert.doesNotThrow(() => {
      calculator.add(2, 3);
    });
  });

  // Additional tests...
});
```

### Generated Test (Enhanced Template)

```typescript
/**
 * Test suite for calculator
 * 
 * @module calculator
 * @requires assert
 * @requires sinon
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { Calculator } from '../../src/calculator';

suite('CALC Test Suite', () => {
  // Stubs and mocks
  let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;
  
  // Setup before each test
  setup(() => {
    // Create stubs
    outputChannelStub = sinon.createStubInstance(vscode.OutputChannel);

    // Stub VS Code window.createOutputChannel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(vscode.window, 'createOutputChannel').returns(outputChannelStub as any);
  });
  
  // Teardown after each test
  teardown(() => {
    // Restore all stubs
    sinon.restore();
  });

  /**
   * TEST-CALC-001: Test that add() works correctly
   * 
   * @function add
   * @param {number, number} Parameters
   * @returns {number} Return value
   */
  test('add() should work correctly', () => {
    // Arrange
    const calculator = new Calculator();

    // Act
    const result = calculator.add(2, 3);

    // Assert
    assert.strictEqual(result, 5);
    
    // Additional assertions for specific return type
    assert.strictEqual(typeof result, 'number');
  });

  /**
   * TEST-CALC-001a: Test that add() handles errors gracefully
   * 
   * @function add
   * @param {number, number} Parameters
   * @throws {Error} Expected error
   */
  test('add() should handle errors gracefully', () => {
    // Arrange
    const calculator = new Calculator();

    // Act & Assert
    assert.doesNotThrow(() => {
      calculator.add(2, 3);
    });
  });

  /**
   * TEST-CALC-001b: Test that add() handles edge cases correctly
   * 
   * @function add
   * @param {number, number} Parameters with edge case values
   */
  test('add() should handle edge cases correctly', () => {
    // Arrange - Edge case: Large numbers
    const calculator = new Calculator();

    // Act
    const result = calculator.add(Number.MAX_SAFE_INTEGER, 1);

    // Assert
    assert.strictEqual(result, Number.MAX_SAFE_INTEGER + 1);
  });

  // Additional tests...
});
```

## AI-Powered Test Generation

### Generated Test (AI-Assisted)

```typescript
/**
 * AI-Generated Tests for calculator
 *
 * These tests were generated using AI assistance.
 * Please review and modify as needed.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { Calculator } from '../../src/calculator';

suite('calculator Tests', () => {
  // Stubs and mocks
  let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;

  // Setup before each test
  setup(() => {
    // Create stubs
    outputChannelStub = sinon.createStubInstance(vscode.OutputChannel);

    // Stub VS Code window.createOutputChannel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(vscode.window, 'createOutputChannel').returns(outputChannelStub as any);
  });

  // Teardown after each test
  teardown(() => {
    // Restore all stubs
    sinon.restore();
  });

  // Tests for Calculator class
  // The Calculator class provides basic arithmetic operations

  // NORMAL TEST: Test basic addition with positive numbers
  test('add should correctly add two positive numbers', () => {
    // Arrange
    const calculator = new Calculator();
    
    // Act
    const result = calculator.add(5, 3);
    
    // Assert
    assert.strictEqual(result, 8);
  });

  // EDGE TEST: Test addition with negative numbers
  test('add should correctly handle negative numbers', () => {
    // Arrange
    const calculator = new Calculator();
    
    // Act
    const result1 = calculator.add(-5, 3);
    const result2 = calculator.add(5, -3);
    const result3 = calculator.add(-5, -3);
    
    // Assert
    assert.strictEqual(result1, -2);
    assert.strictEqual(result2, 2);
    assert.strictEqual(result3, -8);
  });

  // EDGE TEST: Test addition with zero
  test('add should correctly handle zero', () => {
    // Arrange
    const calculator = new Calculator();
    
    // Act
    const result1 = calculator.add(0, 3);
    const result2 = calculator.add(5, 0);
    const result3 = calculator.add(0, 0);
    
    // Assert
    assert.strictEqual(result1, 3);
    assert.strictEqual(result2, 5);
    assert.strictEqual(result3, 0);
  });

  // NORMAL TEST: Test basic subtraction
  test('subtract should correctly subtract two numbers', () => {
    // Arrange
    const calculator = new Calculator();
    
    // Act
    const result = calculator.subtract(10, 4);
    
    // Assert
    assert.strictEqual(result, 6);
  });

  // NORMAL TEST: Test basic multiplication
  test('multiply should correctly multiply two numbers', () => {
    // Arrange
    const calculator = new Calculator();
    
    // Act
    const result = calculator.multiply(3, 4);
    
    // Assert
    assert.strictEqual(result, 12);
  });

  // NORMAL TEST: Test basic division
  test('divide should correctly divide two numbers', () => {
    // Arrange
    const calculator = new Calculator();
    
    // Act
    const result = calculator.divide(10, 2);
    
    // Assert
    assert.strictEqual(result, 5);
  });

  // ERROR TEST: Test division by zero
  test('divide should throw an error when dividing by zero', () => {
    // Arrange
    const calculator = new Calculator();
    
    // Act & Assert
    assert.throws(() => {
      calculator.divide(10, 0);
    }, /Division by zero/);
  });
});
```
