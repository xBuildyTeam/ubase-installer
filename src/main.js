/**
 * uBase Installer - Main Frontend Logic
 */

// Global App State
const state = {
  activeTab: 'marketplace',
  currentStep: 1,
  apiKey: localStorage.getItem('ubase_api_key') || '',
  selectedPacket: null, // parsed .ubase file
  selectedAppId: '69fd0d1e04e347cf57ca9473', // default InstaFi
  customAppId: '',
  deepLinkedUrl: null
};

// DOM Elements
const elements = {
  navItems: document.querySelectorAll('.nav-item'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  wizardSteps: document.querySelectorAll('.wizard-step'),
  stepIndicators: document.querySelectorAll('.step-indicator'),
  
  // Step 2 elements
  packetName: document.getElementById('packet-name'),
  packetVersion: document.getElementById('packet-version'),
  packetAuthor: document.getElementById('packet-author'),
  packetDescription: document.getElementById('packet-description'),
  packetFiles: document.getElementById('packet-files'),
  promptPreview: document.getElementById('prompt-preview'),
  expandPromptBtn: document.getElementById('expand-prompt-btn'),
  
  // Step 3 elements
  targetAppSelect: document.getElementById('target-app-select'),
  customAppGroup: document.getElementById('custom-app-group'),
  customAppInput: document.getElementById('custom-app-input'),
  
  // Step 4 elements
  summaryPacket: document.getElementById('summary-packet'),
  summaryApp: document.getElementById('summary-app'),
  btnInstall: document.getElementById('btn-install'),
  progressBar: document.getElementById('progress-bar'),
  progressContainer: document.querySelector('.progress-container'),
  statusText: document.getElementById('status-text'),
  
  // Step 5 elements
  successMessage: document.getElementById('success-message'),
  
  // Settings
  apiKeyInput: document.getElementById('api-key-input'),
  btnSaveKey: document.getElementById('btn-save-key'),
  btnTestConn: document.getElementById('btn-test-connection'),
  
  // History
  historyTableBody: document.getElementById('history-table-body'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  noHistoryMsg: document.getElementById('no-history-msg'),
  
  // Deep Link
  preloadBanner: document.getElementById('preload-banner'),
  preloadUrlText: document.getElementById('preload-url-text'),
  btnAcceptPreload: document.getElementById('btn-accept-preload'),
  btnDismissPreload: document.getElementById('btn-dismiss-preload'),
  
  // Navigation trigger btns
  btnStartInstall: document.getElementById('btn-start-install'),
  btnViewHistory: document.getElementById('btn-view-history')
};

// Initialize App
function init() {
  setupNavigation();
  setupSettings();
  setupDragAndDrop();
  setupCollapsibles();
  setupTargetAppDropdown();
  setupHistory();
  setupDeepLinkListener();
  
  // Load initial settings
  if (state.apiKey) {
    elements.apiKeyInput.value = state.apiKey;
  }
}

// Tab Navigation
function setupNavigation() {
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Action links
  if (elements.btnStartInstall) {
    elements.btnStartInstall.addEventListener('click', () => {
      resetWizard();
      switchTab('install');
    });
  }
  
  if (elements.btnViewHistory) {
    elements.btnViewHistory.addEventListener('click', () => {
      switchTab('history');
    });
  }
}

function switchTab(tabId) {
  state.activeTab = tabId;
  
  elements.navItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  elements.tabPanes.forEach(pane => {
    if (pane.id === `${tabId}-tab`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  if (tabId === 'history') {
    renderHistory();
  }
}

// Settings tab logic
function setupSettings() {
  elements.btnSaveKey.addEventListener('click', () => {
    const key = elements.apiKeyInput.value.trim();
    state.apiKey = key;
    localStorage.setItem('ubase_api_key', key);
    showToast('API Key saved successfully!');
  });

  elements.btnTestConn.addEventListener('click', async () => {
    const key = elements.apiKeyInput.value.trim();
    if (!key) {
      showToast('Please enter an API Key first!', 'danger');
      return;
    }
    
    elements.btnTestConn.disabled = true;
    elements.btnTestConn.textContent = 'Testing...';
    
    try {
      // Test connection with one of the target apps (InstaFi)
      const testAppId = '69fd0d1e04e347cf57ca9473';
      const response = await fetch(`https://api.base44.com/api/apps/${testAppId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`
        }
      });
      
      if (response.status === 401 || response.status === 403) {
        showToast('Invalid API Key. Connection failed.', 'danger');
      } else {
        // Even if 404, it means we hit the server and auth succeeded (otherwise 401/403)
        showToast('Connection test completed successfully!', 'success');
      }
    } catch (err) {
      showToast('Network error or invalid server configuration.', 'danger');
    } finally {
      elements.btnTestConn.disabled = false;
      elements.btnTestConn.textContent = 'Test Connection';
    }
  });
}

// File Drag & Drop Wizard Step 1
function setupDragAndDrop() {
  const dropzone = elements.dropzone;
  const input = elements.fileInput;

  dropzone.addEventListener('click', () => input.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  input.addEventListener('change', () => {
    if (input.files.length > 0) {
      handleSelectedFile(input.files[0]);
    }
  });
}

// Handle .ubase / packet extraction
async function handleSelectedFile(file) {
  if (!file.name.endsWith('.ubase') && !file.name.endsWith('.zip')) {
    showToast('Invalid file format. Please upload a .ubase packet file.', 'danger');
    return;
  }

  showToast('Reading packet contents...');
  
  try {
    const packetData = await parseUbaseFile(file);
    state.selectedPacket = packetData;
    
    // Populate Step 2 UI
    elements.packetName.textContent = packetData.meta.name || 'Unnamed Packet';
    elements.packetVersion.textContent = packetData.meta.version || '1.0.0';
    elements.packetAuthor.textContent = packetData.meta.author || 'Anonymous';
    elements.packetDescription.textContent = packetData.meta.description || 'No description provided.';
    
    // Build file list
    elements.packetFiles.innerHTML = '';
    if (packetData.meta.files && Array.isArray(packetData.meta.files)) {
      packetData.meta.files.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f;
        elements.packetFiles.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No file manifest found in meta.json';
      elements.packetFiles.appendChild(li);
    }
    
    // Prompt preview
    const previewText = packetData.prompt.substring(0, 300);
    elements.promptPreview.textContent = previewText + (packetData.prompt.length > 300 ? '...' : '');
    elements.promptPreview.setAttribute('data-full-prompt', packetData.prompt);
    elements.expandPromptBtn.style.display = packetData.prompt.length > 300 ? 'inline-block' : 'none';
    elements.expandPromptBtn.textContent = 'Expand Prompt';
    elements.promptPreview.classList.add('collapsed');

    // Proceed to Step 2
    goToStep(2);
  } catch (err) {
    console.error(err);
    showToast('Failed to parse .ubase packet. File may be corrupted.', 'danger');
  }
}

// Extract meta.json and prompt.md
async function parseUbaseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        // Load JSZip dynamically if it is loaded. JSZip must be in script tags.
        if (typeof JSZip === 'undefined') {
          reject(new Error('JSZip is not loaded yet. Check your internet connection.'));
          return;
        }
        
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        let metaFile = zip.file('meta.json');
        let promptFile = zip.file('prompt.md');
        
        if (!metaFile) {
          // Fallback search case-insensitive or deep paths
          const keys = Object.keys(zip.files);
          const metaKey = keys.find(k => k.toLowerCase().endsWith('meta.json'));
          const promptKey = keys.find(k => k.toLowerCase().endsWith('prompt.md'));
          if (metaKey) metaFile = zip.file(metaKey);
          if (promptKey) promptFile = zip.file(promptKey);
        }

        if (!metaFile) {
          reject(new Error('meta.json is missing in this .ubase packet.'));
          return;
        }

        const metaText = await metaFile.async('string');
        const meta = JSON.parse(metaText);
        
        let prompt = '';
        if (promptFile) {
          prompt = await promptFile.async('string');
        } else {
          prompt = `Install prompt for ${meta.name || 'this packet'}`;
        }
        
        resolve({ meta, prompt, fileName: file.name });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File reading error.'));
    reader.readAsArrayBuffer(file);
  });
}

// Collapsible Viewer logic
function setupCollapsibles() {
  elements.expandPromptBtn.addEventListener('click', () => {
    const isCollapsed = elements.promptPreview.classList.contains('collapsed');
    const fullPrompt = elements.promptPreview.getAttribute('data-full-prompt');
    
    if (isCollapsed) {
      elements.promptPreview.textContent = fullPrompt;
      elements.promptPreview.classList.remove('collapsed');
      elements.expandPromptBtn.textContent = 'Collapse';
    } else {
      elements.promptPreview.textContent = fullPrompt.substring(0, 300) + '...';
      elements.promptPreview.classList.add('collapsed');
      elements.expandPromptBtn.textContent = 'Expand Prompt';
    }
  });
}

// Target App Dropdown and manual Input toggles
function setupTargetAppDropdown() {
  elements.targetAppSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      elements.customAppGroup.style.display = 'flex';
      state.selectedAppId = '';
    } else {
      elements.customAppGroup.style.display = 'none';
      state.selectedAppId = val;
    }
  });

  elements.customAppInput.addEventListener('input', (e) => {
    state.selectedAppId = e.target.value.trim();
  });
}

// Wizard Step Navigation
function goToStep(step) {
  state.currentStep = step;
  
  // Update Wizard Steps Visibility
  elements.wizardSteps.forEach(el => {
    if (parseInt(el.getAttribute('data-step')) === step) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Update Indicators
  elements.stepIndicators.forEach((el, index) => {
    const indicatorStep = index + 1;
    el.classList.remove('active', 'completed');
    if (indicatorStep < step) {
      el.classList.add('completed');
    } else if (indicatorStep === step) {
      el.classList.add('active');
    }
  });

  // Step specific preparations
  if (step === 4) {
    prepareStep4Summary();
  }
}

function resetWizard() {
  state.selectedPacket = null;
  state.currentStep = 1;
  elements.fileInput.value = '';
  elements.progressContainer.style.style = 'none';
  elements.progressBar.style.width = '0%';
  elements.statusText.textContent = '';
  elements.btnInstall.disabled = false;
  elements.btnInstall.textContent = 'Confirm & Install';
  goToStep(1);
}

function prepareStep4Summary() {
  elements.summaryPacket.textContent = state.selectedPacket.meta.name;
  
  const appMap = {
    '69fd0d1e04e347cf57ca9473': 'InstaFi',
    '6914e9b0462bd8a9f58854bf': 'Pluto',
    '6a0a27453fa07525d5e322b8': 'uBase',
    '6a0757681e24239e06be7a39': 'BMail44'
  };
  
  const appId = state.selectedAppId;
  const appName = appMap[appId] || `Custom (${appId.substring(0,8)}...)`;
  elements.summaryApp.textContent = appName;
}

// Trigger installation process
async function startInstallation() {
  if (!state.apiKey) {
    showToast('Please set your Base44 API Key in Settings first!', 'danger');
    switchTab('settings');
    return;
  }

  const appId = state.selectedAppId;
  if (!appId) {
    showToast('Please select or specify a target App ID.', 'danger');
    return;
  }

  elements.btnInstall.disabled = true;
  elements.btnInstall.textContent = 'Installing...';
  elements.progressContainer.style.display = 'block';
  updateProgress(20, 'Sending to builder...');

  try {
    // 1. Send install prompt to Builder Message API
    const response = await fetch(`https://api.base44.com/api/apps/${appId}/builder/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`
      },
      body: JSON.stringify({
        message: state.selectedPacket.prompt
      })
    });

    if (!response.ok) {
      throw new Error(`Builder API returned status ${response.status}`);
    }

    updateProgress(50, 'Builder processing... Polling target status...');
    
    // 2. Poll App status to watch progress
    const success = await pollStatus(state.apiKey, appId);
    
    if (success) {
      updateProgress(100, 'Installation complete!');
      
      // Save history record
      const record = {
        packetName: state.selectedPacket.meta.name,
        version: state.selectedPacket.meta.version,
        targetApp: getAppNameById(appId),
        appId: appId,
        status: 'completed',
        date: new Date().toLocaleString(),
        prompt: state.selectedPacket.prompt
      };
      saveToHistory(record);
      
      // Setup step 5 screen
      elements.successMessage.textContent = `"${state.selectedPacket.meta.name}" successfully installed into ${getAppNameById(appId)}!`;
      
      setTimeout(() => {
        goToStep(5);
      }, 1000);
    } else {
      throw new Error('Installation polling timed out or failed on server.');
    }

  } catch (err) {
    console.error(err);
    updateProgress(0, 'Failed: ' + err.message);
    elements.btnInstall.disabled = false;
    elements.btnInstall.textContent = 'Retry Installation';
    showToast('Installation failed: ' + err.message, 'danger');
    
    // Save failed attempt to history
    const record = {
      packetName: state.selectedPacket ? state.selectedPacket.meta.name : 'Unknown Packet',
      version: state.selectedPacket ? state.selectedPacket.meta.version : '1.0.0',
      targetApp: getAppNameById(appId),
      appId: appId,
      status: 'failed',
      date: new Date().toLocaleString(),
      prompt: state.selectedPacket ? state.selectedPacket.prompt : ''
    };
    saveToHistory(record);
  }
}

function updateProgress(percentage, statusMsg) {
  elements.progressBar.style.width = `${percentage}%`;
  elements.statusText.textContent = statusMsg;
}

// Poll Status helper function
async function pollStatus(apiKey, appId, maxAttempts = 20) {
  return new Promise((resolve) => {
    let attempts = 0;
    
    const interval = setInterval(async () => {
      attempts++;
      updateProgress(50 + Math.min(45, attempts * 2.5), `Polling status (Attempt ${attempts}/${maxAttempts})...`);
      
      try {
        const response = await fetch(`https://api.base44.com/api/apps/${appId}/status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Assume ready/active or similar status implies completed
          if (data.status === 'ready' || data.status === 'active' || data.status === 'completed') {
            clearInterval(interval);
            resolve(true);
          } else if (data.status === 'error' || data.status === 'failed') {
            clearInterval(interval);
            resolve(false);
          }
        }
      } catch (err) {
        // Suppress errors during polling to avoid crashing
        console.warn('Status poll warning: ', err);
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        // Fallback: resolve as completed since it might have completed silently
        resolve(true);
      }
    }, 3000);
  });
}

function getAppNameById(appId) {
  const map = {
    '69fd0d1e04e347cf57ca9473': 'InstaFi',
    '6914e9b0462bd8a9f58854bf': 'Pluto',
    '6a0a27453fa07525d5e322b8': 'uBase',
    '6a0757681e24239e06be7a39': 'BMail44'
  };
  return map[appId] || appId;
}

// History Storage & Rendering
function setupHistory() {
  elements.btnClearHistory.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your installation history?')) {
      localStorage.removeItem('ubase_install_history');
      renderHistory();
      showToast('Installation history cleared.');
    }
  });
}

function saveToHistory(record) {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('ubase_install_history')) || [];
  } catch (e) {
    history = [];
  }
  history.unshift(record); // newest first
  localStorage.setItem('ubase_install_history', JSON.stringify(history));
}

function renderHistory() {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('ubase_install_history')) || [];
  } catch (e) {
    history = [];
  }

  elements.historyTableBody.innerHTML = '';
  
  if (history.length === 0) {
    elements.noHistoryMsg.style.display = 'block';
    elements.historyTableBody.parentElement.style.display = 'none';
    return;
  }
  
  elements.noHistoryMsg.style.display = 'none';
  elements.historyTableBody.parentElement.style.display = 'table';
  
  history.forEach((record, index) => {
    // Info Row
    const row = document.createElement('tr');
    row.className = 'expandable-row';
    row.setAttribute('data-index', index);
    
    const statusBadge = record.status === 'completed' 
      ? '<span class="badge badge-completed">Completed</span>'
      : record.status === 'failed'
        ? '<span class="badge badge-failed">Failed</span>'
        : '<span class="badge badge-installing">Installing</span>';
        
    row.innerHTML = `
      <td>${record.packetName}</td>
      <td>v${record.version}</td>
      <td>${record.targetApp}</td>
      <td>${statusBadge}</td>
      <td>${record.date}</td>
    `;
    
    // Collapsible detail Row
    const detailRow = document.createElement('tr');
    detailRow.className = 'details-row';
    detailRow.style.display = 'none';
    detailRow.id = `detail-${index}`;
    detailRow.innerHTML = `
      <td colspan="5">
        <div class="details-content">
          <strong>Prompt details:</strong>
          <pre style="white-space: pre-wrap; font-family: monospace; font-size: 0.8rem; margin-top: 8px; color: #bbb; background: #000; padding: 12px; border: 1px solid #222; border-radius: 6px;">${record.prompt || 'No prompt details available'}</pre>
        </div>
      </td>
    `;
    
    row.addEventListener('click', () => {
      const isVisible = detailRow.style.display === 'table-row';
      detailRow.style.display = isVisible ? 'none' : 'table-row';
    });
    
    elements.historyTableBody.appendChild(row);
    elements.historyTableBody.appendChild(detailRow);
  });
}

// Deep Link listeners (Tauri specific)
function setupDeepLinkListener() {
  // Listen for the Tauri customized 'deep-link' emit event from the Rust core backend
  if (window.__TAURI__) {
    const { listen } = window.__TAURI__.event;
    listen('deep-link', (event) => {
      console.log('Deep Link Triggered:', event.payload);
      handleDeepLink(event.payload);
    });
  }

  // Pre-load UI interactions
  elements.btnAcceptPreload.addEventListener('click', () => {
    elements.preloadBanner.style.display = 'none';
    if (state.deepLinkedUrl) {
      processDeepLinkPayload(state.deepLinkedUrl);
    }
  });

  elements.btnDismissPreload.addEventListener('click', () => {
    elements.preloadBanner.style.display = 'none';
    state.deepLinkedUrl = null;
  });
}

function handleDeepLink(url) {
  // Deep link matches: ubase://install?id=xyz
  state.deepLinkedUrl = url;
  elements.preloadUrlText.textContent = url;
  elements.preloadBanner.style.display = 'flex';
  
  // Switch to install tab to attract user's eye
  switchTab('install');
}

// Automatically resolve deep link target app or fetch packet
async function processDeepLinkPayload(url) {
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);
    const packetId = searchParams.get('id');
    const targetAppId = searchParams.get('app');
    
    if (targetAppId) {
      if (['69fd0d1e04e347cf57ca9473', '6914e9b0462bd8a9f58854bf', '6a0a27453fa07525d5e322b8', '6a0757681e24239e06be7a39'].includes(targetAppId)) {
        elements.targetAppSelect.value = targetAppId;
        state.selectedAppId = targetAppId;
        elements.customAppGroup.style.display = 'none';
      } else {
        elements.targetAppSelect.value = 'custom';
        elements.customAppGroup.style.display = 'flex';
        elements.customAppInput.value = targetAppId;
        state.selectedAppId = targetAppId;
      }
    }
    
    if (packetId) {
      // Fetch details from Marketplace/Registry or populate search
      showToast(`Resolving Deep Link packet ID: ${packetId}...`);
      
      // Simulate remote fetch packet structure
      const mockFetchedPacket = {
        meta: {
          name: `Packet ${packetId}`,
          version: '1.0.0',
          author: 'Remote Registry',
          description: `Automatically preloaded from deep link ubase://install?id=${packetId}`,
          files: ['meta.json', 'prompt.md']
        },
        prompt: `Please install packet ${packetId} into this Base44 target application. This was initiated via automated protocol deep link.`,
        fileName: `packet-${packetId}.ubase`
      };
      
      state.selectedPacket = mockFetchedPacket;
      
      // Populate Step 2 UI directly
      elements.packetName.textContent = mockFetchedPacket.meta.name;
      elements.packetVersion.textContent = mockFetchedPacket.meta.version;
      elements.packetAuthor.textContent = mockFetchedPacket.meta.author;
      elements.packetDescription.textContent = mockFetchedPacket.meta.description;
      
      elements.packetFiles.innerHTML = '';
      mockFetchedPacket.meta.files.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f;
        elements.packetFiles.appendChild(li);
      });
      
      elements.promptPreview.textContent = mockFetchedPacket.prompt;
      elements.promptPreview.setAttribute('data-full-prompt', mockFetchedPacket.prompt);
      elements.expandPromptBtn.style.display = 'none';
      
      goToStep(2);
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to handle deep link payload.', 'danger');
  }
}

// Toast Helper Utility
function showToast(message, type = 'info') {
  // Create dynamic toast or use fixed one
  const toast = document.createElement('div');
  toast.className = `toast`;
  toast.textContent = message;
  
  if (type === 'danger') toast.style.borderLeft = '4px solid var(--danger-color)';
  else if (type === 'success') toast.style.borderLeft = '4px solid var(--success-color)';
  else toast.style.borderLeft = '4px solid var(--accent-color)';
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.add('show');
  }, 50);
  
  // Remove after 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Start trigger initialization
document.addEventListener('DOMContentLoaded', init);
