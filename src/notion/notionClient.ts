/**
 * Notion Client
 * 
 * Client for interacting with the Notion API.
 * @module notion/notionClient
 * @implements REQ-NOTION-001 Connect to Notion API
 * @implements REQ-NOTION-002 Manage Notion API token
 * @implements REQ-NOTION-003 Perform CRUD operations on Notion pages
 */

import { Client } from '@notionhq/client';
import * as vscode from 'vscode';

/**
 * Notion page
 */
export interface NotionPage {
  /** Page ID */
  id: string;
  /** Page title */
  title: string;
  /** Page URL */
  url?: string;
  /** Page icon */
  icon?: string;
  /** Page properties */
  properties?: Record<string, any>;
}

/**
 * Notion database
 */
export interface NotionDatabase {
  /** Database ID */
  id: string;
  /** Database title */
  title: string;
  /** Database URL */
  url?: string;
  /** Database properties */
  properties?: Record<string, any>;
}

/**
 * Notion block
 */
export interface NotionBlock {
  /** Block ID */
  id: string;
  /** Block type */
  type: string;
  /** Block content */
  content: any;
}

/**
 * Notion Client
 * 
 * This class provides a client for interacting with the Notion API.
 */
export class NotionClient {
  private client: Client;
  private outputChannel: vscode.OutputChannel;
  
  /**
   * Create a new Notion client
   * @param token Optional Notion API token (if not provided, will be read from settings)
   */
  constructor(token?: string) {
    this.outputChannel = vscode.window.createOutputChannel('Adamize Notion');
    
    // Get token from parameters or from VS Code settings
    const apiToken = token || vscode.workspace.getConfiguration('adamize.notion').get<string>('token');
    if (!apiToken) {
      throw new Error('Notion API token not configured');
    }
    
    this.client = new Client({ auth: apiToken });
    this.outputChannel.appendLine('Notion client initialized');
  }
  
  /**
   * Search for pages in Notion
   * @param query Search query
   * @returns Array of pages
   */
  async searchPages(query: string): Promise<NotionPage[]> {
    try {
      this.outputChannel.appendLine(`Searching for pages with query: ${query}`);
      
      const response = await this.client.search({
        query,
        filter: {
          property: 'object',
          value: 'page'
        }
      });
      
      const pages: NotionPage[] = response.results.map((page: any) => {
        let title = 'Untitled';
        
        // Extract title from properties
        if (page.properties && page.properties.title) {
          const titleProperty = page.properties.title;
          if (titleProperty.title && titleProperty.title.length > 0) {
            title = titleProperty.title.map((t: any) => t.plain_text).join('');
          }
        }
        
        return {
          id: page.id,
          title,
          url: page.url,
          icon: page.icon?.emoji || page.icon?.external?.url,
          properties: page.properties
        };
      });
      
      this.outputChannel.appendLine(`Found ${pages.length} pages`);
      return pages;
    } catch (error) {
      this.outputChannel.appendLine(`Error searching pages: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get a page by ID
   * @param pageId Page ID
   * @returns Page
   */
  async getPage(pageId: string): Promise<NotionPage> {
    try {
      this.outputChannel.appendLine(`Getting page with ID: ${pageId}`);
      
      const response = await this.client.pages.retrieve({ page_id: pageId });
      
      let title = 'Untitled';
      
      // Extract title from properties
      if (response.properties && response.properties.title) {
        const titleProperty = response.properties.title;
        if (titleProperty.title && titleProperty.title.length > 0) {
          title = titleProperty.title.map((t: any) => t.plain_text).join('');
        }
      }
      
      const page: NotionPage = {
        id: response.id,
        title,
        url: response.url,
        icon: response.icon?.emoji || response.icon?.external?.url,
        properties: response.properties
      };
      
      this.outputChannel.appendLine(`Retrieved page: ${page.title}`);
      return page;
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
      
      // Determine parent
      let parent: any;
      if (params.parentId) {
        if (params.parentType === 'database') {
          parent = {
            database_id: params.parentId
          };
        } else {
          parent = {
            page_id: params.parentId
          };
        }
      } else {
        // Use default database if configured
        const defaultDatabaseId = vscode.workspace.getConfiguration('adamize.notion').get<string>('defaultDatabaseId');
        if (defaultDatabaseId) {
          parent = {
            database_id: defaultDatabaseId
          };
        } else {
          throw new Error('Parent ID or default database ID required');
        }
      }
      
      // Create page
      const response = await this.client.pages.create({
        parent,
        properties: {
          title: {
            title: [
              {
                text: {
                  content: params.title
                }
              }
            ]
          }
        },
        icon: params.icon ? {
          emoji: params.icon
        } : undefined
      });
      
      // Add content if provided
      if (params.content) {
        await this.addBlock(response.id, {
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
        });
      }
      
      const page: NotionPage = {
        id: response.id,
        title: params.title,
        url: response.url,
        icon: params.icon,
        properties: response.properties
      };
      
      this.outputChannel.appendLine(`Created page: ${page.title}`);
      return page;
    } catch (error) {
      this.outputChannel.appendLine(`Error creating page: ${error}`);
      throw error;
    }
  }
  
  /**
   * Update a page
   * @param pageId Page ID
   * @param properties Properties to update
   * @returns Updated page
   */
  async updatePage(pageId: string, properties: Record<string, any>): Promise<NotionPage> {
    try {
      this.outputChannel.appendLine(`Updating page with ID: ${pageId}`);
      
      const response = await this.client.pages.update({
        page_id: pageId,
        properties
      });
      
      let title = 'Untitled';
      
      // Extract title from properties
      if (response.properties && response.properties.title) {
        const titleProperty = response.properties.title;
        if (titleProperty.title && titleProperty.title.length > 0) {
          title = titleProperty.title.map((t: any) => t.plain_text).join('');
        }
      }
      
      const page: NotionPage = {
        id: response.id,
        title,
        url: response.url,
        icon: response.icon?.emoji || response.icon?.external?.url,
        properties: response.properties
      };
      
      this.outputChannel.appendLine(`Updated page: ${page.title}`);
      return page;
    } catch (error) {
      this.outputChannel.appendLine(`Error updating page: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get page blocks
   * @param pageId Page ID
   * @returns Array of blocks
   */
  async getPageBlocks(pageId: string): Promise<NotionBlock[]> {
    try {
      this.outputChannel.appendLine(`Getting blocks for page with ID: ${pageId}`);
      
      const response = await this.client.blocks.children.list({
        block_id: pageId
      });
      
      const blocks: NotionBlock[] = response.results.map((block: any) => {
        return {
          id: block.id,
          type: block.type,
          content: block[block.type]
        };
      });
      
      this.outputChannel.appendLine(`Found ${blocks.length} blocks`);
      return blocks;
    } catch (error) {
      this.outputChannel.appendLine(`Error getting page blocks: ${error}`);
      throw error;
    }
  }
  
  /**
   * Add a block to a page
   * @param pageId Page ID
   * @param blockContent Block content
   * @returns Created block
   */
  async addBlock(pageId: string, blockContent: any): Promise<NotionBlock> {
    try {
      this.outputChannel.appendLine(`Adding block to page with ID: ${pageId}`);
      
      const response = await this.client.blocks.children.append({
        block_id: pageId,
        children: [blockContent]
      });
      
      const block = response.results[0];
      
      const notionBlock: NotionBlock = {
        id: block.id,
        type: block.type,
        content: block[block.type]
      };
      
      this.outputChannel.appendLine(`Added block with ID: ${notionBlock.id}`);
      return notionBlock;
    } catch (error) {
      this.outputChannel.appendLine(`Error adding block: ${error}`);
      throw error;
    }
  }
}
