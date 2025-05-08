// Mock implementation of the vscode module for testing
import { ViewColumn } from 'vscode';

// Helper function to create mock functions
const createMockFn = () => {
  const mockFn: any = function(...args: any[]) { return mockFn._implementation?.(...args); };
  mockFn.mockReturnValue = function(val: any) {
    mockFn._implementation = () => val;
    return mockFn;
  };
  mockFn.mockResolvedValue = function(val: any) {
    mockFn._implementation = () => Promise.resolve(val);
    return mockFn;
  };
  mockFn.mockRejectedValue = function(val: any) {
    mockFn._implementation = () => Promise.reject(val);
    return mockFn;
  };
  mockFn.mockImplementation = function(fn: any) {
    mockFn._implementation = fn;
    return mockFn;
  };
  mockFn.mock = { calls: [] };
  return mockFn;
};

// Create a properly typed OutputChannel mock
export class MockOutputChannel {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  append(_value: string): void {}
  appendLine(_value: string): void {}
  clear(): void {}
  show(column?: ViewColumn, preserveFocus?: boolean): void;
  show(preserveFocus?: boolean): void;
  show(_columnOrPreserveFocus?: ViewColumn | boolean, _preserveFocus?: boolean): void {}
  hide(): void {}
  dispose(): void {}
}

export const window = {
  showInformationMessage: function() { return Promise.resolve(); },
  showErrorMessage: function() { return Promise.resolve(); },
  showWarningMessage: function() { return Promise.resolve(); },
  createOutputChannel: function(name: string) {
    return new MockOutputChannel(name);
  },
  createWebviewPanel: createMockFn(),
  showQuickPick: createMockFn(),
  showInputBox: createMockFn()
};

export const commands = {
  registerCommand: createMockFn(),
  executeCommand: createMockFn()
};

export const workspace = {
  getConfiguration: () => ({
    get: createMockFn(),
    update: createMockFn(),
    has: createMockFn()
  }),
  workspaceFolders: [],
  onDidChangeConfiguration: createMockFn()
};

export const ExtensionContext = class {
  subscriptions = [];
  workspaceState = {
    get: createMockFn(),
    update: createMockFn()
  };
  globalState = {
    get: createMockFn(),
    update: createMockFn()
  };
  extensionPath = '';
  asAbsolutePath = createMockFn();
};

export const Uri = {
  file: (path: string) => ({ path }),
  parse: createMockFn()
};

export const EventEmitter = class {
  event = createMockFn();
  fire = createMockFn();
};

export enum StatusBarAlignment {
  Left = 1,
  Right = 2
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2
}

export class TreeItem {
  label?: string;
  id?: string;
  iconPath?: string | { id: string };
  description?: string;
  tooltip?: string;
  command?: any;
  contextValue?: string;

  constructor(label: string, _collapsibleState?: TreeItemCollapsibleState) {
    this.label = label;
  }
}

export const languages = {
  registerCompletionItemProvider: createMockFn()
};

export const CompletionItemKind = {
  Text: 0,
  Method: 1,
  Function: 2,
  Constructor: 3,
  Field: 4,
  Variable: 5,
  Class: 6,
  Interface: 7,
  Module: 8,
  Property: 9,
  Unit: 10,
  Value: 11,
  Enum: 12,
  Keyword: 13,
  Snippet: 14,
  Color: 15,
  File: 16,
  Reference: 17,
  Folder: 18,
  EnumMember: 19,
  Constant: 20,
  Struct: 21,
  Event: 22,
  Operator: 23,
  TypeParameter: 24
};

export class CompletionItem {
  kind = CompletionItemKind.Text;
  detail = '';
  documentation = '';
  insertText = '';
  constructor(public label: string) {}
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export class Range {
  constructor(
    public start: typeof Position,
    public end: typeof Position
  ) {}
}

export class Disposable {
  static from() {
    return { dispose: createMockFn() };
  }
  dispose = createMockFn();
}

export const env = {
  clipboard: {
    writeText: createMockFn()
  }
};

export const ProgressLocation = {
  Notification: 1,
  Window: 10
};

export class ThemeIcon {
  constructor(public id: string) {}
}

export const extensions = {
  getExtension: function() { return { isActive: true }; }
};
