# MCP Tool Registry Implementation

The MCP Tool Registry is a core component of the MCP Bridge that manages the registration, discovery, and usage of MCP tools.

## Status

- **Status**: ✅ Complete Implementation
- **Priority**: High
- **Requirement Tags**: REQ-MCP-050, REQ-MCP-051, REQ-MCP-052, REQ-MCP-053
- **Test Tags**: TEST-MCP-050, TEST-MCP-051, TEST-MCP-052, TEST-MCP-053
- **Implementation Tags**: IMPL-MCP-050, IMPL-MCP-051, IMPL-MCP-052, IMPL-MCP-053

## Requirements

- ✅ REQ-MCP-050: Register and manage MCP tools
- ✅ REQ-MCP-051: Detect appropriate tools from user prompts
- ✅ REQ-MCP-052: Generate format instructions for tools
- ✅ REQ-MCP-053: Generate example arguments for tool schemas

## Implementation Summary

The MCPToolRegistry has been fully implemented with the following features:

1. **Tool Registration and Management**
   - Register tools with metadata (keywords, priority, categories)
   - Retrieve tools by name or get all registered tools
   - Remove tools from the registry

2. **Sophisticated Tool Detection**
   - Enhanced scoring algorithm with multiple match types (exact, word boundary, substring)
   - Function name and description-based scoring
   - Category-based scoring
   - Priority-based scoring

3. **Improved Tool Instructions**
   - Categorized tool organization
   - Better formatting with sections for categories
   - Detailed usage guidelines
   - Special handling for single tool case

4. **Context-Aware Example Generation**
   - Generate realistic examples based on parameter names and types
   - Use context hints from tool and function names
   - Defensive parameter handling

## Implementation Details

### Tool Registration

```typescript
/**
 * Register a tool with the registry
 * @param tool Tool to register
 * @param metadata Optional metadata for the tool
 * @implements REQ-MCP-050 Register and manage MCP tools
 */
registerTool(tool: MCPTool, metadata?: IMCPToolMetadata): void {
  this.log(`Registering tool: ${tool.name}`);
  this.tools.set(tool.name, tool);

  if (metadata) {
    this.metadata.set(tool.name, metadata);
  }
}
```

### Tool Detection

```typescript
/**
 * Detect appropriate tools for a user prompt
 * @param prompt User prompt
 * @param maxTools Maximum number of tools to return (default: 3)
 * @returns Array of tool names sorted by relevance
 * @implements REQ-MCP-051 Detect appropriate tools from user prompts
 */
detectToolsForPrompt(prompt: string, maxTools: number = 3): string[] {
  if (this.tools.size === 0) {
    return [];
  }

  const promptLower = prompt.toLowerCase();
  const toolScores: Array<{ name: string; score: number }> = [];

  // Score each tool based on keyword matches and priority
  const toolEntries = Array.from(this.tools.entries());

  for (const [toolName, tool] of toolEntries) {
    const metadata = this.metadata.get(toolName);
    if (!metadata) continue;

    let score = 0;

    // Score based on keyword matches
    for (const keyword of metadata.keywords) {
      const keywordLower = keyword.toLowerCase();
      // Exact match gets higher score
      if (promptLower === keywordLower) {
        score += 5;
      }
      // Word boundary match gets medium score
      else if (new RegExp(`\\b${keywordLower}\\b`).test(promptLower)) {
        score += 3;
      }
      // Substring match gets lower score
      else if (promptLower.includes(keywordLower)) {
        score += 1;
      }
    }

    // Score based on function names and descriptions
    for (const func of tool.schema.functions) {
      // Function name match
      if (promptLower.includes(func.name.toLowerCase())) {
        score += 2;
      }
      
      // Function description match (check for key phrases)
      const descWords = func.description.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      for (const word of descWords) {
        if (promptLower.includes(word)) {
          score += 0.5;
        }
      }
    }

    // Add priority if available
    if (metadata.priority !== undefined) {
      score += metadata.priority;
    }

    // Add category-based scoring
    if (metadata.categories) {
      // Check if any category-related words are in the prompt
      for (const category of metadata.categories) {
        if (promptLower.includes(category.toLowerCase())) {
          score += 1;
        }
      }
    }

    toolScores.push({ name: toolName, score });
  }

  // Sort by score (descending) and take top N
  return toolScores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTools)
    .filter(tool => tool.score > 0) // Only include tools with matches
    .map(tool => tool.name);
}

/**
 * Detect the most appropriate tool for a user prompt
 * @param prompt User prompt
 * @returns The most appropriate tool name or undefined if no match
 * @implements REQ-MCP-051 Detect appropriate tools from user prompts
 */
detectToolFromPrompt(prompt: string): string | undefined {
  const tools = this.detectToolsForPrompt(prompt, 1);
  return tools.length > 0 ? tools[0] : undefined;
}
```

### Example Generation

```typescript
/**
 * Generate example arguments for a function
 * @param toolName Tool name
 * @param functionName Function name
 * @returns Example arguments
 * @implements REQ-MCP-053 Generate example arguments for tool schemas
 */
generateExampleArgs(toolName: string, functionName: string): Record<string, unknown> | undefined {
  const tool = this.getTool(toolName);

  if (!tool) {
    return undefined;
  }

  const func = tool.schema.functions.find(f => f.name === functionName);

  if (!func) {
    return undefined;
  }

  // Check if we have pre-defined example args in metadata
  const metadata = this.metadata.get(toolName);
  if (metadata && metadata.exampleArgs) {
    return metadata.exampleArgs;
  }

  // Otherwise generate example args from schema
  const exampleArgs: Record<string, unknown> = {};

  // Generate context-aware examples based on function and tool names
  const contextHints = {
    toolName: toolName.toLowerCase(),
    funcName: functionName.toLowerCase(),
    description: tool.description.toLowerCase(),
    funcDescription: func.description.toLowerCase(),
  };

  // Check if parameters is iterable
  if (func.parameters && Array.isArray(func.parameters)) {
    for (const param of func.parameters) {
      exampleArgs[param.name] = this.generateExampleValue(param, contextHints);
    }
  }

  return exampleArgs;
}
```

## Usage Example

```typescript
// Create a tool registry
const registry = new MCPToolRegistry();

// Register a tool
registry.registerTool(
  {
    name: 'calculator',
    description: 'A simple calculator tool',
    schema: {
      functions: [
        {
          name: 'add',
          description: 'Add two numbers',
          parameters: [
            {
              name: 'a',
              type: 'number',
              description: 'First number',
              required: true,
            },
            {
              name: 'b',
              type: 'number',
              description: 'Second number',
              required: true,
            },
          ],
        },
      ],
    },
  },
  {
    keywords: ['calculate', 'math', 'add', 'sum'],
    priority: 1,
    categories: ['Math'],
  }
);

// Detect a tool from a prompt
const toolName = registry.detectToolFromPrompt('I need to add two numbers');
// Returns: 'calculator'

// Get tool instructions
const instructions = registry.getToolInstructions();
// Returns formatted instructions for all registered tools

// Generate example arguments
const exampleArgs = registry.generateExampleArgs('calculator', 'add');
// Returns: { a: 42, b: 42 }
```

## Next Steps

With the MCPToolRegistry implementation complete, the next steps are:

1. Complete the MCPBridge implementation with streaming support
2. Complete the MCPBridgeManager implementation
3. Enhance the MCPChatView with streaming support
4. Complete the MCPServerExplorerView
