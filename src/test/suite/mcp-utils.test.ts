import * as assert from 'assert';
import { IMCPFunctionSchema } from '../../mcp/mcpTypes';
import { validateParameters, formatParameters } from '../../mcp/mcpUtils';

suite('MCP Utils Test Suite', () => {
  // Define a mock function schema for testing
  const mockFunctionSchema: IMCPFunctionSchema = {
    name: 'testFunction',
    description: 'A test function',
    returnType: 'string',
    parameters: [
      {
        name: 'stringParam',
        description: 'A string parameter',
        type: 'string',
        required: true
      },
      {
        name: 'numberParam',
        description: 'A number parameter',
        type: 'number',
        required: true
      },
      {
        name: 'booleanParam',
        description: 'A boolean parameter',
        type: 'boolean',
        required: false
      },
      {
        name: 'arrayParam',
        description: 'An array parameter',
        type: 'array',
        required: false
      },
      {
        name: 'objectParam',
        description: 'An object parameter',
        type: 'object',
        required: false
      },
      {
        name: 'integerParam',
        description: 'An integer parameter',
        type: 'integer',
        required: false
      }
    ]
  };

  suite('validateParameters', () => {
    test('should pass validation for valid parameters', () => {
      const validParams = {
        stringParam: 'test',
        numberParam: 42,
        booleanParam: true,
        arrayParam: [1, 2, 3],
        objectParam: { key: 'value' },
        integerParam: 42
      };

      // Should not throw an error
      validateParameters(validParams, mockFunctionSchema);
      assert.ok(true); // If we get here, validation passed
    });

    test('should throw error for missing required parameters', () => {
      const invalidParams = {
        stringParam: 'test'
        // Missing numberParam which is required
      };

      // Should throw an error
      assert.throws(() => {
        validateParameters(invalidParams, mockFunctionSchema);
      }, /Missing required parameter: numberParam/);
    });

    test('should throw error for unknown parameters', () => {
      const invalidParams = {
        stringParam: 'test',
        numberParam: 42,
        unknownParam: 'unknown'
      };

      // Should throw an error
      assert.throws(() => {
        validateParameters(invalidParams, mockFunctionSchema);
      }, /Unknown parameter: unknownParam/);
    });

    test('should throw error for invalid parameter types', () => {
      const invalidParams = {
        stringParam: 123, // Should be a string
        numberParam: 42
      };

      // Should throw an error
      assert.throws(() => {
        validateParameters(invalidParams, mockFunctionSchema);
      }, /Parameter stringParam must be a string/);
    });

    test('should throw error for non-integer values in integer parameters', () => {
      const invalidParams = {
        stringParam: 'test',
        numberParam: 42,
        integerParam: 42.5 // Should be an integer
      };

      // Should throw an error
      assert.throws(() => {
        validateParameters(invalidParams, mockFunctionSchema);
      }, /Parameter integerParam must be an integer/);
    });
  });

  suite('formatParameters', () => {
    test('should format parameters correctly', () => {
      const params = {
        stringParam: 'test',
        numberParam: 42,
        booleanParam: true,
        arrayParam: [1, 2, 3],
        objectParam: { key: 'value' }
      };

      const formatted = formatParameters(params);
      assert.ok(formatted.includes('stringParam'));
      assert.ok(formatted.includes('numberParam'));
      assert.ok(formatted.includes('booleanParam'));
      assert.ok(formatted.includes('arrayParam'));
      assert.ok(formatted.includes('objectParam'));
    });

    test('should truncate long string values', () => {
      const longString = 'a'.repeat(200);
      const params = {
        stringParam: longString
      };

      const formatted = formatParameters(params);
      assert.ok(formatted.includes('...'));
      assert.ok(!formatted.includes(longString));
    });
  });
});
