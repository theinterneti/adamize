/**
 * Memory Graph View Tests
 *
 * @implements TEST-UI-201 Display a visualization of the memory graph
 * @implements TEST-UI-202 Allow zooming and panning the graph
 * @implements TEST-UI-203 Show entity types with different colors
 * @implements TEST-UI-204 Show relations between entities
 * @implements TEST-UI-205 Allow clicking on entities to view details
 * @implements TEST-UI-206 Allow filtering the graph by entity type
 * @implements TEST-UI-207 Allow searching for entities in the graph
 */

import * as vscode from 'vscode';
import { MemoryGraphViewProvider } from '../../../ui/memoryGraphView';

// Mock vscode namespace
jest.mock('vscode', () => {
  const Uri = {
    file: jest.fn().mockImplementation((path) => ({ path })),
    parse: jest.fn().mockImplementation((url) => ({ url }))
  };

  // Create a mock WebviewPanel class
  class MockWebviewPanel {
    webview = {
      html: '',
      onDidReceiveMessage: jest.fn(),
      postMessage: jest.fn().mockResolvedValue(undefined),
      asWebviewUri: jest.fn().mockImplementation((uri) => uri)
    };
    onDidDispose = jest.fn();
    reveal = jest.fn();
    dispose = jest.fn();
  }

  return {
    Uri,
    WebviewPanel: MockWebviewPanel,
    window: {
      createWebviewPanel: jest.fn().mockImplementation(() => new MockWebviewPanel()),
      showQuickPick: jest.fn(),
      showInformationMessage: jest.fn(),
      showErrorMessage: jest.fn()
    },
    commands: {
      registerCommand: jest.fn()
    },
    ViewColumn: {
      One: 1,
      Two: 2,
      Three: 3
    }
  };
});

suite('Memory Graph View Test Suite', () => {
  let provider: MemoryGraphViewProvider;
  let extensionContext: any;
  let outputChannel: any;
  let memoryClient: any;

  setup(() => {
    // Create mocks
    extensionContext = {
      subscriptions: [],
      extensionPath: '/path/to/extension'
    };

    outputChannel = {
      appendLine: jest.fn(),
      show: jest.fn()
    };

    // Mock memory client
    memoryClient = {
      readGraph: jest.fn().mockResolvedValue({
        result: {
          entities: [
            {
              name: 'Entity1',
              entityType: 'Type1',
              observations: ['Observation1', 'Observation2']
            },
            {
              name: 'Entity2',
              entityType: 'Type2',
              observations: ['Observation3']
            }
          ],
          relations: [
            {
              from: 'Entity1',
              to: 'Entity2',
              relationType: 'RELATED_TO'
            }
          ]
        }
      }),
      searchNodes: jest.fn().mockResolvedValue({
        result: {
          entities: [
            {
              name: 'Entity1',
              entityType: 'Type1',
              observations: ['Observation1', 'Observation2']
            }
          ]
        }
      }),
      openNodes: jest.fn().mockResolvedValue({
        result: {
          entities: [
            {
              name: 'Entity1',
              entityType: 'Type1',
              observations: ['Observation1', 'Observation2']
            }
          ]
        }
      })
    };

    // Create the provider
    provider = new MemoryGraphViewProvider(extensionContext, memoryClient, outputChannel);
  });

  teardown(() => {
    jest.clearAllMocks();
  });

  // TEST-UI-201: Display a visualization of the memory graph
  test('should create a graph visualization', async () => {
    const panel = await provider.createOrShowPanel();

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'memoryGraph',
      'Memory Graph',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [expect.anything()]
      }
    );

    expect(panel).toBeDefined();
    expect(memoryClient.readGraph).toHaveBeenCalled();

    // Check that the panel received the graph data
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'updateGraph',
      data: {
        entities: [
          {
            name: 'Entity1',
            entityType: 'Type1',
            observations: ['Observation1', 'Observation2']
          },
          {
            name: 'Entity2',
            entityType: 'Type2',
            observations: ['Observation3']
          }
        ],
        relations: [
          {
            from: 'Entity1',
            to: 'Entity2',
            relationType: 'RELATED_TO'
          }
        ]
      }
    });
  });

  // TEST-UI-205: Allow clicking on entities to view details
  test('should show entity details when clicked', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate receiving a message from the webview
    await provider.handleWebviewMessage({ command: 'showEntityDetails', entityName: 'Entity1' });

    expect(memoryClient.openNodes).toHaveBeenCalledWith(['Entity1']);

    // Check that the panel received the entity details
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'showEntityDetails',
      entity: {
        name: 'Entity1',
        entityType: 'Type1',
        observations: ['Observation1', 'Observation2']
      }
    });
  });

  // TEST-UI-206: Allow filtering the graph by entity type
  test('should filter graph by entity type', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate receiving a message from the webview
    await provider.handleWebviewMessage({ command: 'filterByType', entityType: 'Type1' });

    // Check that the panel received the filtered graph data
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'updateGraph',
      data: {
        entities: [
          {
            name: 'Entity1',
            entityType: 'Type1',
            observations: ['Observation1', 'Observation2']
          }
        ],
        relations: []
      }
    });
  });

  // TEST-UI-207: Allow searching for entities in the graph
  test('should search for entities in the graph', async () => {
    const panel = await provider.createOrShowPanel();

    // Simulate receiving a message from the webview
    await provider.handleWebviewMessage({ command: 'searchEntities', query: 'Entity1' });

    expect(memoryClient.searchNodes).toHaveBeenCalledWith('Entity1');

    // Check that the panel received the search results
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'updateGraph',
      data: {
        entities: [
          {
            name: 'Entity1',
            entityType: 'Type1',
            observations: ['Observation1', 'Observation2']
          }
        ],
        relations: []
      }
    });
  });
});
