/**
 * Simple MCP Server
 * 
 * This is a basic MCP server implementation for testing purposes.
 */

const http = require('http');
const url = require('url');

// Define available tools
const tools = [
  {
    name: 'calculator',
    description: 'A simple calculator tool',
    functions: [
      {
        name: 'add',
        description: 'Add two numbers',
        parameters: {
          type: 'object',
          properties: {
            a: {
              type: 'number',
              description: 'First number'
            },
            b: {
              type: 'number',
              description: 'Second number'
            }
          },
          required: ['a', 'b']
        }
      },
      {
        name: 'subtract',
        description: 'Subtract two numbers',
        parameters: {
          type: 'object',
          properties: {
            a: {
              type: 'number',
              description: 'First number'
            },
            b: {
              type: 'number',
              description: 'Second number'
            }
          },
          required: ['a', 'b']
        }
      }
    ]
  },
  {
    name: 'echo',
    description: 'Echo back the input',
    functions: [
      {
        name: 'echo',
        description: 'Echo back the input',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to echo'
            }
          },
          required: ['text']
        }
      }
    ]
  }
];

// Create HTTP server
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Handle API endpoints
  if (path === '/api/v1/tools') {
    // Return list of tools
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tools }));
    return;
  }
  
  if (path === '/api/v1/call') {
    // Handle tool calls
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { tool, function: functionName, parameters } = data;
        
        // Find the tool
        const toolDef = tools.find(t => t.name === tool);
        if (!toolDef) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Tool '${tool}' not found` }));
          return;
        }
        
        // Find the function
        const functionDef = toolDef.functions.find(f => f.name === functionName);
        if (!functionDef) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Function '${functionName}' not found in tool '${tool}'` }));
          return;
        }
        
        // Execute the function
        let result;
        if (tool === 'calculator') {
          if (functionName === 'add') {
            result = parameters.a + parameters.b;
          } else if (functionName === 'subtract') {
            result = parameters.a - parameters.b;
          }
        } else if (tool === 'echo') {
          if (functionName === 'echo') {
            result = parameters.text;
          }
        }
        
        // Return the result
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    
    return;
  }
  
  // Handle unknown endpoints
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
});
