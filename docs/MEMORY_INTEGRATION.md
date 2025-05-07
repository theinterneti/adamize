# Memory Integration for Adamize

## Overview

This document describes the integration of memory capabilities into the Adamize VS Code extension. The memory integration allows Adamize to store and retrieve information about your projects, providing a powerful way to search and navigate your codebase.

## Current Status

We've attempted to integrate with the Neo4j memory MCP server, but encountered some challenges with the MCP protocol. The server appears to be designed to work with a specific client that knows how to handle its responses.

## Next Steps

### Option 1: Use Neo4j Directly

Instead of using the MCP server, we can use Neo4j directly to build our knowledge graph. This would involve:

1. Setting up a Neo4j database
2. Creating a Neo4j client in the Adamize extension
3. Building a knowledge graph of the projects folder
4. Implementing search and navigation features

### Option 2: Use a Different Memory Solution

We could explore other memory solutions that are easier to integrate with, such as:

1. Chroma DB for vector storage
2. SQLite for structured data
3. In-memory data structures for simple use cases

### Option 3: Continue Investigating the MCP Protocol

We could continue investigating the MCP protocol to understand how to properly communicate with the Neo4j memory MCP server. This would involve:

1. Analyzing the server logs more carefully
2. Experimenting with different request formats
3. Consulting the MCP documentation

## Recommended Approach

We recommend pursuing Option 1 (Use Neo4j Directly) as it gives us the most control over the memory integration and avoids the complexities of the MCP protocol.

## Implementation Plan

1. Set up a Neo4j database in the Adamize DevContainer
2. Create a Neo4j client in the Adamize extension
3. Implement functions to:
   - Index projects and files
   - Create relationships between entities
   - Search for entities and relationships
   - Navigate the knowledge graph
4. Integrate the Neo4j client with the Adamize extension
5. Add commands to:
   - Build the knowledge graph
   - Search the knowledge graph
   - Navigate the knowledge graph

## Knowledge Graph Schema

The knowledge graph will use the following schema:

### Nodes

- **Project**: A project directory
  - Properties:
    - name: The name of the project
    - path: The path to the project directory
    - description: A description of the project

- **Directory**: A directory within a project
  - Properties:
    - name: The name of the directory
    - path: The path to the directory
    - project: The name of the project

- **File**: A file within a project or directory
  - Properties:
    - name: The name of the file
    - path: The path to the file
    - extension: The file extension
    - content: The content of the file
    - project: The name of the project

### Relationships

- **CONTAINS**: A project or directory contains a file or directory
- **IMPORTS**: A file imports another file
- **DEFINES**: A file defines a symbol (class, function, variable)
- **USES**: A file uses a symbol defined in another file

## Search Capabilities

The knowledge graph will support the following search capabilities:

- **Text Search**: Search for files containing specific text
- **Symbol Search**: Search for symbols (classes, functions, variables)
- **Dependency Search**: Find files that import or are imported by a specific file
- **Project Search**: Find files within a specific project
- **Extension Search**: Find files with a specific extension

## Navigation Capabilities

The knowledge graph will support the following navigation capabilities:

- **File Navigation**: Navigate to a specific file
- **Symbol Navigation**: Navigate to a specific symbol
- **Dependency Navigation**: Navigate to files that import or are imported by a specific file
- **Project Navigation**: Navigate to files within a specific project

## Conclusion

The memory integration will provide powerful search and navigation capabilities for the Adamize VS Code extension. By using Neo4j directly, we can avoid the complexities of the MCP protocol and have full control over the knowledge graph.
