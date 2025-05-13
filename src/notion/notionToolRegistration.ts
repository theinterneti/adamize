/**
 * Notion Tool Registration
 * 
 * Registers the Notion tool with the MCP bridge.
 * @module notion/notionToolRegistration
 * @implements REQ-NOTION-008 Register Notion tool with MCP bridge
 */

import * as vscode from 'vscode';
import { NotionTool } from './notionTool';
import { MCPToolRegistry, ToolMetadata } from '../mcp/mcpToolRegistry';
import { MCPTool } from '../mcp/mcpTypes';

/**
 * Register Notion tool with MCP bridge
 * @param toolRegistry Tool registry
 */
export function registerNotionTool(toolRegistry: MCPToolRegistry): void {
  // Get Notion API token from settings
  const token = vscode.workspace.getConfiguration('adamize.notion').get<string>('token');
  
  if (!token) {
    vscode.window.showWarningMessage('Notion API token not configured. Notion tool will not be available.');
    return;
  }
  
  // Create Notion tool
  const notionTool = new NotionTool(token);
  
  // Create MCP tool
  const mcpTool: MCPTool = {
    name: 'notion',
    description: 'Tool for interacting with Notion pages and databases',
    schema: {
      name: 'notion',
      description: 'Tool for interacting with Notion pages and databases',
      version: '1.0.0',
      functions: [
        {
          name: 'searchPages',
          description: 'Search for pages in Notion',
          parameters: [
            {
              name: 'query',
              description: 'Search query',
              type: 'string',
              required: true
            }
          ],
          returnType: 'object[]'
        },
        {
          name: 'getPage',
          description: 'Get a page by ID',
          parameters: [
            {
              name: 'pageId',
              description: 'Page ID',
              type: 'string',
              required: true
            }
          ],
          returnType: 'object'
        },
        {
          name: 'createPage',
          description: 'Create a new page',
          parameters: [
            {
              name: 'title',
              description: 'Page title',
              type: 'string',
              required: true
            },
            {
              name: 'parentId',
              description: 'Parent page or database ID',
              type: 'string',
              required: false
            },
            {
              name: 'parentType',
              description: 'Parent type (page or database)',
              type: 'string',
              required: false
            },
            {
              name: 'content',
              description: 'Page content',
              type: 'string',
              required: false
            },
            {
              name: 'icon',
              description: 'Page icon (emoji)',
              type: 'string',
              required: false
            }
          ],
          returnType: 'object'
        },
        {
          name: 'updatePage',
          description: 'Update a page',
          parameters: [
            {
              name: 'pageId',
              description: 'Page ID',
              type: 'string',
              required: true
            },
            {
              name: 'title',
              description: 'Page title',
              type: 'string',
              required: false
            },
            {
              name: 'properties',
              description: 'Page properties',
              type: 'object',
              required: false
            }
          ],
          returnType: 'object'
        },
        {
          name: 'getPageBlocks',
          description: 'Get page blocks',
          parameters: [
            {
              name: 'pageId',
              description: 'Page ID',
              type: 'string',
              required: true
            }
          ],
          returnType: 'object[]'
        },
        {
          name: 'addBlock',
          description: 'Add a block to a page',
          parameters: [
            {
              name: 'pageId',
              description: 'Page ID',
              type: 'string',
              required: true
            },
            {
              name: 'type',
              description: 'Block type',
              type: 'string',
              required: true
            },
            {
              name: 'content',
              description: 'Block content',
              type: 'string',
              required: true
            },
            {
              name: 'language',
              description: 'Code language (for code blocks)',
              type: 'string',
              required: false
            },
            {
              name: 'checked',
              description: 'Checked state (for to-do blocks)',
              type: 'boolean',
              required: false
            }
          ],
          returnType: 'object'
        },
        {
          name: 'addCode',
          description: 'Add code to a page',
          parameters: [
            {
              name: 'pageId',
              description: 'Page ID',
              type: 'string',
              required: true
            },
            {
              name: 'code',
              description: 'Code content',
              type: 'string',
              required: true
            },
            {
              name: 'language',
              description: 'Code language',
              type: 'string',
              required: true
            },
            {
              name: 'title',
              description: 'Code block title',
              type: 'string',
              required: false
            }
          ],
          returnType: 'object'
        }
      ]
    },
    execute: async (functionName: string, parameters: Record<string, unknown>): Promise<unknown> => {
      switch (functionName) {
        case 'searchPages':
          return await notionTool.searchPages(parameters as { query: string });
        case 'getPage':
          return await notionTool.getPage(parameters as { pageId: string });
        case 'createPage':
          return await notionTool.createPage(parameters as {
            title: string;
            parentId?: string;
            parentType?: 'page' | 'database';
            content?: string;
            icon?: string;
          });
        case 'updatePage':
          return await notionTool.updatePage(parameters as {
            pageId: string;
            title?: string;
            properties?: Record<string, any>;
          });
        case 'getPageBlocks':
          return await notionTool.getPageBlocks(parameters as { pageId: string });
        case 'addBlock':
          return await notionTool.addBlock(parameters as {
            pageId: string;
            type: 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' | 'bulleted_list_item' | 'numbered_list_item' | 'to_do' | 'toggle' | 'code' | 'quote' | 'divider';
            content: string;
            language?: string;
            checked?: boolean;
          });
        case 'addCode':
          return await notionTool.addCode(parameters as {
            pageId: string;
            code: string;
            language: string;
            title?: string;
          });
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    }
  };
  
  // Create tool metadata
  const toolMetadata: ToolMetadata = {
    keywords: [
      'notion',
      'document',
      'page',
      'database',
      'wiki',
      'knowledge',
      'base',
      'documentation',
      'notes',
      'search',
      'create',
      'update',
      'add',
      'block',
      'code'
    ],
    categories: ['documentation', 'knowledge management'],
    priority: 5,
    formatInstructions: `
To use the Notion tool, you can perform the following operations:

1. Search for pages:
   notion.searchPages({ query: "search query" })

2. Get a page by ID:
   notion.getPage({ pageId: "page-id" })

3. Create a new page:
   notion.createPage({ title: "Page Title", content: "Page content", parentId: "optional-parent-id", parentType: "page" })

4. Update a page:
   notion.updatePage({ pageId: "page-id", title: "New Title" })

5. Get page blocks:
   notion.getPageBlocks({ pageId: "page-id" })

6. Add a block to a page:
   notion.addBlock({ pageId: "page-id", type: "paragraph", content: "Block content" })

7. Add code to a page:
   notion.addCode({ pageId: "page-id", code: "console.log('Hello World')", language: "javascript", title: "Example Code" })
`
  };
  
  // Register tool with MCP bridge
  toolRegistry.registerTool(mcpTool, toolMetadata);
}
