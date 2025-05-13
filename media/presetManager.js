/**
 * Preset Manager JavaScript
 * 
 * This file provides the client-side JavaScript for the Preset Manager view.
 * It handles preset creation, editing, deletion, and UI interactions.
 * 
 * @implements REQ-MODEL-040 Create a ModelConfigurationPreset interface with fields for model name, parameters, and metadata
 */

// Store all presets and models
let allPresets = [];
let allModels = [];

// Initialize the view
window.addEventListener('load', () => {
  // Request initial preset list
  vscode.postMessage({
    command: 'refresh'
  });
  
  // Request available models
  vscode.postMessage({
    command: 'getModels'
  });
  
  // Add event listeners
  document.getElementById('refreshButton').addEventListener('click', () => {
    vscode.postMessage({
      command: 'refresh'
    });
  });
  
  document.getElementById('createButton').addEventListener('click', () => {
    showPresetForm();
  });
  
  document.getElementById('importButton').addEventListener('click', () => {
    vscode.postMessage({
      command: 'importPresets'
    });
  });
  
  document.getElementById('exportButton').addEventListener('click', () => {
    vscode.postMessage({
      command: 'exportPresets'
    });
  });
  
  document.getElementById('createEmptyButton')?.addEventListener('click', () => {
    showPresetForm();
  });
});

// Handle messages from the extension
window.addEventListener('message', event => {
  const message = event.data;
  
  switch (message.command) {
    case 'updatePresets':
      allPresets = message.presets;
      updatePresetList(allPresets);
      break;
    case 'updateModels':
      allModels = message.models;
      updateModelOptions(allModels);
      break;
  }
});

// Update preset list
function updatePresetList(presets) {
  const loadingElement = document.getElementById('loading');
  const emptyElement = document.getElementById('empty');
  const presetListElement = document.getElementById('preset-list');
  
  loadingElement.style.display = 'none';
  
  if (!presets || presets.length === 0) {
    emptyElement.style.display = 'block';
    presetListElement.innerHTML = '';
    return;
  }
  
  emptyElement.style.display = 'none';
  presetListElement.innerHTML = '';
  
  // Create preset list
  presets.forEach(preset => {
    // Create preset item
    const presetItem = document.createElement('div');
    presetItem.className = 'preset-item';
    presetItem.dataset.id = preset.id;
    
    // Create preset info
    const presetInfo = document.createElement('div');
    presetInfo.className = 'preset-info';
    
    // Create preset name
    const presetName = document.createElement('div');
    presetName.className = 'preset-name';
    presetName.textContent = preset.name;
    presetInfo.appendChild(presetName);
    
    // Create preset details
    const presetDetails = document.createElement('div');
    presetDetails.className = 'preset-details';
    presetDetails.textContent = `${preset.modelName} (${preset.provider})`;
    presetInfo.appendChild(presetDetails);
    
    presetItem.appendChild(presetInfo);
    
    // Create preset actions
    const actionsElement = document.createElement('div');
    actionsElement.className = 'preset-actions';
    
    // Apply button
    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply';
    applyButton.addEventListener('click', (event) => {
      event.stopPropagation();
      vscode.postMessage({
        command: 'applyPreset',
        presetId: preset.id
      });
    });
    actionsElement.appendChild(applyButton);
    
    // Edit button
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', (event) => {
      event.stopPropagation();
      showPresetForm(preset);
    });
    actionsElement.appendChild(editButton);
    
    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      vscode.postMessage({
        command: 'deletePreset',
        presetId: preset.id
      });
    });
    actionsElement.appendChild(deleteButton);
    
    presetItem.appendChild(actionsElement);
    
    // Show details on click
    presetItem.addEventListener('click', () => {
      showPresetDetails(preset);
    });
    
    presetListElement.appendChild(presetItem);
  });
}

// Update model options
function updateModelOptions(models) {
  const modelSelect = document.getElementById('modelSelect');
  
  if (!modelSelect) {
    return;
  }
  
  // Clear options
  modelSelect.innerHTML = '';
  
  // Add options
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.name;
    option.textContent = `${model.name} (${model.provider})`;
    option.dataset.provider = model.provider;
    modelSelect.appendChild(option);
  });
}

// Show preset form
function showPresetForm(preset = null) {
  // Create form container
  const formContainer = document.createElement('div');
  formContainer.className = 'form-container';
  
  // Create form
  const form = document.createElement('form');
  form.className = 'preset-form';
  
  // Create form title
  const formTitle = document.createElement('h3');
  formTitle.textContent = preset ? 'Edit Preset' : 'Create Preset';
  form.appendChild(formTitle);
  
  // Create form fields
  const fields = [
    {
      id: 'presetName',
      label: 'Preset Name',
      type: 'text',
      value: preset?.name || '',
      required: true
    },
    {
      id: 'presetDescription',
      label: 'Description',
      type: 'textarea',
      value: preset?.description || ''
    },
    {
      id: 'modelSelect',
      label: 'Model',
      type: 'select',
      value: preset?.modelName || '',
      required: true
    },
    {
      id: 'temperature',
      label: 'Temperature',
      type: 'range',
      min: 0,
      max: 1,
      step: 0.1,
      value: preset?.parameters.temperature || 0.7
    },
    {
      id: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      min: 100,
      max: 10000,
      step: 100,
      value: preset?.parameters.maxTokens || 1000
    },
    {
      id: 'systemPrompt',
      label: 'System Prompt',
      type: 'textarea',
      value: preset?.parameters.systemPrompt || ''
    }
  ];
  
  // Create form fields
  fields.forEach(field => {
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'form-field';
    
    const label = document.createElement('label');
    label.htmlFor = field.id;
    label.textContent = field.label;
    fieldContainer.appendChild(label);
    
    let input;
    
    if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.id = field.id;
      input.value = field.value;
      if (field.required) {
        input.required = true;
      }
    } else if (field.type === 'select') {
      input = document.createElement('select');
      input.id = field.id;
      if (field.required) {
        input.required = true;
      }
      
      // Add options
      updateModelOptions(allModels);
      
      // Set value
      if (field.value) {
        input.value = field.value;
      }
    } else if (field.type === 'range') {
      const rangeContainer = document.createElement('div');
      rangeContainer.className = 'range-container';
      
      input = document.createElement('input');
      input.type = field.type;
      input.id = field.id;
      input.min = field.min;
      input.max = field.max;
      input.step = field.step;
      input.value = field.value;
      
      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'range-value';
      valueDisplay.textContent = field.value;
      
      input.addEventListener('input', () => {
        valueDisplay.textContent = input.value;
      });
      
      rangeContainer.appendChild(input);
      rangeContainer.appendChild(valueDisplay);
      
      fieldContainer.appendChild(rangeContainer);
    } else {
      input = document.createElement('input');
      input.type = field.type;
      input.id = field.id;
      input.value = field.value;
      
      if (field.min !== undefined) {
        input.min = field.min;
      }
      
      if (field.max !== undefined) {
        input.max = field.max;
      }
      
      if (field.step !== undefined) {
        input.step = field.step;
      }
      
      if (field.required) {
        input.required = true;
      }
    }
    
    if (field.type !== 'range') {
      fieldContainer.appendChild(input);
    }
    
    form.appendChild(fieldContainer);
  });
  
  // Create form actions
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'form-actions';
  
  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', () => {
    document.body.removeChild(formContainer);
  });
  actionsContainer.appendChild(cancelButton);
  
  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.textContent = 'Save';
  actionsContainer.appendChild(saveButton);
  
  form.appendChild(actionsContainer);
  
  // Handle form submission
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    
    // Get form values
    const presetName = document.getElementById('presetName').value;
    const presetDescription = document.getElementById('presetDescription').value;
    const modelSelect = document.getElementById('modelSelect');
    const modelName = modelSelect.value;
    const provider = modelSelect.options[modelSelect.selectedIndex].dataset.provider;
    const temperature = parseFloat(document.getElementById('temperature').value);
    const maxTokens = parseInt(document.getElementById('maxTokens').value);
    const systemPrompt = document.getElementById('systemPrompt').value;
    
    // Create preset
    const newPreset = {
      id: preset?.id || `preset-${Date.now()}`,
      name: presetName,
      description: presetDescription,
      modelName,
      provider,
      parameters: {
        temperature,
        maxTokens,
        systemPrompt
      },
      metadata: {
        createdAt: preset?.metadata.createdAt || new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        tags: preset?.metadata.tags || []
      }
    };
    
    // Send message to extension
    vscode.postMessage({
      command: preset ? 'updatePreset' : 'createPreset',
      preset: newPreset,
      presetId: preset?.id
    });
    
    // Close form
    document.body.removeChild(formContainer);
  });
  
  formContainer.appendChild(form);
  document.body.appendChild(formContainer);
}

// Show preset details
function showPresetDetails(preset) {
  // Create details container
  const detailsContainer = document.createElement('div');
  detailsContainer.className = 'details-container';
  
  // Create details
  const details = document.createElement('div');
  details.className = 'preset-details-panel';
  
  // Create details title
  const detailsTitle = document.createElement('h3');
  detailsTitle.textContent = preset.name;
  details.appendChild(detailsTitle);
  
  // Create details content
  const detailsContent = document.createElement('div');
  detailsContent.className = 'details-content';
  
  // Add details
  const detailItems = [
    { label: 'Description', value: preset.description || 'No description' },
    { label: 'Model', value: preset.modelName },
    { label: 'Provider', value: preset.provider },
    { label: 'Temperature', value: preset.parameters.temperature },
    { label: 'Max Tokens', value: preset.parameters.maxTokens },
    { label: 'System Prompt', value: preset.parameters.systemPrompt || 'No system prompt' },
    { label: 'Created', value: new Date(preset.metadata.createdAt).toLocaleString() },
    { label: 'Modified', value: new Date(preset.metadata.modifiedAt).toLocaleString() }
  ];
  
  detailItems.forEach(item => {
    const detailItem = document.createElement('div');
    detailItem.className = 'detail-item';
    
    const detailLabel = document.createElement('div');
    detailLabel.className = 'detail-label';
    detailLabel.textContent = item.label;
    detailItem.appendChild(detailLabel);
    
    const detailValue = document.createElement('div');
    detailValue.className = 'detail-value';
    detailValue.textContent = item.value;
    detailItem.appendChild(detailValue);
    
    detailsContent.appendChild(detailItem);
  });
  
  details.appendChild(detailsContent);
  
  // Create details actions
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'details-actions';
  
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(detailsContainer);
  });
  actionsContainer.appendChild(closeButton);
  
  details.appendChild(actionsContainer);
  
  detailsContainer.appendChild(details);
  document.body.appendChild(detailsContainer);
}
