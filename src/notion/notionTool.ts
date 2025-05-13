/**
 * Notion Tool
 * 
 * Tool for interacting with Notion via MCP.
 * @module notion/notionTool
 * @implements REQ-NOTION-006 Provide MCP tool for Notion operations
 * @implements REQ-NOTION-007 Enable AI assistant to interact with Notion
 */

import * as vscode from 'vscode';
import { NotionClient, NotionPage, NotionBlock } from './notionClient';

/**
 * Notion Tool
 * 
 * This class provides a tool for interacting with Notion via MCP.
 */
export class NotionTool {
  private notionClient: NotionClient;
  private outputChannel: vscode.OutputChannel;
  
  /**
   * Create a new Notion tool
   * @param token Notion API token
   */
  constructor(token: string) {
    this.outputChannel = vscode.window.createOutputChannel('Adamize Notion Tool');
    this.notionClient = new NotionClient(token);
    this.outputChannel.appendLine('Notion tool initialized');
  }
  
  /**
   * Search for pages in Notion
   * @param params Search parameters
   * @returns Array of pages
   */
  async searchPages(params: { query: string }): Promise<NotionPage[]> {
    try {
      this.outputChannel.appendLine(`Searching for pages with query: ${params.query}`);
      return await this.notionClient.searchPages(params.query);
    } catch (error) {
      this.outputChannel.appendLine(`Error searching pages: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get a page by ID
   * @param params Page parameters
   * @returns Page
   */
  async getPage(params: { pageId: string }): Promise<NotionPage> {
    try {
      this.outputChannel.appendLine(`Getting page with ID: ${params.pageId}`);
      return await this.notionClient.getPage(params.pageId);
    } catch (error) {
      this.outputChannel.appendLine(`Error getting page: ${error}`);
      throw error;
    }
  }
  
  /**
   * Create a new page
   * @param params Page creation parameters
   * @returns Created page
   */
  async createPage(params: {
    title: string;
    parentId?: string;
    parentType?: 'page' | 'database';
    content?: string;
    icon?: string;
  }): Promise<NotionPage> {
    try {
      this.outputChannel.appendLine(`Creating page with title: ${params.title}`);
      return await this.notionClient.createPage(params);
    } catch (error) {
      this.outputChannel.appendLine(`Error creating page: ${error}`);
      throw error;
    }
  }
  
  /**
   * Update a page
   * @param params Update parameters
   * @returns Updated page
   */
  async updatePage(params: {
    pageId: string;
    title?: string;
    properties?: Record<string, any>;
  }): Promise<NotionPage> {
    try {
      this.outputChannel.appendLine(`Updating page with ID: ${params.pageId}`);
      
      const properties: Record<string, any> = params.properties || {};
      
      // Add title if provided
      if (params.title) {
        properties.title = {
          title: [
            {
              text: {
                content: params.title
              }
            }
          ]
        };
      }
      
      return await this.notionClient.updatePage(params.pageId, properties);
    } catch (error) {
      this.outputChannel.appendLine(`Error updating page: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get page blocks
   * @param params Block parameters
   * @returns Array of blocks
   */
  async getPageBlocks(params: { pageId: string }): Promise<NotionBlock[]> {
    try {
      this.outputChannel.appendLine(`Getting blocks for page with ID: ${params.pageId}`);
      return await this.notionClient.getPageBlocks(params.pageId);
    } catch (error) {
      this.outputChannel.appendLine(`Error getting page blocks: ${error}`);
      throw error;
    }
  }
  
  /**
   * Add a block to a page
   * @param params Block parameters
   * @returns Created block
   */
  async addBlock(params: {
    pageId: string;
    type: 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' | 'bulleted_list_item' | 'numbered_list_item' | 'to_do' | 'toggle' | 'code' | 'quote' | 'divider';
    content: string;
    language?: string;
    checked?: boolean;
  }): Promise<NotionBlock> {
    try {
      this.outputChannel.appendLine(`Adding ${params.type} block to page with ID: ${params.pageId}`);
      
      let blockContent: any;
      
      // Create block content based on type
      switch (params.type) {
        case 'paragraph':
          blockContent = {
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: params.content
                  }
                }
              ]
            }
          };
          break;
          
        case 'heading_1':
        case 'heading_2':
        case 'heading_3':
          blockContent = {
            type: params.type,
            [params.type]: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: params.content
                  }
                }
              ]
            }
          };
          break;
          
        case 'bulleted_list_item':
        case 'numbered_list_item':
          blockContent = {
            type: params.type,
            [params.type]: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: params.content
                  }
                }
              ]
            }
          };
          break;
          
        case 'to_do':
          blockContent = {
            type: 'to_do',
            to_do: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: params.content
                  }
                }
              ],
              checked: params.checked || false
            }
          };
          break;
          
        case 'toggle':
          blockContent = {
            type: 'toggle',
            toggle: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: params.content
                  }
                }
              ]
            }
          };
          break;
          
        case 'code':
          blockContent = {
            type: 'code',
            code: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: params.content
                  }
                }
              ],
              language: params.language || 'plain text'
            }
          };
          break;
          
        case 'quote':
          blockContent = {
            type: 'quote',
            quote: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: params.content
                  }
                }
              ]
            }
          };
          break;
          
        case 'divider':
          blockContent = {
            type: 'divider',
            divider: {}
          };
          break;
          
        default:
          throw new Error(`Unsupported block type: ${params.type}`);
      }
      
      return await this.notionClient.addBlock(params.pageId, blockContent);
    } catch (error) {
      this.outputChannel.appendLine(`Error adding block: ${error}`);
      throw error;
    }
  }
  
  /**
   * Add code to a page
   * @param params Code parameters
   * @returns Created block
   */
  async addCode(params: {
    pageId: string;
    code: string;
    language: string;
    title?: string;
  }): Promise<NotionBlock> {
    try {
      this.outputChannel.appendLine(`Adding code block to page with ID: ${params.pageId}`);
      
      // Add title if provided
      if (params.title) {
        await this.addBlock({
          pageId: params.pageId,
          type: 'paragraph',
          content: params.title
        });
      }
      
      // Add code block
      return await this.addBlock({
        pageId: params.pageId,
        type: 'code',
        content: params.code,
        language: params.language
      });
    } catch (error) {
      this.outputChannel.appendLine(`Error adding code: ${error}`);
      throw error;
    }
  }
}
