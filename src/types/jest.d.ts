/**
 * Jest Type Definitions
 *
 * This file provides type definitions for Jest to avoid TypeScript errors.
 */

declare const jest: {
  mock: (moduleName: string, factory?: any, options?: any) => any;
  setTimeout: (timeout: number) => void;
  clearAllMocks: () => void;
};

declare const beforeEach: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
