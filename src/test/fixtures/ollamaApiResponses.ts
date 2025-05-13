/**
 * Ollama API Response Fixtures
 * 
 * This module provides mock responses for Ollama API endpoints.
 * Used for testing without requiring an actual Ollama server.
 * 
 * @module test/fixtures/ollamaApiResponses
 */

/**
 * Mock response for the /api/tags endpoint
 */
export const listModelsResponse = {
  models: [
    {
      name: 'llama2',
      modified_at: '2023-01-01T00:00:00Z',
      size: 4000000000,
      digest: 'sha256:1234567890',
      details: {
        format: 'gguf',
        family: 'llama',
        families: ['llama'],
        parameter_size: '7B',
        quantization_level: 'Q4_0',
      },
    },
    {
      name: 'mistral',
      modified_at: '2023-01-02T00:00:00Z',
      size: 5000000000,
      digest: 'sha256:0987654321',
      details: {
        format: 'gguf',
        family: 'mistral',
        families: ['mistral'],
        parameter_size: '7B',
        quantization_level: 'Q4_0',
      },
    },
  ],
};

/**
 * Mock response for the /api/pull endpoint
 */
export const pullModelResponse = {
  status: 'success',
};

/**
 * Mock response for the /api/delete endpoint
 */
export const removeModelResponse = {
  status: 'success',
};

/**
 * Mock response for the /api/show endpoint
 */
export const modelInfoResponse = {
  name: 'llama2',
  modified_at: '2023-01-01T00:00:00Z',
  size: 4000000000,
  digest: 'sha256:1234567890',
  details: {
    format: 'gguf',
    family: 'llama',
    families: ['llama'],
    parameter_size: '7B',
    quantization_level: 'Q4_0',
  },
};

/**
 * Mock response for the /v1/chat/completions endpoint
 */
export const chatCompletionResponse = {
  model: 'llama2',
  created_at: '2023-01-01T00:00:00Z',
  message: {
    role: 'assistant',
    content: 'Hello, I am a helpful assistant. How can I help you today?',
  },
  done: true,
};

/**
 * Mock response for the /v1/chat/completions endpoint with tool calls
 */
export const chatCompletionWithToolCallsResponse = {
  model: 'llama2',
  created_at: '2023-01-01T00:00:00Z',
  message: {
    role: 'assistant',
    content: 'I will call a tool for you',
    tool_calls: [
      {
        name: 'test-tool.testFunction',
        parameters: { param1: 'test value' },
      },
    ],
  },
  done: true,
};

/**
 * Mock streaming response chunks for the /v1/chat/completions endpoint
 */
export const streamingResponseChunks = [
  {
    model: 'llama2',
    created_at: '2023-01-01T00:00:00Z',
    message: {
      role: 'assistant',
      content: 'Hello',
    },
    done: false,
  },
  {
    model: 'llama2',
    created_at: '2023-01-01T00:00:00Z',
    message: {
      role: 'assistant',
      content: ' world',
    },
    done: false,
  },
  {
    model: 'llama2',
    created_at: '2023-01-01T00:00:00Z',
    message: {
      role: 'assistant',
      content: '!',
    },
    done: true,
  },
];

/**
 * Mock streaming response chunks with tool calls
 */
export const streamingWithToolCallsResponseChunks = [
  {
    model: 'llama2',
    created_at: '2023-01-01T00:00:00Z',
    message: {
      role: 'assistant',
      content: 'I will call a tool for you',
    },
    done: false,
  },
  {
    model: 'llama2',
    created_at: '2023-01-01T00:00:00Z',
    message: {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          name: 'test-tool.testFunction',
          parameters: { param1: 'test value' },
        },
      ],
    },
    done: false,
  },
  {
    model: 'llama2',
    created_at: '2023-01-01T00:00:00Z',
    message: {
      role: 'assistant',
      content: '',
    },
    done: true,
  },
];

/**
 * Create a mock ReadableStream for streaming responses
 * @param chunks Response chunks to stream
 * @returns ReadableStream
 */
export function createMockStream(chunks: any[]): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Add each chunk to the stream
      chunks.forEach(chunk => {
        controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
      });
      
      // Close the stream
      controller.close();
    }
  });
}
