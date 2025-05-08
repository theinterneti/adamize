/**
 * Jest Type Definitions
 *
 * This file provides type definitions for Jest to avoid TypeScript errors.
 */

type MockFn = {
  (): any;
  mockReturnValue: (value: any) => MockFn;
  mockResolvedValue: (value: any) => MockFn;
  mockRejectedValue: (error: Error) => MockFn;
  mockImplementation: (fn: (...args: any[]) => any) => MockFn;
  mock: {
    calls: any[][];
  };
};

declare namespace jest {
  export type Mock<T extends (...args: any[]) => any> = {
    (...args: Parameters<T>): ReturnType<T>;
    mockReturnValue: (value: ReturnType<T>) => Mock<T>;
    mockResolvedValue: <U extends Promise<any>>(value: U extends Promise<infer R> ? R : never) => Mock<T>;
    mockRejectedValue: (error: Error) => Mock<T>;
    mockImplementation: (fn: T) => Mock<T>;
    mock: {
      calls: Parameters<T>[][];
      results: { type: string; value: ReturnType<T> }[];
    };
  };

  export function fn<T extends (...args: any[]) => any>(): Mock<T>;
  export function fn<T extends (...args: any[]) => any>(implementation: T): Mock<T>;
  export function mock(moduleName: string, factory?: any, options?: any): any;
  export function requireActual(moduleName: string): any;
  export function setTimeout(timeout: number): void;
  export function clearAllMocks(): void;
}

declare const beforeEach: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: any;
