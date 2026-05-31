document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('api-key');
  const toggleVisibilityBtn = document.getElementById('toggle-key-visibility');
  const languageSelect = document.getElementById('language');
  const saveBtn = document.getElementById('save-btn');
  const btnSpinner = saveBtn.querySelector('.btn-spinner');
  const btnText = saveBtn.querySelector('.btn-text');
  const statusMessage = document.getElementById('status-message');

  // Load existing configurations
  try {
    const data = await chrome.storage.sync.get(['geminiApiKey', 'defaultLanguage']);
    if (data.geminiApiKey) {
      apiKeyInput.value = data.geminiApiKey;
    }
    if (data.defaultLanguage) {
      languageSelect.value = data.defaultLanguage;
    }
  } catch (err) {
    console.error('Error loading config from chrome.storage:', err);
  }

  // Toggle API Key visibility
  toggleVisibilityBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    
    // Update Eye Icon
    toggleVisibilityBtn.innerHTML = isPassword 
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
           <line x1="1" y1="1" x2="23" y2="23"></line>
         </svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
           <circle cx="12" cy="12" r="3"></circle>
         </svg>`;
  });

  // Save configurations with live key verification
  saveBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    const lang = languageSelect.value;

    showStatus(null);
    setLoading(true);

    if (!key) {
      showStatus('Please enter an API Key.', 'error');
      setLoading(false);
      return;
    }

    // Verify key validity
    const isValid = await verifyApiKey(key);
    if (!isValid) {
      showStatus('Invalid API Key. Please check and try again.', 'error');
      setLoading(false);
      return;
    }

    try {
      await chrome.storage.sync.set({
        geminiApiKey: key,
        defaultLanguage: lang
      });
      showStatus('Saved successfully!', 'success');
      
      // Flash the badge or notify user
      setTimeout(() => {
        showStatus(null);
      }, 2500);
    } catch (err) {
      console.error('Error saving to storage:', err);
      showStatus('Error saving settings.', 'error');
    } finally {
      setLoading(false);
    }
  });

  // UI state management helpers
  function setLoading(loading) {
    saveBtn.disabled = loading;
    if (loading) {
      btnSpinner.classList.remove('hidden');
      btnText.textContent = 'Verifying & Saving...';
    } else {
      btnSpinner.classList.add('hidden');
      btnText.textContent = 'Save Configuration';
    }
  }

  function showStatus(text, type = 'success') {
    if (!text) {
      statusMessage.classList.add('hidden');
      statusMessage.textContent = '';
      return;
    }

    statusMessage.textContent = text;
    statusMessage.className = `status-msg ${type}`;
  }

  // Verifies the API Key by making a simple request to list Gemini models
  async function verifyApiKey(key) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      return response.ok;
    } catch (err) {
      console.error('API key verification fetch error:', err);
      return false;
    }
  }
});
