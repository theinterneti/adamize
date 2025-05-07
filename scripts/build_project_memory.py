#!/usr/bin/env python3
"""
Build Project Memory

This script builds a knowledge graph of the projects folder using the Neo4j memory MCP server.
It indexes files, directories, and their relationships to create a vector RAG system.
"""

import os
import sys
import json
import subprocess
import argparse
from typing import List, Dict, Any, Optional, Tuple
import time

# Constants
PROJECTS_DIR = "/home/thein/projects"
MEMORY_CONTAINER_NAME = "mcp/memory"
MAX_OBSERVATION_LENGTH = 1000  # Maximum length of an observation in characters
EXCLUDED_DIRS = [".git", "node_modules", ".vscode-test", "out", "dist", "__pycache__"]
EXCLUDED_FILES = [".DS_Store", "*.pyc", "*.pyo", "*.pyd", "*.so", "*.dll", "*.class"]
INCLUDED_EXTENSIONS = [
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".c", ".cpp", ".h", ".hpp",
    ".cs", ".go", ".rb", ".php", ".rs", ".swift", ".kt", ".md", ".json", ".yaml",
    ".yml", ".xml", ".html", ".css", ".scss", ".sass", ".sh", ".bash", ".txt"
]

class MCPClient:
    """Client for interacting with MCP servers."""

    def __init__(self, container_id: str):
        """Initialize the MCP client.

        Args:
            container_id: The ID or name of the MCP container
        """
        self.container_id = container_id
        self.request_id = 0

    def call_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool on the MCP server.

        Args:
            tool_name: The name of the tool to call
            params: The parameters to pass to the tool

        Returns:
            The result of the tool call
        """
        # In JSON-RPC 2.0, the method is the tool name directly
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": tool_name,
            "params": params
        }
        self.request_id += 1

        # Convert request to JSON
        request_json = json.dumps(request)

        # Call the tool using docker exec
        cmd = [
            "docker", "exec", "-i", self.container_id,
            "sh", "-c", f"echo '{request_json}' | node dist/index.js"
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )

            # Parse the response
            response_lines = result.stdout.strip().split("\n")
            for line in response_lines:
                if line.startswith("{"):
                    try:
                        response = json.loads(line)
                        if "result" in response:
                            return response["result"]
                    except json.JSONDecodeError:
                        continue

            raise Exception(f"Failed to parse response: {result.stdout}")
        except subprocess.CalledProcessError as e:
            print(f"Error calling tool {tool_name}: {e}")
            print(f"Stdout: {e.stdout}")
            print(f"Stderr: {e.stderr}")
            raise

def get_memory_container_id() -> str:
    """Get the ID of the memory container.

    Returns:
        The ID of the memory container
    """
    cmd = ["docker", "ps", "--filter", f"ancestor={MEMORY_CONTAINER_NAME}", "--format", "{{.ID}}"]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    container_id = result.stdout.strip()

    if not container_id:
        raise Exception(f"Memory container {MEMORY_CONTAINER_NAME} not found")

    return container_id

def should_include_file(file_path: str) -> bool:
    """Check if a file should be included in the knowledge graph.

    Args:
        file_path: The path to the file

    Returns:
        True if the file should be included, False otherwise
    """
    # Check if the file is in an excluded directory
    for excluded_dir in EXCLUDED_DIRS:
        if f"/{excluded_dir}/" in file_path or file_path.endswith(f"/{excluded_dir}"):
            return False

    # Check if the file is excluded
    file_name = os.path.basename(file_path)
    for excluded_file in EXCLUDED_FILES:
        if excluded_file.startswith("*"):
            if file_name.endswith(excluded_file[1:]):
                return False
        elif file_name == excluded_file:
            return False

    # Check if the file has an included extension
    _, ext = os.path.splitext(file_path)
    if ext.lower() not in INCLUDED_EXTENSIONS:
        return False

    return True

def get_file_content(file_path: str, max_length: int = MAX_OBSERVATION_LENGTH) -> str:
    """Get the content of a file.

    Args:
        file_path: The path to the file
        max_length: The maximum length of the content

    Returns:
        The content of the file
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read(max_length)
            if len(content) == max_length:
                content += "... (truncated)"
            return content
    except Exception as e:
        return f"Error reading file: {e}"

def index_project(project_dir: str, client: MCPClient) -> None:
    """Index a project directory.

    Args:
        project_dir: The path to the project directory
        client: The MCP client
    """
    print(f"Indexing project: {project_dir}")

    # Create an entity for the project
    project_name = os.path.basename(project_dir)
    project_description = f"Project directory: {project_name}"

    # Create the project entity
    client.call_tool("create_entities", {
        "entities": [
            {
                "name": project_name,
                "entityType": "Project",
                "observations": [project_description]
            }
        ]
    })

    # Index the project files
    index_directory(project_dir, project_name, client)

    print(f"Finished indexing project: {project_name}")

def index_directory(dir_path: str, parent_entity: str, client: MCPClient) -> None:
    """Index a directory and its contents.

    Args:
        dir_path: The path to the directory
        parent_entity: The name of the parent entity
        client: The MCP client
    """
    # Skip excluded directories
    dir_name = os.path.basename(dir_path)
    if dir_name in EXCLUDED_DIRS:
        return

    # Create entities for files and directories
    file_entities = []
    dir_entities = []
    relations = []

    # Process directories first
    for item in os.listdir(dir_path):
        item_path = os.path.join(dir_path, item)

        if os.path.isdir(item_path):
            # Skip excluded directories
            if item in EXCLUDED_DIRS:
                continue

            # Create an entity for the directory
            dir_entity_name = f"{parent_entity}/{item}"
            dir_entities.append({
                "name": dir_entity_name,
                "entityType": "Directory",
                "observations": [f"Directory in {parent_entity}: {item}"]
            })

            # Create a relation from parent to directory
            relations.append({
                "from": parent_entity,
                "to": dir_entity_name,
                "relationType": "CONTAINS"
            })

    # Process files
    for item in os.listdir(dir_path):
        item_path = os.path.join(dir_path, item)

        if os.path.isfile(item_path) and should_include_file(item_path):
            # Create an entity for the file
            file_entity_name = f"{parent_entity}/{item}"
            file_content = get_file_content(item_path)

            file_entities.append({
                "name": file_entity_name,
                "entityType": "File",
                "observations": [
                    f"File in {parent_entity}: {item}",
                    file_content
                ]
            })

            # Create a relation from parent to file
            relations.append({
                "from": parent_entity,
                "to": file_entity_name,
                "relationType": "CONTAINS"
            })

    # Create directory entities
    if dir_entities:
        client.call_tool("create_entities", {"entities": dir_entities})

    # Create file entities
    if file_entities:
        client.call_tool("create_entities", {"entities": file_entities})

    # Create relations
    if relations:
        client.call_tool("create_relations", {"relations": relations})

    # Recursively index subdirectories
    for item in os.listdir(dir_path):
        item_path = os.path.join(dir_path, item)

        if os.path.isdir(item_path) and item not in EXCLUDED_DIRS:
            dir_entity_name = f"{parent_entity}/{item}"
            index_directory(item_path, dir_entity_name, client)

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Build a knowledge graph of the projects folder")
    parser.add_argument("--project", help="Specific project to index (default: all projects)")
    parser.add_argument("--reset", action="store_true", help="Reset the knowledge graph before indexing")
    args = parser.parse_args()

    try:
        # Get the memory container ID
        container_id = get_memory_container_id()
        print(f"Found memory container: {container_id}")

        # Create an MCP client
        client = MCPClient(container_id)

        # Reset the knowledge graph if requested
        if args.reset:
            print("Resetting knowledge graph...")
            graph = client.call_tool("read_graph", {})

            # Delete all entities
            if "entities" in graph and graph["entities"]:
                entity_names = [entity["name"] for entity in graph["entities"]]
                client.call_tool("delete_entities", {"entityNames": entity_names})

            print("Knowledge graph reset complete")

        # Index projects
        if args.project:
            # Index a specific project
            project_path = os.path.join(PROJECTS_DIR, args.project)
            if not os.path.isdir(project_path):
                print(f"Project not found: {args.project}")
                return 1

            index_project(project_path, client)
        else:
            # Index all projects
            for item in os.listdir(PROJECTS_DIR):
                item_path = os.path.join(PROJECTS_DIR, item)
                if os.path.isdir(item_path) and not item.startswith("."):
                    index_project(item_path, client)

        print("Indexing complete")
        return 0

    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
