/**
 * Notion Tool Tests
 * 
 * Tests for the Notion tool.
 * @module test/suite/notion/notionTool.test
 * @implements TEST-NOTION-003 Test Notion tool initialization
 * @implements TEST-NOTION-004 Test Notion tool operations
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { NotionTool } from '../../../notion/notionTool';
import { NotionClient } from '../../../notion/notionClient';

// Mock the NotionClient
jest.mock('../../../notion/notionClient');

// Mock VS Code APIs
const mockOutputChannel = {
  appendLine: jest.fn(),
  show: jest.fn()
};

// Mock VS Code
jest.mock('vscode', () => {
  return {
    window: {
      createOutputChannel: jest.fn().mockReturnValue(mockOutputChannel)
    }
  };
});

describe('NotionTool', () => {
  let tool: NotionTool;
  let mockNotionClient: jest.Mocked<NotionClient>;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Reset mocks
    mockOutputChannel.appendLine.mockClear();
    
    // Setup mock NotionClient
    mockNotionClient = new NotionClient() as jest.Mocked<NotionClient>;
    (NotionClient as jest.Mock).mockImplementation(() => mockNotionClient);
    
    // Mock NotionClient methods
    mockNotionClient.searchPages = jest.fn().mockResolvedValue([
      { id: 'page-id-1', title: 'Test Page 1' }
    ]);
    mockNotionClient.getPage = jest.fn().mockResolvedValue(
      { id: 'page-id-1', title: 'Test Page 1' }
    );
    mockNotionClient.createPage = jest.fn().mockResolvedValue(
      { id: 'new-page-id', title: 'New Page' }
    );
    mockNotionClient.updatePage = jest.fn().mockResolvedValue(
      { id: 'page-id-1', title: 'Updated Page' }
    );
    mockNotionClient.getPageBlocks = jest.fn().mockResolvedValue([
      { id: 'block-id-1', type: 'paragraph', content: { rich_text: [{ plain_text: 'Test paragraph' }] } }
    ]);
    mockNotionClient.addBlock = jest.fn().mockResolvedValue(
      { id: 'new-block-id', type: 'paragraph', content: { rich_text: [{ plain_text: 'New paragraph' }] } }
    );
    
    // Create tool
    tool = new NotionTool('mock-token');
  });

  afterEach(() => {
    sandbox.restore();
  });

  // TEST-NOTION-003: Test Notion tool initialization
  test('should initialize with token', () => {
    // Assert
    expect(NotionClient).toHaveBeenCalledWith('mock-token');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Notion tool initialized');
  });

  // TEST-NOTION-004a: Test searching pages
  test('searchPages() should call NotionClient.searchPages', async () => {
    // Act
    const pages = await tool.searchPages({ query: 'test' });
    
    // Assert
    expect(mockNotionClient.searchPages).toHaveBeenCalledWith('test');
    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe('page-id-1');
    expect(pages[0].title).toBe('Test Page 1');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Searching for pages with query: test');
  });

  // TEST-NOTION-004b: Test getting a page
  test('getPage() should call NotionClient.getPage', async () => {
    // Act
    const page = await tool.getPage({ pageId: 'page-id-1' });
    
    // Assert
    expect(mockNotionClient.getPage).toHaveBeenCalledWith('page-id-1');
    expect(page.id).toBe('page-id-1');
    expect(page.title).toBe('Test Page 1');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Getting page with ID: page-id-1');
  });

  // TEST-NOTION-004c: Test creating a page
  test('createPage() should call NotionClient.createPage', async () => {
    // Act
    const page = await tool.createPage({
      title: 'New Page',
      content: 'Test content'
    });
    
    // Assert
    expect(mockNotionClient.createPage).toHaveBeenCalledWith({
      title: 'New Page',
      content: 'Test content'
    });
    expect(page.id).toBe('new-page-id');
    expect(page.title).toBe('New Page');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Creating page with title: New Page');
  });

  // TEST-NOTION-004d: Test updating a page
  test('updatePage() should call NotionClient.updatePage', async () => {
    // Act
    const page = await tool.updatePage({
      pageId: 'page-id-1',
      title: 'Updated Page'
    });
    
    // Assert
    expect(mockNotionClient.updatePage).toHaveBeenCalled();
    expect(page.id).toBe('page-id-1');
    expect(page.title).toBe('Updated Page');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Updating page with ID: page-id-1');
  });

  // TEST-NOTION-004e: Test getting page blocks
  test('getPageBlocks() should call NotionClient.getPageBlocks', async () => {
    // Act
    const blocks = await tool.getPageBlocks({ pageId: 'page-id-1' });
    
    // Assert
    expect(mockNotionClient.getPageBlocks).toHaveBeenCalledWith('page-id-1');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe('block-id-1');
    expect(blocks[0].type).toBe('paragraph');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Getting blocks for page with ID: page-id-1');
  });

  // TEST-NOTION-004f: Test adding a block
  test('addBlock() should call NotionClient.addBlock', async () => {
    // Act
    const block = await tool.addBlock({
      pageId: 'page-id-1',
      type: 'paragraph',
      content: 'New paragraph'
    });
    
    // Assert
    expect(mockNotionClient.addBlock).toHaveBeenCalled();
    expect(block.id).toBe('new-block-id');
    expect(block.type).toBe('paragraph');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Adding paragraph block to page with ID: page-id-1');
  });

  // TEST-NOTION-004g: Test adding code
  test('addCode() should call NotionClient.addBlock twice', async () => {
    // Act
    const block = await tool.addCode({
      pageId: 'page-id-1',
      code: 'console.log("Hello World")',
      language: 'javascript',
      title: 'Example Code'
    });
    
    // Assert
    expect(mockNotionClient.addBlock).toHaveBeenCalledTimes(2);
    expect(block.id).toBe('new-block-id');
    expect(block.type).toBe('paragraph');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Adding code block to page with ID: page-id-1');
  });

  // TEST-NOTION-004h: Test error handling
  test('should handle errors', async () => {
    // Arrange
    mockNotionClient.searchPages.mockRejectedValueOnce(new Error('Test error'));
    
    // Act & Assert
    await expect(tool.searchPages({ query: 'test' })).rejects.toThrow('Test error');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Error searching pages: Error: Test error');
  });
});
