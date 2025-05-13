/**
 * Notion Client Tests
 * 
 * Tests for the Notion client.
 * @module test/suite/notion/notionClient.test
 * @implements TEST-NOTION-001 Test Notion client initialization
 * @implements TEST-NOTION-002 Test Notion client operations
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { NotionClient } from '../../../notion/notionClient';

// Mock the Notion SDK
jest.mock('@notionhq/client', () => {
  return {
    Client: jest.fn().mockImplementation(() => {
      return {
        search: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'page-id-1',
              properties: {
                title: {
                  title: [
                    {
                      plain_text: 'Test Page 1'
                    }
                  ]
                }
              }
            }
          ]
        }),
        pages: {
          retrieve: jest.fn().mockResolvedValue({
            id: 'page-id-1',
            properties: {
              title: {
                title: [
                  {
                    plain_text: 'Test Page 1'
                  }
                ]
              }
            }
          }),
          create: jest.fn().mockResolvedValue({
            id: 'new-page-id',
            properties: {
              title: {
                title: [
                  {
                    plain_text: 'New Page'
                  }
                ]
              }
            }
          }),
          update: jest.fn().mockResolvedValue({
            id: 'page-id-1',
            properties: {
              title: {
                title: [
                  {
                    plain_text: 'Updated Page'
                  }
                ]
              }
            }
          })
        },
        blocks: {
          children: {
            list: jest.fn().mockResolvedValue({
              results: [
                {
                  id: 'block-id-1',
                  type: 'paragraph',
                  paragraph: {
                    rich_text: [
                      {
                        plain_text: 'Test paragraph'
                      }
                    ]
                  }
                }
              ]
            }),
            append: jest.fn().mockResolvedValue({
              results: [
                {
                  id: 'new-block-id',
                  type: 'paragraph',
                  paragraph: {
                    rich_text: [
                      {
                        plain_text: 'New paragraph'
                      }
                    ]
                  }
                }
              ]
            })
          }
        }
      };
    })
  };
});

// Mock VS Code APIs
const mockOutputChannel = {
  appendLine: jest.fn(),
  show: jest.fn()
};

// Mock VS Code workspace configuration
const mockConfiguration = {
  get: jest.fn().mockReturnValue('mock-token')
};

// Mock VS Code workspace
jest.mock('vscode', () => {
  return {
    window: {
      createOutputChannel: jest.fn().mockReturnValue(mockOutputChannel)
    },
    workspace: {
      getConfiguration: jest.fn().mockReturnValue(mockConfiguration)
    }
  };
});

describe('NotionClient', () => {
  let client: NotionClient;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Reset mocks
    mockOutputChannel.appendLine.mockClear();
    mockConfiguration.get.mockClear();
    
    // Create client
    client = new NotionClient();
  });

  afterEach(() => {
    sandbox.restore();
  });

  // TEST-NOTION-001: Test Notion client initialization
  test('should initialize with token from settings', () => {
    // Assert
    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('adamize.notion');
    expect(mockConfiguration.get).toHaveBeenCalledWith('token');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Notion client initialized');
  });

  // TEST-NOTION-001a: Test Notion client initialization with explicit token
  test('should initialize with explicit token', () => {
    // Act
    const explicitClient = new NotionClient('explicit-token');
    
    // Assert
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Notion client initialized');
  });

  // TEST-NOTION-001b: Test Notion client initialization failure
  test('should throw error if token not configured', () => {
    // Arrange
    mockConfiguration.get.mockReturnValueOnce(undefined);
    
    // Act & Assert
    expect(() => new NotionClient()).toThrow('Notion API token not configured');
  });

  // TEST-NOTION-002: Test searching pages
  test('searchPages() should return array of pages', async () => {
    // Act
    const pages = await client.searchPages('test');
    
    // Assert
    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe('page-id-1');
    expect(pages[0].title).toBe('Test Page 1');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Searching for pages with query: test');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Found 1 pages');
  });

  // TEST-NOTION-003: Test getting a page
  test('getPage() should return a page', async () => {
    // Act
    const page = await client.getPage('page-id-1');
    
    // Assert
    expect(page.id).toBe('page-id-1');
    expect(page.title).toBe('Test Page 1');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Getting page with ID: page-id-1');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Retrieved page: Test Page 1');
  });

  // TEST-NOTION-004: Test creating a page
  test('createPage() should create a page', async () => {
    // Act
    const page = await client.createPage({
      title: 'New Page',
      content: 'Test content'
    });
    
    // Assert
    expect(page.id).toBe('new-page-id');
    expect(page.title).toBe('New Page');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Creating page with title: New Page');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Created page: New Page');
  });

  // TEST-NOTION-005: Test updating a page
  test('updatePage() should update a page', async () => {
    // Act
    const page = await client.updatePage('page-id-1', {
      title: {
        title: [
          {
            text: {
              content: 'Updated Page'
            }
          }
        ]
      }
    });
    
    // Assert
    expect(page.id).toBe('page-id-1');
    expect(page.title).toBe('Updated Page');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Updating page with ID: page-id-1');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Updated page: Updated Page');
  });

  // TEST-NOTION-006: Test getting page blocks
  test('getPageBlocks() should return array of blocks', async () => {
    // Act
    const blocks = await client.getPageBlocks('page-id-1');
    
    // Assert
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe('block-id-1');
    expect(blocks[0].type).toBe('paragraph');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Getting blocks for page with ID: page-id-1');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Found 1 blocks');
  });

  // TEST-NOTION-007: Test adding a block
  test('addBlock() should add a block', async () => {
    // Act
    const block = await client.addBlock('page-id-1', {
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: 'New paragraph'
            }
          }
        ]
      }
    });
    
    // Assert
    expect(block.id).toBe('new-block-id');
    expect(block.type).toBe('paragraph');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Adding block to page with ID: page-id-1');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Added block with ID: new-block-id');
  });
});
