// Mock implementation of the vscode module for testing
const fn = () => {
  return {
    mockReturnValue: () => fn(),
    mockImplementation: () => fn()
  };
};

export const window = {
  showInformationMessage: function() { return Promise.resolve(); },
  showErrorMessage: function() { return Promise.resolve(); },
  showWarningMessage: function() { return Promise.resolve(); },
  createOutputChannel: function() {
    return {
      appendLine: function() {},
      append: function() {},
      show: function() {},
      clear: function() {},
      dispose: function() {}
    };
  }
};

export const commands = {
  registerCommand: fn(),
  executeCommand: fn()
};

export const workspace = {
  getConfiguration: () => ({
    get: fn(),
    update: fn(),
    has: fn()
  }),
  workspaceFolders: [],
  onDidChangeConfiguration: fn()
};

export const ExtensionContext = class {
  subscriptions = [];
  workspaceState = {
    get: fn(),
    update: fn()
  };
  globalState = {
    get: fn(),
    update: fn()
  };
  extensionPath = '';
  asAbsolutePath = fn();
};

export const Uri = {
  file: (path: string) => ({ path }),
  parse: fn()
};

export const EventEmitter = class {
  event = fn();
  fire = fn();
};

export enum StatusBarAlignment {
  Left = 1,
  Right = 2
}

export const languages = {
  registerCompletionItemProvider: fn()
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
    return { dispose: fn() };
  }
  dispose = fn();
}

export const env = {
  clipboard: {
    writeText: fn()
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
