/**
 * Model Manager JavaScript
 * 
 * This file provides the client-side JavaScript for the Model Manager view.
 * It handles model filtering, sorting, and UI interactions.
 * 
 * @implements REQ-MODEL-004 Add filtering and sorting capabilities to the model manager view
 */

// Store all models
let allModels = [];

// Initialize the view
window.addEventListener('load', () => {
  // Initialize filter panel
  initializeFilterPanel();
  
  // Request initial model list
  vscode.postMessage({
    command: 'refresh'
  });
});

// Handle messages from the extension
window.addEventListener('message', event => {
  const message = event.data;
  
  switch (message.command) {
    case 'updateModels':
      allModels = message.models;
      updateModelList(allModels);
      break;
    case 'showModelDetails':
      showModelDetails(message.model);
      break;
    case 'updateStatus':
      updateStatus(
        message.refreshStatus,
        message.pullStatus,
        message.removeStatus,
        message.statusMessage
      );
      break;
  }
});

// Filter and sort models
function filterAndSortModels(models, criteria, sortOption) {
  // Filter models
  let filteredModels = models;
  
  if (criteria) {
    // Filter by search term
    if (criteria.searchTerm) {
      const searchTermLower = criteria.searchTerm.toLowerCase();
      filteredModels = filteredModels.filter(model => 
        model.name.toLowerCase().includes(searchTermLower) ||
        model.provider.toLowerCase().includes(searchTermLower)
      );
    }
    
    // Filter by provider
    if (criteria.provider) {
      filteredModels = filteredModels.filter(model => 
        model.provider === criteria.provider
      );
    }
    
    // Filter by capability
    if (criteria.capability) {
      filteredModels = filteredModels.filter(model => 
        model.capabilities && model.capabilities.includes(criteria.capability)
      );
    }
    
    // Filter by size
    if (criteria.minSize !== undefined) {
      filteredModels = filteredModels.filter(model => 
        model.size >= criteria.minSize
      );
    }
    
    if (criteria.maxSize !== undefined) {
      filteredModels = filteredModels.filter(model => 
        model.size <= criteria.maxSize
      );
    }
    
    // Filter by local only
    if (criteria.localOnly) {
      filteredModels = filteredModels.filter(model => 
        model.isLocal === true
      );
    }
  }
  
  // Sort models
  if (sortOption) {
    filteredModels.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'size_asc':
          return a.size - b.size;
        case 'size_desc':
          return b.size - a.size;
        case 'provider_asc':
          return a.provider.localeCompare(b.provider);
        case 'provider_desc':
          return b.provider.localeCompare(a.provider);
        default:
          return 0;
      }
    });
  }
  
  return filteredModels;
}

// Initialize filter panel
function initializeFilterPanel() {
  // Get filter elements
  const searchInput = document.getElementById('searchInput');
  const providerFilter = document.getElementById('providerFilter');
  const capabilityFilter = document.getElementById('capabilityFilter');
  const sortOption = document.getElementById('sortOption');
  const localOnlyFilter = document.getElementById('localOnlyFilter');
  const clearFiltersButton = document.getElementById('clearFilters');
  
  if (!searchInput || !providerFilter || !capabilityFilter || !sortOption || !localOnlyFilter || !clearFiltersButton) {
    console.error('Filter elements not found');
    return;
  }
  
  // Add event listeners
  searchInput.addEventListener('input', applyFilters);
  providerFilter.addEventListener('change', applyFilters);
  capabilityFilter.addEventListener('change', applyFilters);
  sortOption.addEventListener('change', applyFilters);
  localOnlyFilter.addEventListener('change', applyFilters);
  clearFiltersButton.addEventListener('click', clearFilters);
  
  // Clear filters
  function clearFilters() {
    searchInput.value = '';
    providerFilter.value = '';
    capabilityFilter.value = '';
    sortOption.value = 'name_asc';
    localOnlyFilter.checked = false;
    
    applyFilters();
  }
  
  // Apply filters
  function applyFilters() {
    const criteria = {
      searchTerm: searchInput.value,
      provider: providerFilter.value,
      capability: capabilityFilter.value,
      localOnly: localOnlyFilter.checked
    };
    
    const sort = sortOption.value;
    
    // Apply filters and update model list
    updateFilteredModelList(criteria, sort);
  }
}

// Update filtered model list
function updateFilteredModelList(criteria, sortOption) {
  // Filter and sort models
  const filteredModels = filterAndSortModels(allModels, criteria, sortOption);
  
  // Update model list
  updateModelList(filteredModels);
  
  // Update filter count
  const filterCount = document.getElementById('filter-count');
  if (filterCount) {
    filterCount.textContent = `Showing ${filteredModels.length} of ${allModels.length} models`;
  }
}

// Update model list
function updateModelList(models) {
  const loadingElement = document.getElementById('loading');
  const emptyElement = document.getElementById('empty');
  const modelListElement = document.getElementById('model-list');
  
  if (!loadingElement || !emptyElement || !modelListElement) {
    console.error('Model list elements not found');
    return;
  }
  
  loadingElement.style.display = 'none';
  
  if (!models || models.length === 0) {
    emptyElement.style.display = 'block';
    modelListElement.innerHTML = '';
    return;
  }
  
  emptyElement.style.display = 'none';
  modelListElement.innerHTML = '';
  
  // Group models by provider
  const modelsByProvider = {};
  models.forEach(model => {
    if (!modelsByProvider[model.provider]) {
      modelsByProvider[model.provider] = [];
    }
    modelsByProvider[model.provider].push(model);
  });
  
  // Create model list
  Object.entries(modelsByProvider).forEach(([provider, providerModels]) => {
    // Create provider section
    const providerSection = document.createElement('div');
    providerSection.className = 'provider-section';
    
    // Create provider header
    const providerHeader = document.createElement('h3');
    providerHeader.textContent = getProviderDisplayName(provider);
    providerSection.appendChild(providerHeader);
    
    // Create provider models
    providerModels.forEach(model => {
      // Create model item
      const modelItem = document.createElement('div');
      modelItem.className = 'model-item';
      modelItem.dataset.id = model.id;
      
      // Create model info
      const modelInfo = document.createElement('div');
      modelInfo.className = 'model-info';
      
      // Create model name
      const modelName = document.createElement('div');
      modelName.className = 'model-name';
      modelName.textContent = model.name;
      modelInfo.appendChild(modelName);
      
      // Create model details
      const modelDetails = document.createElement('div');
      modelDetails.className = 'model-details';
      modelDetails.textContent = formatSize(model.size);
      modelInfo.appendChild(modelDetails);
      
      modelItem.appendChild(modelInfo);
      
      // Create model actions
      const actionsElement = document.createElement('div');
      actionsElement.className = 'model-actions';
      
      if (model.provider === 'ollama') {
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', (event) => {
          event.stopPropagation();
          vscode.postMessage({
            command: 'remove',
            modelName: model.name
          });
        });
        actionsElement.appendChild(removeButton);
      }
      
      modelItem.appendChild(actionsElement);
      
      // Show details on click
      modelItem.addEventListener('click', () => {
        vscode.postMessage({
          command: 'getModelDetails',
          modelId: model.id
        });
      });
      
      providerSection.appendChild(modelItem);
    });
    
    modelListElement.appendChild(providerSection);
  });
}

// Show model details
function showModelDetails(model) {
  const detailsElement = document.getElementById('model-details');
  
  if (!detailsElement) {
    console.error('Model details element not found');
    return;
  }
  
  // Create details HTML
  let detailsHtml = `
    <h3>${model.name}</h3>
    <div class="details-section">
      <div class="details-item">
        <div class="details-label">Provider:</div>
        <div class="details-value">${getProviderDisplayName(model.provider)}</div>
      </div>
      <div class="details-item">
        <div class="details-label">Size:</div>
        <div class="details-value">${formatSize(model.size)}</div>
      </div>
      <div class="details-item">
        <div class="details-label">Version:</div>
        <div class="details-value">${model.version || 'Unknown'}</div>
      </div>
      <div class="details-item">
        <div class="details-label">Capabilities:</div>
        <div class="details-value">${model.capabilities ? model.capabilities.join(', ') : 'Unknown'}</div>
      </div>
  `;
  
  // Add additional details if available
  if (model.details) {
    detailsHtml += `
      <div class="details-item">
        <div class="details-label">Parameters:</div>
        <div class="details-value">${model.details.parameter_size || 'Unknown'}</div>
      </div>
      <div class="details-item">
        <div class="details-label">Context:</div>
        <div class="details-value">${model.details.context_size || 'Unknown'}</div>
      </div>
    `;
    
    if (model.details.description) {
      detailsHtml += `
        <div class="details-item full-width">
          <div class="details-label">Description:</div>
          <div class="details-value">${model.details.description}</div>
        </div>
      `;
    }
  }
  
  detailsHtml += `</div>`;
  
  // Set details HTML
  detailsElement.innerHTML = detailsHtml;
  
  // Show details
  detailsElement.style.display = 'block';
}

// Update status
function updateStatus(refreshStatus, pullStatus, removeStatus, statusMessage) {
  const statusElement = document.getElementById('status');
  
  if (!statusElement) {
    console.error('Status element not found');
    return;
  }
  
  // Set status message
  if (statusMessage) {
    statusElement.textContent = statusMessage;
    statusElement.style.display = 'block';
  } else {
    statusElement.style.display = 'none';
  }
  
  // Set status class
  statusElement.className = 'status';
  
  if (refreshStatus === 'in_progress' || pullStatus === 'in_progress' || removeStatus === 'in_progress') {
    statusElement.classList.add('status-in-progress');
  } else if (refreshStatus === 'error' || pullStatus === 'error' || removeStatus === 'error') {
    statusElement.classList.add('status-error');
  } else if (refreshStatus === 'success' || pullStatus === 'success' || removeStatus === 'success') {
    statusElement.classList.add('status-success');
  }
}

// Format size
function formatSize(size) {
  if (size === undefined || size === null) {
    return 'Unknown';
  }
  
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

// Get provider display name
function getProviderDisplayName(provider) {
  switch (provider) {
    case 'ollama':
      return 'Ollama';
    case 'local':
      return 'Local';
    case 'huggingface':
      return 'Hugging Face';
    default:
      return provider;
  }
}
