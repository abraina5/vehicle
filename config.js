/**
 * Configuration Manager - Handles API key configuration
 */
class ConfigManager {
  constructor(formHandler) {
    this.formHandler = formHandler;
    this.setupConfigUI();
  }

  /**
   * Set up the configuration UI
   */
  setupConfigUI() {
    // Check if API key exists
    const apiKey = localStorage.getItem('plateRecognizerApiKey');
    this.updateConfigStatus(!!apiKey);

    // Set up event listeners
    const configToggle = document.getElementById('configToggle');
    const configPanel = document.getElementById('configPanel');
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    const clearApiKeyBtn = document.getElementById('clearApiKey');
    const apiKeyInput = document.getElementById('apiKeyInput');

    if (configToggle) {
      configToggle.addEventListener('click', () => {
        configPanel.style.display = configPanel.style.display === 'none' ? 'block' : 'none';
      });
    }

    if (saveApiKeyBtn) {
      saveApiKeyBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
          try {
            await this.formHandler.setApiKey(apiKey);
            this.updateConfigStatus(true);
            this.showMessage('API key saved to Firebase successfully!', 'success');
            configPanel.style.display = 'none';
          } catch (error) {
            this.showMessage('Failed to save API key. Please try again.', 'error');
          }
        } else {
          this.showMessage('Please enter a valid API key', 'error');
        }
      });
    }

    if (clearApiKeyBtn) {
      clearApiKeyBtn.addEventListener('click', async () => {
        try {
          await this.formHandler.setApiKey('');
          apiKeyInput.value = '';
          this.updateConfigStatus(false);
          this.showMessage('API key cleared from Firebase. Using Tesseract.js fallback.', 'info');
        } catch (error) {
          this.showMessage('Failed to clear API key. Please try again.', 'error');
        }
      });
    }

    // Load existing API key from Firebase into input
    this.loadApiKeyToInput(apiKeyInput);
  }

  /**
   * Load API key from Firebase and populate input field
   * @param {HTMLInputElement} apiKeyInput - The API key input element
   */
  async loadApiKeyToInput(apiKeyInput) {
    if (!apiKeyInput) return;
    
    try {
      const snapshot = await database.ref('config/apiKey').once('value');
      if (snapshot.exists()) {
        apiKeyInput.value = snapshot.val();
        this.updateConfigStatus(true);
      } else {
        this.updateConfigStatus(false);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
      this.updateConfigStatus(false);
    }
  }

  /**
   * Update the configuration status indicator
   * @param {boolean} hasApiKey - Whether API key is configured
   */
  updateConfigStatus(hasApiKey) {
    const statusIndicator = document.getElementById('apiKeyStatus');
    if (statusIndicator) {
      if (hasApiKey) {
        statusIndicator.textContent = '✓ Plate Recognizer API Enabled (Shared)';
        statusIndicator.style.color = '#10b981';
      } else {
        statusIndicator.textContent = '⚠ Using Tesseract.js (Basic OCR)';
        statusIndicator.style.color = '#f59e0b';
      }
    }
  }

  /**
   * Show a message to the user
   * @param {string} message - The message to display
   * @param {string} type - Message type ('success', 'error', 'info')
   */
  showMessage(message, type) {
    const messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;

    messageContainer.appendChild(messageElement);

    setTimeout(() => {
      messageElement.classList.add('message-fade-out');
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.remove();
        }
      }, 300);
    }, 3000);
  }
}
