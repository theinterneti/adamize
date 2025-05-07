#!/usr/bin/env python3
"""
Build Memory Graph

This script builds a knowledge graph of the projects directory using the memory API.
It creates entities for projects, files, and components, and establishes relationships between them.
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
KEY_FILES = [
    'package.json', 'README.md', '.augment-guidelines', 'tsconfig.json',
    'docker-compose.yml', 'Dockerfile', 'devcontainer.json'
]
MAX_CONTENT_SIZE = 5000  # Maximum size of file content to include
MAX_BATCH_SIZE = 5  # Maximum number of entities/relations to create in a single batch

def read_file_safe(file_path: str, max_size: int = MAX_CONTENT_SIZE) -> str:
    """Read file content safely with size limit."""
    try:
        file_size = os.path.getsize(file_path)
        if file_size > max_size:
            return f"File too large ({file_size} bytes)"
        
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
            if len(content) > max_size:
                return content[:max_size] + "... (truncated)"
            return content
    except Exception as e:
        return f"Error reading file: {str(e)}"

def process_project(project_path: str) -> None:
    """Process a project and add it to the knowledge graph."""
    project_name = os.path.basename(project_path)
    print(f"Processing project: {project_name}")
    
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
            package_content = read_file_safe(package_json_path)
            package_json = json.loads(package_content)
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
    
    # Create the project entity
    create_entities_memory({"entities": [project_entity]})
    print(f"Created project entity: {project_name}")
    
    # Process key files
    file_entities = []
    file_relations = []
    
    for file_name in KEY_FILES:
        file_path = os.path.join(project_path, file_name)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            entity_name = f"{project_name}-{file_name}"
            file_content = read_file_safe(file_path)
            
            file_entities.append({
                "name": entity_name,
                "entityType": "File",
                "observations": [f"Path: {file_path}", f"Content: {file_content}"]
            })
            
            file_relations.append({
                "from": project_name,
                "to": entity_name,
                "relationType": "contains"
            })
    
    # Create file entities and relations in batches
    if file_entities:
        for i in range(0, len(file_entities), MAX_BATCH_SIZE):
            batch = file_entities[i:i+MAX_BATCH_SIZE]
            create_entities_memory({"entities": batch})
            print(f"Created {len(batch)} file entities (batch {i // MAX_BATCH_SIZE + 1})")
    
    if file_relations:
        for i in range(0, len(file_relations), MAX_BATCH_SIZE):
            batch = file_relations[i:i+MAX_BATCH_SIZE]
            create_relations_memory({"relations": batch})
            print(f"Created {len(batch)} file relations (batch {i // MAX_BATCH_SIZE + 1})")
    
    # Process .devcontainer directory if it exists
    devcontainer_dir = os.path.join(project_path, '.devcontainer')
    if os.path.exists(devcontainer_dir) and os.path.isdir(devcontainer_dir):
        devcontainer_entity = {
            "name": f"{project_name}-devcontainer",
            "entityType": "Component",
            "observations": ["DevContainer configuration for the project"]
        }
        
        create_entities_memory({"entities": [devcontainer_entity]})
        create_relations_memory({"relations": [{
            "from": project_name,
            "to": f"{project_name}-devcontainer",
            "relationType": "has"
        }]})
        
        print(f"Created devcontainer entity for {project_name}")
        
        # Process important devcontainer files
        devcontainer_files = []
        devcontainer_relations = []
        
        for file_name in ['devcontainer.json', 'docker-compose.yml', 'Dockerfile']:
            file_path = os.path.join(devcontainer_dir, file_name)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                entity_name = f"{project_name}-devcontainer-{file_name}"
                file_content = read_file_safe(file_path)
                
                devcontainer_files.append({
                    "name": entity_name,
                    "entityType": "ConfigFile",
                    "observations": [f"Path: {file_path}", f"Content: {file_content}"]
                })
                
                devcontainer_relations.append({
                    "from": f"{project_name}-devcontainer",
                    "to": entity_name,
                    "relationType": "contains"
                })
        
        if devcontainer_files:
            create_entities_memory({"entities": devcontainer_files})
            create_relations_memory({"relations": devcontainer_relations})
            print(f"Created {len(devcontainer_files)} devcontainer file entities")

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
