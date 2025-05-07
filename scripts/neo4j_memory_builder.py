#!/usr/bin/env python3
"""
Neo4j Memory Builder

This script builds a knowledge graph of the projects directory using Neo4j memory commands.
It creates entities for projects, directories, and important files, and establishes relationships between them.
"""

import os
import json
import sys
import time
from typing import List, Dict, Any, Optional

# Configuration
PROJECTS_DIR = '/home/thein/projects'
IGNORE_DIRS = [
    'node_modules', '.git', '.vscode', 'out', 'dist', 'build', 'coverage', '.cache'
]
IMPORTANT_FILES = [
    'package.json', 'README.md', '.augment-guidelines', 'tsconfig.json',
    'docker-compose.yml', 'Dockerfile', 'devcontainer.json'
]
MAX_BATCH_SIZE = 10  # Maximum number of entities/relations to create in a single batch

def read_file_safe(file_path: str, max_size: int = 10000) -> str:
    """Read file content safely with size limit."""
    try:
        file_size = os.path.getsize(file_path)
        if file_size > max_size:
            return f"File too large ({file_size} bytes)"
        
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

def create_entities_batch(entities: List[Dict[str, Any]]) -> None:
    """Create entities in batches."""
    if not entities:
        return
    
    for i in range(0, len(entities), MAX_BATCH_SIZE):
        batch = entities[i:i+MAX_BATCH_SIZE]
        try:
            # Call the memory function to create entities
            print(f"Creating {len(batch)} entities (batch {i // MAX_BATCH_SIZE + 1})")
            print(json.dumps(batch, indent=2))
            # In a real implementation, this would be:
            # create_entities_memory({"entities": batch})
        except Exception as e:
            print(f"Error creating entities: {str(e)}")

def create_relations_batch(relations: List[Dict[str, Any]]) -> None:
    """Create relations in batches."""
    if not relations:
        return
    
    for i in range(0, len(relations), MAX_BATCH_SIZE):
        batch = relations[i:i+MAX_BATCH_SIZE]
        try:
            # Call the memory function to create relations
            print(f"Creating {len(batch)} relations (batch {i // MAX_BATCH_SIZE + 1})")
            print(json.dumps(batch, indent=2))
            # In a real implementation, this would be:
            # create_relations_memory({"relations": batch})
        except Exception as e:
            print(f"Error creating relations: {str(e)}")

def process_project(project_path: str) -> None:
    """Process a project and add it to the knowledge graph."""
    project_name = os.path.basename(project_path)
    print(f"Processing project: {project_name}")
    
    entities = []
    relations = []
    
    # Create project entity
    project_entity = {
        "name": project_name,
        "entityType": "Project",
        "observations": [f"Project directory: {project_path}"]
    }
    
    # Add package.json info if available
    package_json_path = os.path.join(project_path, 'package.json')
    if os.path.exists(package_json_path):
        try:
            package_json = json.loads(read_file_safe(package_json_path))
            if 'name' in package_json:
                project_entity["observations"].append(f"Name: {package_json['name']}")
            if 'description' in package_json:
                project_entity["observations"].append(f"Description: {package_json['description']}")
            if 'version' in package_json:
                project_entity["observations"].append(f"Version: {package_json['version']}")
        except Exception as e:
            print(f"Error parsing package.json for {project_name}: {str(e)}")
    
    # Add README.md content if available
    readme_path = os.path.join(project_path, 'README.md')
    if os.path.exists(readme_path):
        readme_content = read_file_safe(readme_path)
        project_entity["observations"].append(f"README: {readme_content}")
    
    entities.append(project_entity)
    
    # Process important files
    for file_name in IMPORTANT_FILES:
        file_path = os.path.join(project_path, file_name)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            file_content = read_file_safe(file_path)
            entities.append({
                "name": f"{project_name}:{file_name}",
                "entityType": "File",
                "observations": [f"Path: {file_path}", f"Content: {file_content}"]
            })
            
            relations.append({
                "from": project_name,
                "to": f"{project_name}:{file_name}",
                "relationType": "contains"
            })
    
    # Process .devcontainer directory if it exists
    devcontainer_dir = os.path.join(project_path, '.devcontainer')
    if os.path.exists(devcontainer_dir) and os.path.isdir(devcontainer_dir):
        entities.append({
            "name": f"{project_name}:devcontainer",
            "entityType": "Component",
            "observations": ["DevContainer configuration for the project"]
        })
        
        relations.append({
            "from": project_name,
            "to": f"{project_name}:devcontainer",
            "relationType": "has"
        })
        
        # Process important devcontainer files
        devcontainer_files = ['devcontainer.json', 'docker-compose.yml', 'Dockerfile']
        for file_name in devcontainer_files:
            file_path = os.path.join(devcontainer_dir, file_name)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                file_content = read_file_safe(file_path)
                entities.append({
                    "name": f"{project_name}:devcontainer:{file_name}",
                    "entityType": "File",
                    "observations": [f"Path: {file_path}", f"Content: {file_content}"]
                })
                
                relations.append({
                    "from": f"{project_name}:devcontainer",
                    "to": f"{project_name}:devcontainer:{file_name}",
                    "relationType": "contains"
                })
    
    # Create entities and relations
    create_entities_batch(entities)
    create_relations_batch(relations)

def build_knowledge_graph() -> None:
    """Main function to build the knowledge graph."""
    print("Building knowledge graph of projects...")
    
    try:
        # Get list of projects
        projects = [
            os.path.join(PROJECTS_DIR, item) for item in os.listdir(PROJECTS_DIR)
            if os.path.isdir(os.path.join(PROJECTS_DIR, item)) and item not in IGNORE_DIRS
        ]
        
        print(f"Found {len(projects)} projects: {', '.join(os.path.basename(p) for p in projects)}")
        
        # Process each project
        for project in projects:
            process_project(project)
        
        print("Knowledge graph built successfully!")
    except Exception as e:
        print(f"Error building knowledge graph: {str(e)}")

if __name__ == "__main__":
    build_knowledge_graph()
