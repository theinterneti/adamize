/**
 * MCP Chat Webview Script
 *
 * Handles the client-side functionality of the MCP Chat interface.
 */

(function () {
  // Get VS Code API
  const vscode = acquireVsCodeApi();

  // DOM elements
  const serverSelect = document.getElementById('server-select');
  const clearButton = document.getElementById('clear-button');
  const chatContainer = document.getElementById('chat-container');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');

  // State
  let activeBridgeId = '';

  // Initialize
  function initialize() {
    // Add event listeners
    serverSelect.addEventListener('change', handleServerChange);
    clearButton.addEventListener('click', handleClearConversation);
    sendButton.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keydown', handleKeyDown);

    // Restore state
    const state = vscode.getState();
    if (state) {
      activeBridgeId = state.activeBridgeId || '';
    }
  }

  // Handle server change
  function handleServerChange() {
    const bridgeId = serverSelect.value;
    if (bridgeId) {
      activeBridgeId = bridgeId;
      vscode.setState({ activeBridgeId });

      // Send message to extension
      vscode.postMessage({
        command: 'selectServer',
        bridgeId,
      });
    }
  }

  // Handle clear conversation
  function handleClearConversation() {
    if (activeBridgeId) {
      // Send message to extension
      vscode.postMessage({
        command: 'clearConversation',
        bridgeId: activeBridgeId,
      });
    }
  }

  // Handle send message
  function handleSendMessage() {
    const text = messageInput.value.trim();
    if (text && activeBridgeId) {
      // Send message to extension
      vscode.postMessage({
        command: 'sendMessage',
        text,
        bridgeId: activeBridgeId,
      });

      // Clear input
      messageInput.value = '';
    }
  }

  // Handle key down
  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  // Add message to chat
  function addMessage(message, messageId) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.role}`;

    // If this is a streaming message, add the message ID as a data attribute
    if (message.isStreaming && messageId) {
      messageElement.dataset.messageId = messageId;
    }

    // Add message content
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';
    contentElement.textContent = message.content;

    // If this is a streaming message, add a cursor
    if (message.isStreaming) {
      contentElement.classList.add('streaming');
      const cursorElement = document.createElement('span');
      cursorElement.className = 'cursor';
      contentElement.appendChild(cursorElement);
    }

    messageElement.appendChild(contentElement);

    // Add tool calls if any
    if (message.toolCalls && message.toolCalls.length > 0) {
      const toolCallsElement = document.createElement('div');
      toolCallsElement.className = 'tool-calls';

      if (messageId) {
        toolCallsElement.dataset.messageId = `${messageId}-toolcalls`;
      }

      message.toolCalls.forEach(toolCall => {
        addToolCallElement(toolCall, toolCallsElement);
      });

      messageElement.appendChild(toolCallsElement);
    } else if (messageId) {
      // Create an empty tool calls container for streaming messages
      const toolCallsElement = document.createElement('div');
      toolCallsElement.className = 'tool-calls';
      toolCallsElement.dataset.messageId = `${messageId}-toolcalls`;
      messageElement.appendChild(toolCallsElement);
    }

    // Add message to chat container
    chatContainer.appendChild(messageElement);

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;

    return messageElement;
  }

  // Add a tool call element to a container
  function addToolCallElement(toolCall, container) {
    const toolCallElement = document.createElement('div');
    toolCallElement.className = 'tool-call';

    // Tool name
    const nameElement = document.createElement('div');
    nameElement.className = 'tool-name';
    nameElement.textContent = `Tool: ${toolCall.name}`;
    toolCallElement.appendChild(nameElement);

    // Tool parameters
    const paramsElement = document.createElement('div');
    paramsElement.className = 'tool-params';
    paramsElement.textContent = `Parameters: ${JSON.stringify(toolCall.parameters, null, 2)}`;
    toolCallElement.appendChild(paramsElement);

    // Tool result
    const resultElement = document.createElement('div');
    resultElement.className = 'tool-result';
    resultElement.textContent = `Result: ${toolCall.result}`;
    toolCallElement.appendChild(resultElement);

    container.appendChild(toolCallElement);
    return toolCallElement;
  }

  // Update a streaming message with new content
  function updateStreamingMessage(messageId, content) {
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!messageElement) return;

    const contentElement = messageElement.querySelector('.message-content');
    if (!contentElement) return;

    // Append the new content
    const textNode = document.createTextNode(content);
    contentElement.insertBefore(textNode, contentElement.querySelector('.cursor'));

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Add a tool call to a streaming message
  function addToolCall(messageId, toolCall) {
    const toolCallsElement = document.querySelector(
      `.tool-calls[data-message-id="${messageId}-toolcalls"]`
    );
    if (!toolCallsElement) return;

    addToolCallElement(toolCall, toolCallsElement);

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Complete a streaming message
  function completeStreamingMessage(messageId, message) {
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!messageElement) return;

    const contentElement = messageElement.querySelector('.message-content');
    if (!contentElement) return;

    // Remove the streaming class and cursor
    contentElement.classList.remove('streaming');
    const cursor = contentElement.querySelector('.cursor');
    if (cursor) {
      cursor.remove();
    }

    // Update the content to ensure it's complete
    contentElement.textContent = message.content;

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Clear messages
  function clearMessages() {
    chatContainer.innerHTML = '';
  }

  // Update server list
  function updateServerList(servers, activeBridgeId) {
    // Clear server select
    serverSelect.innerHTML = '';

    // Add servers
    servers.forEach(server => {
      const option = document.createElement('option');
      option.value = server.id;
      option.textContent = server.name;
      option.disabled = server.status === 'stopped';
      serverSelect.appendChild(option);
    });

    // Set active server
    if (activeBridgeId) {
      serverSelect.value = activeBridgeId;
      window.activeBridgeId = activeBridgeId;
      vscode.setState({ activeBridgeId });
    }
  }

  // Handle messages from extension
  window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
      case 'addMessage':
        addMessage(message.message, message.messageId);
        break;

      case 'clearMessages':
        clearMessages();
        break;

      case 'updateServerList':
        updateServerList(message.servers, message.activeBridgeId);
        break;

      case 'updateStreamingMessage':
        updateStreamingMessage(message.messageId, message.content);
        break;

      case 'addToolCall':
        addToolCall(message.messageId, message.toolCall);
        break;

      case 'completeStreamingMessage':
        completeStreamingMessage(message.messageId, message.message);
        break;
    }
  });

  // Initialize
  initialize();
})();
