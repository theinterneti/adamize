#!/usr/bin/env python3
"""
Query Project Memory

This script queries the knowledge graph built by build_project_memory.py.
It allows searching for entities, relations, and observations in the graph.
"""

import os
import sys
import json
import subprocess
import argparse
from typing import List, Dict, Any, Optional, Tuple

# Import the MCPClient from build_project_memory.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from build_project_memory import MCPClient, get_memory_container_id

def search_knowledge_graph(query: str, client: MCPClient) -> Dict[str, Any]:
    """Search the knowledge graph for entities matching the query.
    
    Args:
        query: The search query
        client: The MCP client
        
    Returns:
        The search results
    """
    return client.call_tool("search_nodes", {"query": query})

def get_entity_details(entity_names: List[str], client: MCPClient) -> Dict[str, Any]:
    """Get details for specific entities.
    
    Args:
        entity_names: The names of the entities to retrieve
        client: The MCP client
        
    Returns:
        The entity details
    """
    return client.call_tool("open_nodes", {"names": entity_names})

def print_entity(entity: Dict[str, Any], verbose: bool = False) -> None:
    """Print an entity in a readable format.
    
    Args:
        entity: The entity to print
        verbose: Whether to print all observations
    """
    print(f"Entity: {entity['name']}")
    print(f"Type: {entity['entityType']}")
    
    if "observations" in entity and entity["observations"]:
        print("Observations:")
        for i, obs in enumerate(entity["observations"]):
            if verbose or i < 2:
                print(f"  - {obs[:100]}{'...' if len(obs) > 100 else ''}")
            elif i == 2:
                print(f"  - ... ({len(entity['observations']) - 2} more observations)")
                break
    
    if "relations" in entity and entity["relations"]:
        print("Relations:")
        for rel in entity["relations"]:
            print(f"  - {rel['from']} {rel['relationType']} {rel['to']}")
    
    print()

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Query the project knowledge graph")
    parser.add_argument("--search", help="Search for entities matching the query")
    parser.add_argument("--entity", help="Get details for a specific entity")
    parser.add_argument("--verbose", action="store_true", help="Show all observations")
    parser.add_argument("--list-projects", action="store_true", help="List all projects in the knowledge graph")
    args = parser.parse_args()
    
    try:
        # Get the memory container ID
        container_id = get_memory_container_id()
        
        # Create an MCP client
        client = MCPClient(container_id)
        
        if args.list_projects:
            # List all projects
            results = client.call_tool("search_nodes", {"query": "entityType:Project"})
            
            if "entities" in results and results["entities"]:
                print("Projects in the knowledge graph:")
                for entity in results["entities"]:
                    print(f"- {entity['name']}")
            else:
                print("No projects found in the knowledge graph")
        
        elif args.search:
            # Search for entities
            results = search_knowledge_graph(args.search, client)
            
            if "entities" in results and results["entities"]:
                print(f"Found {len(results['entities'])} entities matching '{args.search}':")
                for entity in results["entities"]:
                    print_entity(entity, args.verbose)
            else:
                print(f"No entities found matching '{args.search}'")
        
        elif args.entity:
            # Get details for a specific entity
            results = get_entity_details([args.entity], client)
            
            if "entities" in results and results["entities"]:
                print(f"Details for entity '{args.entity}':")
                print_entity(results["entities"][0], args.verbose)
            else:
                print(f"Entity not found: {args.entity}")
        
        else:
            # Show the entire knowledge graph
            graph = client.call_tool("read_graph", {})
            
            if "entities" in graph and graph["entities"]:
                print(f"Knowledge graph contains {len(graph['entities'])} entities:")
                
                # Group entities by type
                entities_by_type = {}
                for entity in graph["entities"]:
                    entity_type = entity["entityType"]
                    if entity_type not in entities_by_type:
                        entities_by_type[entity_type] = []
                    entities_by_type[entity_type].append(entity)
                
                # Print summary by type
                for entity_type, entities in entities_by_type.items():
                    print(f"- {entity_type}: {len(entities)} entities")
                
                # Ask if user wants to see details
                if input("\nShow entity details? (y/n): ").lower() == "y":
                    for entity in graph["entities"]:
                        print_entity(entity, args.verbose)
            else:
                print("Knowledge graph is empty")
        
        return 0
    
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
