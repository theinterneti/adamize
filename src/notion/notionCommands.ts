/**
 * Notion Commands
 *
 * Commands for interacting with Notion.
 * @module notion/notionCommands
 * @implements REQ-NOTION-004 Provide VS Code commands for Notion operations
 * @implements REQ-NOTION-005 Implement UI for Notion operations
 */

import * as vscode from 'vscode';
import { NotionClient, NotionPage } from './notionClient';

/**
 * Register Notion commands
 * @param context Extension context
 */
export function registerNotionCommands(context: vscode.ExtensionContext): void {
  // Create Notion client
  let notionClient: NotionClient;

  // Try to create Notion client
  try {
    notionClient = new NotionClient();
  } catch (error) {
    // Client creation will fail if token is not configured
    // We'll create it on demand when commands are executed
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('adamize.notion.configureToken', async () => {
      await configureNotionToken();
    }),

    vscode.commands.registerCommand('adamize.notion.searchPages', async () => {
      await ensureNotionClient();
      await searchPages();
    }),

    vscode.commands.registerCommand('adamize.notion.createPage', async () => {
      await ensureNotionClient();
      await createPage();
    }),

    vscode.commands.registerCommand('adamize.notion.addToPage', async () => {
      await ensureNotionClient();
      await addToPage();
    }),

    vscode.commands.registerCommand('adamize.notion.addCodeToPage', async () => {
      await ensureNotionClient();
      await addCodeToPage();
    })
  );

  /**
   * Ensure Notion client is initialized
   */
  async function ensureNotionClient(): Promise<boolean> {
    if (!notionClient) {
      try {
        notionClient = new NotionClient();
        return true;
      } catch (error) {
        const configure = await vscode.window.showErrorMessage(
          'Notion API token not configured. Would you like to configure it now?',
          'Yes',
          'No'
        );

        if (configure === 'Yes') {
          const configured = await configureNotionToken();
          return configured;
        }

        return false;
      }
    }

    return true;
  }

  /**
   * Configure Notion API token
   */
  async function configureNotionToken(): Promise<boolean> {
    const token = await vscode.window.showInputBox({
      prompt: 'Enter your Notion API token',
      password: true,
      ignoreFocusOut: true
    });

    if (token) {
      // Save token in settings
      await vscode.workspace.getConfiguration('adamize.notion').update('token', token, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage('Notion API token configured successfully');

      // Try to create client with new token
      try {
        notionClient = new NotionClient(token);
        return true;
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to initialize Notion client: ${error}`);
        return false;
      }
    }

    return false;
  }

  /**
   * Search Notion pages
   */
  async function searchPages(): Promise<void> {
    const query = await vscode.window.showInputBox({
      prompt: 'Enter search query',
      placeHolder: 'Search Notion pages...'
    });

    if (!query) {
      return;
    }

    try {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Searching Notion pages for "${query}"...`,
          cancellable: false
        },
        async () => {
          const pages = await notionClient.searchPages(query);

          if (pages.length === 0) {
            vscode.window.showInformationMessage(`No pages found for query "${query}"`);
            return;
          }

          // Show pages in quick pick
          const pageItems = pages.map(page => ({
            label: page.title,
            description: page.id,
            page
          }));

          const selectedPage = await vscode.window.showQuickPick(pageItems, {
            placeHolder: 'Select a page to open'
          });

          if (selectedPage) {
            // Open page in browser
            vscode.env.openExternal(vscode.Uri.parse(selectedPage.page.url || `https://notion.so/${selectedPage.page.id.replace(/-/g, '')}`));
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Error searching pages: ${error}`);
    }
  }

  /**
   * Create a new Notion page
   */
  async function createPage(): Promise<void> {
    const title = await vscode.window.showInputBox({
      prompt: 'Enter page title',
      placeHolder: 'New page title'
    });

    if (!title) {
      return;
    }

    const content = await vscode.window.showInputBox({
      prompt: 'Enter page content (optional)',
      placeHolder: 'Page content'
    });

    try {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Creating Notion page "${title}"...`,
          cancellable: false
        },
        async () => {
          const page = await notionClient.createPage({
            title,
            content: content || ''
          });

          vscode.window.showInformationMessage(`Page "${title}" created successfully`, 'Open in Browser').then(selection => {
            if (selection === 'Open in Browser') {
              vscode.env.openExternal(vscode.Uri.parse(page.url || `https://notion.so/${page.id.replace(/-/g, '')}`));
            }
          });
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Error creating page: ${error}`);
    }
  }

  /**
   * Add content to a Notion page
   */
  async function addToPage(): Promise<void> {
    try {
      // Search for pages
      const query = await vscode.window.showInputBox({
        prompt: 'Search for a page to add content to',
        placeHolder: 'Search Notion pages...'
      });

      if (!query) {
        return;
      }

      const pages = await notionClient.searchPages(query);

      if (pages.length === 0) {
        vscode.window.showInformationMessage(`No pages found for query "${query}"`);
        return;
      }

      // Show pages in quick pick
      const pageItems = pages.map(page => ({
        label: page.title,
        description: page.id,
        page
      }));

      const selectedPage = await vscode.window.showQuickPick(pageItems, {
        placeHolder: 'Select a page to add content to'
      });

      if (!selectedPage) {
        return;
      }

      // Get content type
      const contentTypeItems = [
        { label: 'Paragraph', type: 'paragraph' },
        { label: 'Heading 1', type: 'heading_1' },
        { label: 'Heading 2', type: 'heading_2' },
        { label: 'Heading 3', type: 'heading_3' },
        { label: 'Bulleted List Item', type: 'bulleted_list_item' },
        { label: 'Numbered List Item', type: 'numbered_list_item' },
        { label: 'To-Do', type: 'to_do' },
        { label: 'Code', type: 'code' }
      ];

      const selectedContentType = await vscode.window.showQuickPick(contentTypeItems, {
        placeHolder: 'Select content type'
      });

      if (!selectedContentType) {
        return;
      }

      // Get content
      const content = await vscode.window.showInputBox({
        prompt: 'Enter content',
        placeHolder: `${selectedContentType.label} content`
      });

      if (!content) {
        return;
      }

      // Additional parameters for specific types
      let language: string | undefined;
      let checked: boolean | undefined;

      if (selectedContentType.type === 'code') {
        const languageItems = [
          { label: 'Plain Text', value: 'plain text' },
          { label: 'TypeScript', value: 'typescript' },
          { label: 'JavaScript', value: 'javascript' },
          { label: 'Python', value: 'python' },
          { label: 'Java', value: 'java' },
          { label: 'C#', value: 'csharp' },
          { label: 'C++', value: 'cpp' },
          { label: 'HTML', value: 'html' },
          { label: 'CSS', value: 'css' },
          { label: 'JSON', value: 'json' },
          { label: 'Markdown', value: 'markdown' }
        ];

        const selectedLanguage = await vscode.window.showQuickPick(languageItems, {
          placeHolder: 'Select code language'
        });

        if (!selectedLanguage) {
          return;
        }

        language = selectedLanguage.value;
      } else if (selectedContentType.type === 'to_do') {
        const checkedItems = [
          { label: 'Unchecked', value: false },
          { label: 'Checked', value: true }
        ];

        const selectedChecked = await vscode.window.showQuickPick(checkedItems, {
          placeHolder: 'Select checked state'
        });

        if (!selectedChecked) {
          return;
        }

        checked = selectedChecked.value;
      }

      // Add content to page
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Adding content to "${selectedPage.page.title}"...`,
          cancellable: false
        },
        async () => {
          await notionClient.addBlock(selectedPage.page.id, {
            type: selectedContentType.type,
            [selectedContentType.type]: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content
                  }
                }
              ],
              ...(language ? { language } : {}),
              ...(checked !== undefined ? { checked } : {})
            }
          });

          vscode.window.showInformationMessage(`Content added to "${selectedPage.page.title}" successfully`, 'Open in Browser').then(selection => {
            if (selection === 'Open in Browser') {
              vscode.env.openExternal(vscode.Uri.parse(selectedPage.page.url || `https://notion.so/${selectedPage.page.id.replace(/-/g, '')}`));
            }
          });
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Error adding content: ${error}`);
    }
  }

  /**
   * Add code from editor to a Notion page
   */
  async function addCodeToPage(): Promise<void> {
    try {
      // Get selected text
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const code = editor.document.getText(selection);

      if (!code) {
        vscode.window.showErrorMessage('No text selected');
        return;
      }

      // Get language from document
      const language = editor.document.languageId;

      // Search for pages
      const query = await vscode.window.showInputBox({
        prompt: 'Search for a page to add code to',
        placeHolder: 'Search Notion pages...'
      });

      if (!query) {
        return;
      }

      const pages = await notionClient.searchPages(query);

      if (pages.length === 0) {
        vscode.window.showInformationMessage(`No pages found for query "${query}"`);
        return;
      }

      // Show pages in quick pick
      const pageItems = pages.map(page => ({
        label: page.title,
        description: page.id,
        page
      }));

      const selectedPage = await vscode.window.showQuickPick(pageItems, {
        placeHolder: 'Select a page to add code to'
      });

      if (!selectedPage) {
        return;
      }

      // Get title for code block
      const title = await vscode.window.showInputBox({
        prompt: 'Enter title for code block (optional)',
        placeHolder: 'Code block title'
      });

      // Add code to page
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Adding code to "${selectedPage.page.title}"...`,
          cancellable: false
        },
        async () => {
          // Add title if provided
          if (title) {
            await notionClient.addBlock(selectedPage.page.id, {
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: title
                    }
                  }
                ]
              }
            });
          }

          // Add code block
          await notionClient.addBlock(selectedPage.page.id, {
            type: 'code',
            code: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: code
                  }
                }
              ],
              language: language || 'plain text'
            }
          });

          vscode.window.showInformationMessage(`Code added to "${selectedPage.page.title}" successfully`, 'Open in Browser').then(selection => {
            if (selection === 'Open in Browser') {
              vscode.env.openExternal(vscode.Uri.parse(selectedPage.page.url || `https://notion.so/${selectedPage.page.id.replace(/-/g, '')}`));
            }
          });
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Error adding code: ${error}`);
    }
  }
}
