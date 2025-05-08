/**
 * Memory Graph Webview Script
 *
 * Handles the client-side functionality of the Memory Graph visualization.
 * Enhanced with additional Cytoscape extensions and features.
 */

(function() {
  // Get VS Code API
  const vscode = acquireVsCodeApi();

  // DOM elements
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const typeFilter = document.getElementById('type-filter');
  const refreshButton = document.getElementById('refresh-button');
  const graphContainer = document.getElementById('graph-container');
  const detailsPanel = document.getElementById('details-panel');
  const detailsTitle = document.getElementById('details-title');
  const detailsContent = document.getElementById('details-content');
  const closeDetails = document.getElementById('close-details');
  const layoutSelect = document.getElementById('layout-select');
  const zoomInButton = document.getElementById('zoom-in');
  const zoomOutButton = document.getElementById('zoom-out');
  const fitButton = document.getElementById('fit-graph');
  const legendToggle = document.getElementById('toggle-legend');
  const legendPanel = document.getElementById('legend-panel');

  // Cytoscape instance
  let cy;

  // Graph data
  let graphData = {
    entities: [],
    relations: []
  };

  // Entity type styling
  const typeColors = {};
  const typeShapes = {};
  const typeIcons = {};

  // Color palette for entity types
  const colorPalette = [
    '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
    '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
  ];

  // Shape options for entity types
  const shapeOptions = [
    'ellipse', 'triangle', 'rectangle', 'round-rectangle',
    'bottom-round-rectangle', 'cut-rectangle', 'barrel',
    'rhomboid', 'diamond', 'pentagon', 'hexagon', 'concave-hexagon',
    'heptagon', 'octagon', 'star', 'tag', 'vee'
  ];

  // Icon mapping for common entity types
  const defaultIcons = {
    'Person': '👤',
    'Organization': '🏢',
    'Location': '📍',
    'Event': '📅',
    'Document': '📄',
    'Concept': '💡',
    'Technology': '💻',
    'Project': '📁',
    'Task': '✅',
    'Issue': '❗',
    'File': '📂',
    'Code': '📝',
    'Function': '⚙️',
    'Class': '🧩',
    'Component': '🔌',
    'Test': '🧪'
  };

  // Initialize
  function initialize() {
    // Register Cytoscape extensions
    try {
      // Register Cola layout extension
      if (typeof cytoscape('layout', 'cola') !== 'function') {
        cytoscape.use(cytoscapeCola);
      }

      // Register Dagre layout extension
      if (typeof cytoscape('layout', 'dagre') !== 'function') {
        cytoscape.use(cytoscapeDagre);
      }

      // Register Navigator extension
      if (typeof cytoscape('core', 'navigator') !== 'function') {
        cytoscape.use(cytoscapeNavigator);
      }

      // Register Context Menus extension
      if (typeof cytoscape('core', 'contextMenus') !== 'function') {
        cytoscape.use(cytoscapeContextMenus);
      }

      // Register Popper extension
      if (typeof cytoscape('collection', 'popper') !== 'function') {
        cytoscape.use(cytoscapePopper);
      }
    } catch (e) {
      console.error('Error registering Cytoscape extensions:', e);
    }

    // Initialize Cytoscape
    cy = cytoscape({
      container: graphContainer,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'background-color': 'data(color)',
            'shape': 'data(shape)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            'font-size': '12px',
            'width': '60px',
            'height': '60px',
            'border-width': 2,
            'border-color': '#555',
            'text-outline-width': 2,
            'text-outline-color': '#fff',
            'text-outline-opacity': 0.5,
            'text-margin-y': 5,
            'content': 'data(label)',
            'text-background-opacity': 0.7,
            'text-background-color': '#fff',
            'text-background-padding': 3,
            'text-background-shape': 'round-rectangle',
            'overlay-padding': '6px',
            'z-index': 10
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#ffa500',
            'border-opacity': 0.8,
            'background-color': 'data(color)',
            'text-outline-color': '#000',
            'z-index': 20
          }
        },
        {
          selector: 'node.hover',
          style: {
            'border-width': 3,
            'border-color': '#0074d9',
            'border-opacity': 0.8
          }
        },
        {
          selector: 'node[icon]',
          style: {
            'background-image': 'data(icon)',
            'background-fit': 'contain',
            'background-clip': 'none'
          }
        },
        {
          selector: 'edge',
          style: {
            'label': 'data(label)',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'line-color': '#999',
            'target-arrow-color': '#999',
            'font-size': '10px',
            'text-rotation': 'autorotate',
            'text-background-opacity': 0.7,
            'text-background-color': '#fff',
            'text-background-padding': 2,
            'text-background-shape': 'round-rectangle',
            'width': 2,
            'arrow-scale': 1.2,
            'opacity': 0.8,
            'overlay-padding': '6px'
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#ffa500',
            'target-arrow-color': '#ffa500',
            'width': 3,
            'opacity': 1
          }
        },
        {
          selector: 'edge.hover',
          style: {
            'line-color': '#0074d9',
            'target-arrow-color': '#0074d9',
            'width': 3,
            'opacity': 1
          }
        }
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      },
      wheelSensitivity: 0.2,
      minZoom: 0.1,
      maxZoom: 3,
      boxSelectionEnabled: true,
      selectionType: 'single'
    });

    // Define available layouts
    const layouts = {
      'cose': {
        name: 'cose',
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      },
      'circle': {
        name: 'circle',
        fit: true,
        padding: 30,
        radius: 100,
        startAngle: 3/2 * Math.PI,
        sweep: 2 * Math.PI,
        clockwise: true,
        sort: function(a, b) {
          return a.data('label').localeCompare(b.data('label'));
        }
      },
      'grid': {
        name: 'grid',
        fit: true,
        padding: 30,
        rows: undefined,
        columns: undefined,
        avoidOverlap: true
      },
      'concentric': {
        name: 'concentric',
        fit: true,
        padding: 30,
        startAngle: 3/2 * Math.PI,
        sweep: 2 * Math.PI,
        clockwise: true,
        equidistant: false,
        minNodeSpacing: 10,
        concentric: function(node) {
          // Return a numeric value for concentric layout starting from the center
          return node.degree();
        },
        levelWidth: function(nodes) {
          // Return how many nodes should be in each level
          return nodes.length;
        }
      },
      'breadthfirst': {
        name: 'breadthfirst',
        fit: true,
        padding: 30,
        directed: true,
        circle: false,
        grid: false,
        spacingFactor: 1.5
      },
      'cola': {
        name: 'cola',
        fit: true,
        padding: 30,
        nodeSpacing: 10,
        maxSimulationTime: 1500,
        edgeLength: 100,
        animate: true,
        randomize: false,
        avoidOverlap: true,
        handleDisconnected: true,
        infinite: false
      },
      'dagre': {
        name: 'dagre',
        fit: true,
        padding: 30,
        nodeSep: 50,
        rankSep: 100,
        rankDir: 'TB',
        ranker: 'network-simplex',
        animate: true
      }
    };

    // Add event listeners for UI controls
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', handleSearchKeyDown);
    typeFilter.addEventListener('change', handleTypeFilter);
    refreshButton.addEventListener('click', handleRefresh);
    closeDetails.addEventListener('click', handleCloseDetails);

    if (layoutSelect) {
      layoutSelect.addEventListener('change', handleLayoutChange);
    }

    if (zoomInButton) {
      zoomInButton.addEventListener('click', () => {
        cy.zoom(cy.zoom() * 1.2);
        cy.center();
      });
    }

    if (zoomOutButton) {
      zoomOutButton.addEventListener('click', () => {
        cy.zoom(cy.zoom() / 1.2);
        cy.center();
      });
    }

    if (fitButton) {
      fitButton.addEventListener('click', () => {
        cy.fit();
      });
    }

    if (legendToggle) {
      legendToggle.addEventListener('click', () => {
        if (legendPanel) {
          legendPanel.classList.toggle('show');
        }
      });
    }

    // Add Cytoscape event listeners
    cy.on('tap', 'node', handleNodeClick);

    // Add hover effects
    cy.on('mouseover', 'node', function(e) {
      e.target.addClass('hover');
    });

    cy.on('mouseout', 'node', function(e) {
      e.target.removeClass('hover');
    });

    cy.on('mouseover', 'edge', function(e) {
      e.target.addClass('hover');
    });

    cy.on('mouseout', 'edge', function(e) {
      e.target.removeClass('hover');
    });

    // Enable node dragging
    cy.on('grab', 'node', function(e) {
      e.target.lock();
    });

    cy.on('free', 'node', function(e) {
      e.target.unlock();
    });

    // Double-click to zoom in on a node
    cy.on('dbltap', 'node', function(e) {
      cy.zoom(2);
      cy.center(e.target);
    });

    // Restore state
    const state = vscode.getState();
    if (state && state.graphData) {
      graphData = state.graphData;
      updateGraph(graphData);
    }
  }

  // Handle search
  function handleSearch() {
    const query = searchInput.value.trim();
    if (query) {
      vscode.postMessage({
        command: 'searchEntities',
        query
      });
    }
  }

  // Handle search key down
  function handleSearchKeyDown(event) {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }

  // Handle type filter
  function handleTypeFilter() {
    const entityType = typeFilter.value;
    if (entityType) {
      vscode.postMessage({
        command: 'filterByType',
        entityType
      });
    } else {
      // If no filter is selected, show all entities
      updateGraph(graphData);
    }
  }

  // Handle refresh
  function handleRefresh() {
    vscode.postMessage({
      command: 'refreshGraph'
    });
  }

  // Handle node click
  function handleNodeClick(event) {
    const node = event.target;
    const entityName = node.id();

    vscode.postMessage({
      command: 'showEntityDetails',
      entityName
    });
  }

  // Handle close details
  function handleCloseDetails() {
    detailsPanel.classList.remove('show');
  }

  // Handle layout change
  function handleLayoutChange() {
    if (!layoutSelect) return;

    const layoutName = layoutSelect.value;
    if (layouts[layoutName]) {
      cy.layout(layouts[layoutName]).run();
    }
  }

  // Update graph with new data
  function updateGraph(data) {
    // Save data
    graphData = data;
    vscode.setState({ graphData });

    // Clear graph
    cy.elements().remove();

    // Update type filter options
    updateTypeFilterOptions(data.entities);

    // Update legend
    updateLegend(data.entities);

    // Add nodes
    const nodes = data.entities.map(entity => {
      // Assign color based on entity type
      if (!typeColors[entity.entityType]) {
        typeColors[entity.entityType] = colorPalette[Object.keys(typeColors).length % colorPalette.length];
      }

      // Assign shape based on entity type
      if (!typeShapes[entity.entityType]) {
        typeShapes[entity.entityType] = shapeOptions[Object.keys(typeShapes).length % shapeOptions.length];
      }

      // Assign icon based on entity type if it matches a default icon
      let icon = '';
      if (defaultIcons[entity.entityType]) {
        icon = defaultIcons[entity.entityType];
        typeIcons[entity.entityType] = icon;
      }

      return {
        data: {
          id: entity.name,
          label: entity.name,
          type: entity.entityType,
          color: typeColors[entity.entityType],
          shape: typeShapes[entity.entityType],
          icon: icon,
          observations: entity.observations,
          degree: 0 // Will be calculated later
        }
      };
    });

    // Add edges with different styles based on relation type
    const edges = data.relations.map(relation => {
      return {
        data: {
          id: `${relation.from}-${relation.to}`,
          source: relation.from,
          target: relation.to,
          label: relation.relationType
        }
      };
    });

    // Add elements to graph
    cy.add([...nodes, ...edges]);

    // Calculate node degrees for sizing
    cy.nodes().forEach(node => {
      const degree = node.degree();
      node.data('degree', degree);

      // Adjust node size based on degree (number of connections)
      const size = Math.max(40, Math.min(80, 40 + (degree * 5)));
      node.style('width', size);
      node.style('height', size);
    });

    // Run layout based on selected layout
    let layoutName = 'cose';
    if (layoutSelect && layoutSelect.value) {
      layoutName = layoutSelect.value;
    }

    if (layouts[layoutName]) {
      cy.layout(layouts[layoutName]).run();
    } else {
      cy.layout(layouts['cose']).run();
    }
  }

  // Update legend with entity types and colors
  function updateLegend(entities) {
    if (!legendPanel) return;

    // Get unique entity types
    const entityTypes = [...new Set(entities.map(entity => entity.entityType))];

    // Create legend content
    let legendContent = '<div class="legend-title">Entity Types</div>';
    entityTypes.forEach(type => {
      const color = typeColors[type] || '#ccc';
      const shape = typeShapes[type] || 'ellipse';
      const icon = typeIcons[type] || '';

      legendContent += `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${color};">${icon}</div>
          <div class="legend-label">${type}</div>
        </div>
      `;
    });

    // Add relation types if we have any
    if (graphData.relations && graphData.relations.length > 0) {
      const relationTypes = [...new Set(graphData.relations.map(relation => relation.relationType))];

      if (relationTypes.length > 0) {
        legendContent += '<div class="legend-title">Relation Types</div>';
        relationTypes.forEach(type => {
          legendContent += `
            <div class="legend-item">
              <div class="legend-line"></div>
              <div class="legend-label">${type}</div>
            </div>
          `;
        });
      }
    }

    legendPanel.innerHTML = legendContent;
  }

  // Update type filter options
  function updateTypeFilterOptions(entities) {
    // Clear existing options except the first one
    while (typeFilter.options.length > 1) {
      typeFilter.remove(1);
    }

    // Get unique entity types
    const entityTypes = [...new Set(entities.map(entity => entity.entityType))];

    // Add options
    entityTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      typeFilter.appendChild(option);
    });
  }

  // Show entity details
  function showEntityDetails(entity) {
    detailsTitle.textContent = entity.name;

    // Get related entities
    const relatedEntities = [];
    if (graphData && graphData.relations) {
      // Find relations where this entity is the source
      const outgoingRelations = graphData.relations.filter(rel => rel.from === entity.name);
      outgoingRelations.forEach(rel => {
        const targetEntity = graphData.entities.find(e => e.name === rel.to);
        if (targetEntity) {
          relatedEntities.push({
            name: targetEntity.name,
            type: targetEntity.entityType,
            relation: rel.relationType,
            direction: 'outgoing'
          });
        }
      });

      // Find relations where this entity is the target
      const incomingRelations = graphData.relations.filter(rel => rel.to === entity.name);
      incomingRelations.forEach(rel => {
        const sourceEntity = graphData.entities.find(e => e.name === rel.from);
        if (sourceEntity) {
          relatedEntities.push({
            name: sourceEntity.name,
            type: sourceEntity.entityType,
            relation: rel.relationType,
            direction: 'incoming'
          });
        }
      });
    }

    // Get entity color and icon
    const color = typeColors[entity.entityType] || '#ccc';
    const icon = typeIcons[entity.entityType] || '';

    let content = `
      <div class="detail-header">
        <div class="detail-icon" style="background-color: ${color};">${icon}</div>
        <div class="detail-info">
          <div class="detail-item">
            <div class="detail-label">Type:</div>
            <div class="detail-value">${entity.entityType}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Connections:</div>
            <div class="detail-value">${relatedEntities.length}</div>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Observations</div>
        <div class="detail-value">
          ${entity.observations.length > 0 ?
            `<ul>
              ${entity.observations.map(obs => `<li>${obs}</li>`).join('')}
            </ul>` :
            '<p>No observations</p>'
          }
        </div>
      </div>

      ${relatedEntities.length > 0 ? `
        <div class="detail-section">
          <div class="detail-section-title">Related Entities</div>
          <div class="detail-value">
            <ul class="related-entities-list">
              ${relatedEntities.map(rel => `
                <li class="related-entity">
                  <span class="relation-direction ${rel.direction}">
                    ${rel.direction === 'outgoing' ? '→' : '←'}
                  </span>
                  <span class="relation-type">${rel.relation}</span>
                  <span class="entity-name" data-entity="${rel.name}">${rel.name}</span>
                  <span class="entity-type">(${rel.type})</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      ` : ''}
    `;

    detailsContent.innerHTML = content;

    // Add click handlers for related entities
    const entityLinks = detailsContent.querySelectorAll('.entity-name');
    entityLinks.forEach(link => {
      link.addEventListener('click', () => {
        const entityName = link.getAttribute('data-entity');
        if (entityName) {
          vscode.postMessage({
            command: 'showEntityDetails',
            entityName
          });
        }
      });
    });

    detailsPanel.classList.add('show');
  }

  // Handle messages from extension
  window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
      case 'updateGraph':
        updateGraph(message.data);
        break;

      case 'showEntityDetails':
        showEntityDetails(message.entity);
        break;
    }
  });

  // Initialize
  initialize();
})();
