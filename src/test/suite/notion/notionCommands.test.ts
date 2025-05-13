/**
 * Notion Commands Tests
 * 
 * Tests for the Notion commands.
 * @module test/suite/notion/notionCommands.test
 * @implements TEST-NOTION-005 Test Notion commands registration
 * @implements TEST-NOTION-006 Test Notion commands execution
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { registerNotionCommands } from '../../../notion/notionCommands';
import { NotionClient } from '../../../notion/notionClient';

// Mock the NotionClient
jest.mock('../../../notion/notionClient');

// Mock VS Code APIs
const mockCommands = {
  registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() })
};

const mockWindow = {
  showInputBox: jest.fn(),
  showQuickPick: jest.fn(),
  showInformationMessage: jest.fn().mockReturnValue(Promise.resolve(undefined)),
  showErrorMessage: jest.fn().mockReturnValue(Promise.resolve(undefined)),
  withProgress: jest.fn().mockImplementation((options, task) => task()),
  createOutputChannel: jest.fn().mockReturnValue({
    appendLine: jest.fn(),
    show: jest.fn()
  })
};

const mockWorkspace = {
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue('mock-token'),
    update: jest.fn().mockResolvedValue(undefined)
  })
};

const mockEnv = {
  openExternal: jest.fn()
};

// Mock VS Code
jest.mock('vscode', () => {
  return {
    commands: mockCommands,
    window: mockWindow,
    workspace: mockWorkspace,
    env: mockEnv,
    Uri: {
      parse: jest.fn().mockImplementation(url => url)
    },
    ConfigurationTarget: {
      Global: 1
    },
    ProgressLocation: {
      Notification: 1
    }
  };
});

describe('NotionCommands', () => {
  let mockContext: vscode.ExtensionContext;
  let mockNotionClient: jest.Mocked<NotionClient>;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Reset mocks
    mockCommands.registerCommand.mockClear();
    mockWindow.showInputBox.mockClear();
    mockWindow.showQuickPick.mockClear();
    mockWindow.showInformationMessage.mockClear();
    mockWindow.showErrorMessage.mockClear();
    mockWindow.withProgress.mockClear();
    mockWorkspace.getConfiguration.mockClear();
    mockEnv.openExternal.mockClear();
    
    // Setup mock context
    mockContext = {
      subscriptions: []
    } as unknown as vscode.ExtensionContext;
    
    // Setup mock NotionClient
    mockNotionClient = new NotionClient() as jest.Mocked<NotionClient>;
    (NotionClient as jest.Mock).mockImplementation(() => mockNotionClient);
    
    // Mock NotionClient methods
    mockNotionClient.searchPages = jest.fn().mockResolvedValue([
      { id: 'page-id-1', title: 'Test Page 1', url: 'https://notion.so/test-page-1' }
    ]);
    mockNotionClient.getPage = jest.fn().mockResolvedValue(
      { id: 'page-id-1', title: 'Test Page 1', url: 'https://notion.so/test-page-1' }
    );
    mockNotionClient.createPage = jest.fn().mockResolvedValue(
      { id: 'new-page-id', title: 'New Page', url: 'https://notion.so/new-page' }
    );
    mockNotionClient.updatePage = jest.fn().mockResolvedValue(
      { id: 'page-id-1', title: 'Updated Page', url: 'https://notion.so/test-page-1' }
    );
    mockNotionClient.getPageBlocks = jest.fn().mockResolvedValue([
      { id: 'block-id-1', type: 'paragraph', content: { rich_text: [{ plain_text: 'Test paragraph' }] } }
    ]);
    mockNotionClient.addBlock = jest.fn().mockResolvedValue(
      { id: 'new-block-id', type: 'paragraph', content: { rich_text: [{ plain_text: 'New paragraph' }] } }
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  // TEST-NOTION-005: Test Notion commands registration
  test('should register Notion commands', () => {
    // Act
    registerNotionCommands(mockContext);
    
    // Assert
    expect(mockCommands.registerCommand).toHaveBeenCalledTimes(5);
    expect(mockCommands.registerCommand).toHaveBeenCalledWith('adamize.notion.configureToken', expect.any(Function));
    expect(mockCommands.registerCommand).toHaveBeenCalledWith('adamize.notion.searchPages', expect.any(Function));
    expect(mockCommands.registerCommand).toHaveBeenCalledWith('adamize.notion.createPage', expect.any(Function));
    expect(mockCommands.registerCommand).toHaveBeenCalledWith('adamize.notion.addToPage', expect.any(Function));
    expect(mockCommands.registerCommand).toHaveBeenCalledWith('adamize.notion.addCodeToPage', expect.any(Function));
    expect(mockContext.subscriptions).toHaveLength(5);
  });

  // TEST-NOTION-006a: Test configureToken command
  test('configureToken command should update token in settings', async () => {
    // Arrange
    registerNotionCommands(mockContext);
    mockWindow.showInputBox.mockResolvedValueOnce('new-token');
    
    // Act
    await mockCommands.registerCommand.mock.calls[0][1]();
    
    // Assert
    expect(mockWindow.showInputBox).toHaveBeenCalledWith({
      prompt: 'Enter your Notion API token',
      password: true,
      ignoreFocusOut: true
    });
    expect(mockWorkspace.getConfiguration).toHaveBeenCalledWith('adamize.notion');
    expect(mockWorkspace.getConfiguration().update).toHaveBeenCalledWith('token', 'new-token', 1);
    expect(mockWindow.showInformationMessage).toHaveBeenCalledWith('Notion API token configured successfully');
  });

  // TEST-NOTION-006b: Test searchPages command
  test('searchPages command should search pages and show results', async () => {
    // Arrange
    registerNotionCommands(mockContext);
    mockWindow.showInputBox.mockResolvedValueOnce('test');
    mockWindow.showQuickPick.mockResolvedValueOnce({
      label: 'Test Page 1',
      description: 'page-id-1',
      page: { id: 'page-id-1', title: 'Test Page 1', url: 'https://notion.so/test-page-1' }
    });
    
    // Act
    await mockCommands.registerCommand.mock.calls[1][1]();
    
    // Assert
    expect(mockWindow.showInputBox).toHaveBeenCalledWith({
      prompt: 'Enter search query',
      placeHolder: 'Search Notion pages...'
    });
    expect(mockNotionClient.searchPages).toHaveBeenCalledWith('test');
    expect(mockWindow.showQuickPick).toHaveBeenCalled();
    expect(mockEnv.openExternal).toHaveBeenCalledWith('https://notion.so/test-page-1');
  });

  // TEST-NOTION-006c: Test createPage command
  test('createPage command should create a page', async () => {
    // Arrange
    registerNotionCommands(mockContext);
    mockWindow.showInputBox.mockResolvedValueOnce('New Page');
    mockWindow.showInputBox.mockResolvedValueOnce('Page content');
    mockWindow.showInformationMessage.mockResolvedValueOnce('Open in Browser');
    
    // Act
    await mockCommands.registerCommand.mock.calls[2][1]();
    
    // Assert
    expect(mockWindow.showInputBox).toHaveBeenCalledWith({
      prompt: 'Enter page title',
      placeHolder: 'New page title'
    });
    expect(mockWindow.showInputBox).toHaveBeenCalledWith({
      prompt: 'Enter page content (optional)',
      placeHolder: 'Page content'
    });
    expect(mockNotionClient.createPage).toHaveBeenCalledWith({
      title: 'New Page',
      content: 'Page content'
    });
    expect(mockWindow.showInformationMessage).toHaveBeenCalledWith('Page "New Page" created successfully', 'Open in Browser');
    expect(mockEnv.openExternal).toHaveBeenCalledWith('https://notion.so/new-page');
  });

  // TEST-NOTION-006d: Test addToPage command
  test('addToPage command should add content to a page', async () => {
    // Arrange
    registerNotionCommands(mockContext);
    mockWindow.showInputBox.mockResolvedValueOnce('test');
    mockWindow.showQuickPick.mockResolvedValueOnce({
      label: 'Test Page 1',
      description: 'page-id-1',
      page: { id: 'page-id-1', title: 'Test Page 1', url: 'https://notion.so/test-page-1' }
    });
    mockWindow.showQuickPick.mockResolvedValueOnce({
      label: 'Paragraph',
      type: 'paragraph'
    });
    mockWindow.showInputBox.mockResolvedValueOnce('New paragraph');
    mockWindow.showInformationMessage.mockResolvedValueOnce('Open in Browser');
    
    // Act
    await mockCommands.registerCommand.mock.calls[3][1]();
    
    // Assert
    expect(mockWindow.showInputBox).toHaveBeenCalledWith({
      prompt: 'Search for a page to add content to',
      placeHolder: 'Search Notion pages...'
    });
    expect(mockNotionClient.searchPages).toHaveBeenCalledWith('test');
    expect(mockWindow.showQuickPick).toHaveBeenCalledTimes(2);
    expect(mockWindow.showInputBox).toHaveBeenCalledWith({
      prompt: 'Enter content',
      placeHolder: 'Paragraph content'
    });
    expect(mockNotionClient.addBlock).toHaveBeenCalled();
    expect(mockWindow.showInformationMessage).toHaveBeenCalledWith('Content added to "Test Page 1" successfully', 'Open in Browser');
    expect(mockEnv.openExternal).toHaveBeenCalledWith('https://notion.so/test-page-1');
  });

  // TEST-NOTION-006e: Test addCodeToPage command
  test('addCodeToPage command should add code to a page', async () => {
    // Arrange
    registerNotionCommands(mockContext);
    
    // Mock active text editor
    const mockEditor = {
      document: {
        getText: jest.fn().mockReturnValue('console.log("Hello World")'),
        languageId: 'javascript'
      },
      selection: {}
    };
    mockWindow.activeTextEditor = mockEditor;
    
    mockWindow.showInputBox.mockResolvedValueOnce('test');
    mockWindow.showQuickPick.mockResolvedValueOnce({
      label: 'Test Page 1',
      description: 'page-id-1',
      page: { id: 'page-id-1', title: 'Test Page 1', url: 'https://notion.so/test-page-1' }
    });
    mockWindow.showInputBox.mockResolvedValueOnce('Example Code');
    mockWindow.showInformationMessage.mockResolvedValueOnce('Open in Browser');
    
    // Act
    await mockCommands.registerCommand.mock.calls[4][1]();
    
    // Assert
    expect(mockWindow.showInputBox).toHaveBeenCalledWith({
      prompt: 'Search for a page to add code to',
      placeHolder: 'Search Notion pages...'
    });
    expect(mockNotionClient.searchPages).toHaveBeenCalledWith('test');
    expect(mockWindow.showQuickPick).toHaveBeenCalledTimes(1);
    expect(mockWindow.showInputBox).toHaveBeenCalledWith({
      prompt: 'Enter title for code block (optional)',
      placeHolder: 'Code block title'
    });
    expect(mockNotionClient.addBlock).toHaveBeenCalledTimes(2);
    expect(mockWindow.showInformationMessage).toHaveBeenCalledWith('Code added to "Test Page 1" successfully', 'Open in Browser');
    expect(mockEnv.openExternal).toHaveBeenCalledWith('https://notion.so/test-page-1');
  });
});
