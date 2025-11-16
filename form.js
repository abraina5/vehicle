/**
 * FormHandler - Handles form submission, validation, and image processing
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
class FormHandler {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.maxImageSize = 5 * 1024 * 1024; // 5MB in bytes
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    this.isProcessingOCR = false;
    this.apiKeyRef = database.ref('config/apiKey');
    
    // Plate Recognizer API configuration
    // Get your free API key from: https://platerecognizer.com
    this.plateRecognizerApiKey = '';
    this.plateRecognizerApiUrl = 'https://api.platerecognizer.com/v1/plate-reader/';
    
    // Load API key from Firebase
    this.loadApiKeyFromFirebase();
  }

  /**
   * Load API key from Firebase
   */
  async loadApiKeyFromFirebase() {
    try {
      const snapshot = await this.apiKeyRef.once('value');
      if (snapshot.exists()) {
        this.plateRecognizerApiKey = snapshot.val();
        console.log('API key loaded from Firebase');
      }
    } catch (error) {
      console.error('Error loading API key from Firebase:', error);
    }
  }

  /**
   * Set the Plate Recognizer API key
   * @param {string} apiKey - The API key from platerecognizer.com
   */
  async setApiKey(apiKey) {
    this.plateRecognizerApiKey = apiKey;
    try {
      if (apiKey) {
        await this.apiKeyRef.set(apiKey);
        console.log('API key saved to Firebase');
      } else {
        await this.apiKeyRef.remove();
        console.log('API key removed from Firebase');
      }
    } catch (error) {
      console.error('Error saving API key to Firebase:', error);
      throw error;
    }
  }

  /**
   * Extract license plate using Plate Recognizer API
   * @param {File} file - The image file to process
   * @returns {Promise<string>} Promise that resolves to extracted plate number
   */
  async extractWithPlateRecognizer(file) {
    if (!this.plateRecognizerApiKey) {
      throw new Error('API key not configured');
    }

    const formData = new FormData();
    formData.append('upload', file);

    const response = await fetch(this.plateRecognizerApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.plateRecognizerApiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    const result = await response.json();
    console.log('Plate Recognizer API response:', result);

    // Extract the plate number from the first result
    if (result.results && result.results.length > 0) {
      const plate = result.results[0].plate;
      const confidence = result.results[0].score;
      console.log(`Detected plate: ${plate} (confidence: ${Math.round(confidence * 100)}%)`);
      return plate.toUpperCase();
    }

    return '';
  }

  /**
   * Extract license plate number from image using OCR
   * Tries Plate Recognizer API first, falls back to Tesseract.js
   * @param {File} file - The image file to process
   * @returns {Promise<string>} Promise that resolves to extracted plate number
   */
  async extractTextFromImage(file) {
    try {
      // Try Plate Recognizer API first if API key is configured
      if (this.plateRecognizerApiKey) {
        console.log('Using Plate Recognizer API...');
        try {
          const plateNumber = await this.extractWithPlateRecognizer(file);
          if (plateNumber) {
            console.log('✓ Plate Recognizer API succeeded:', plateNumber);
            return plateNumber;
          }
        } catch (apiError) {
          console.warn('Plate Recognizer API failed:', apiError.message);
          console.log('Falling back to Tesseract.js...');
        }
      } else {
        console.log('No API key configured. Using Tesseract.js...');
      }

      // Fallback to Tesseract.js
      console.log('Starting Tesseract OCR with multiple configurations...');
      
      // Try multiple OCR configurations
      const configs = [
        {
          name: 'Auto',
          tessedit_pageseg_mode: Tesseract.PSM.AUTO
        },
        {
          name: 'Single Block',
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
        },
        {
          name: 'Single Line',
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE
        }
      ];
      
      const allCandidates = [];
      
      // Run OCR with each configuration
      for (const config of configs) {
        console.log(`Trying OCR with ${config.name} mode...`);
        
        const result = await Tesseract.recognize(
          file,
          'eng',
          {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                console.log(`${config.name} - Progress: ${Math.round(m.progress * 100)}%`);
              }
            },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: config.tessedit_pageseg_mode
          }
        );
        
        console.log(`${config.name} - Raw text:`, result.data.text);
        
        // Get words with confidence scores
        const words = result.data.words || [];
        console.log(`${config.name} - Words:`, words.map(w => `${w.text}(${Math.round(w.confidence)}%)`));
        
        // Add all words as candidates
        for (const word of words) {
          const cleaned = word.text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          if (cleaned.length >= 2 && cleaned.length <= 10) {
            allCandidates.push({
              text: cleaned,
              confidence: word.confidence || 0,
              source: config.name
            });
          }
        }
        
        // Also add full text as candidate
        const fullCleaned = result.data.text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (fullCleaned.length >= 2 && fullCleaned.length <= 10) {
          allCandidates.push({
            text: fullCleaned,
            confidence: 50,
            source: `${config.name}-full`
          });
        }
      }
      
      console.log('All candidates from all configs:', allCandidates);
      
      // Filter out common non-plate words
      const filterWords = [
        'OF', 'THE', 'STATE', 'USA', 'GOV', 'GOVT',
        'CALIFORNIA', 'TEXAS', 'FLORIDA', 'NEWYORK', 'ILLINOIS',
        'REGISTRATION', 'EXPIRES', 'LICENSE', 'PLATE'
      ];
      
      // Score and rank candidates
      let bestCandidate = '';
      let bestScore = 0;
      
      for (const candidate of allCandidates) {
        const text = candidate.text;
        
        // Skip very short candidates
        if (text.length < 3) {
          console.log(`Skipping too short: ${text}`);
          continue;
        }
        
        // Skip filter words
        if (filterWords.includes(text)) {
          console.log(`Filtered out: ${text}`);
          continue;
        }
        
        // Calculate score
        let score = 0;
        
        // Confidence from OCR
        score += (candidate.confidence / 100) * 30;
        
        // Length score (5-7 is ideal for most plates)
        if (text.length >= 5 && text.length <= 7) {
          score += 30;
        } else if (text.length >= 4 && text.length <= 8) {
          score += 20;
        } else if (text.length >= 3 && text.length <= 9) {
          score += 10;
        }
        
        // Mix of letters and numbers (very important for plates)
        const hasLetters = /[A-Z]/.test(text);
        const hasNumbers = /[0-9]/.test(text);
        if (hasLetters && hasNumbers) {
          score += 40;
        } else if (hasLetters || hasNumbers) {
          score += 15;
        }
        
        // Penalize if it's all letters and longer than 4 chars (likely a word)
        if (hasLetters && !hasNumbers && text.length > 4) {
          score -= 20;
        }
        
        console.log(`Candidate: "${text}" | Length: ${text.length} | Confidence: ${Math.round(candidate.confidence)}% | Score: ${Math.round(score)} | Source: ${candidate.source}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = text;
        }
      }
      
      console.log(`\n=== FINAL RESULT ===`);
      console.log(`Best candidate: "${bestCandidate}" with score: ${Math.round(bestScore)}`);
      
      return bestCandidate || '';
      
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Failed to extract text from image. Please enter the plate number manually.');
    }
  }

  /**
   * Handle image file upload and convert to base64
   * Requirement 1.1: Display form with image upload field
   * Requirement 1.4: Validate image file format
   * @param {File} file - The image file to process
   * @returns {Promise<string>} Promise that resolves to base64 data URL
   */
  async handleImageUpload(file) {
    return new Promise((resolve, reject) => {
      // Validate file type
      // Requirement 1.4: Validate file is image format (JPEG, PNG, WebP)
      if (!this.allowedImageTypes.includes(file.type)) {
        reject(new Error('Please upload a valid image file (JPEG, PNG, or WebP).'));
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > this.maxImageSize) {
        reject(new Error('Image file is too large. Please use an image smaller than 5MB.'));
        return;
      }

      // Convert image to base64 using FileReader API
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target.result);
      };

      reader.onerror = () => {
        // Handle image load failures
        reject(new Error('Failed to load image. Please try again.'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate form inputs
   * Requirement 1.3: Display validation errors for missing fields
   * @param {Object} formData - The form data to validate
   * @returns {Object} Validation result with valid flag and errors array
   */
  validateForm(formData) {
    const errors = [];

    // Check for required fields (image is now optional)
    if (!formData.plateNumber || formData.plateNumber.trim() === '') {
      errors.push('Plate number is required.');
    }

    if (!formData.ownerName || formData.ownerName.trim() === '') {
      errors.push('Owner name is required.');
    }

    if (!formData.phoneNumber || formData.phoneNumber.trim() === '') {
      errors.push('Phone number is required.');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Handle form submission
   * Requirement 1.2: Store license plate record
   * Requirement 1.5: Display confirmation message
   * @param {Event} event - The form submit event
   * @param {Function} onSuccess - Callback function on successful submission
   * @param {Function} onError - Callback function on error
   */
  async handleSubmit(event, onSuccess, onError) {
    event.preventDefault();

    const form = event.target;
    const fileInput = form.querySelector('#plateImage');
    const plateNumber = form.querySelector('#plateNumber').value;
    const ownerName = form.querySelector('#ownerName').value;
    const phoneNumber = form.querySelector('#phoneNumber').value;

    try {
      let imageData = null;

      // Check if a file was selected (image is now optional)
      if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        // Convert image to base64
        imageData = await this.handleImageUpload(file);
      }

      // Create form data object
      const formData = {
        plateImage: imageData,
        plateNumber: plateNumber,
        ownerName: ownerName,
        phoneNumber: phoneNumber
      };

      // Validate form data
      const validation = this.validateForm(formData);
      if (!validation.valid) {
        throw new Error(validation.errors.join(' '));
      }

      // Create record object
      // Requirement 1.2: Store license plate record in Firebase
      const record = {
        id: Date.now().toString(), // Unique timestamp-based ID
        plateNumber: formData.plateNumber.trim(),
        ownerName: formData.ownerName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        imageData: formData.plateImage,
        createdAt: Date.now()
      };

      // Save to Firebase (async)
      await this.storageManager.saveRecord(record);

      // Call success callback
      // Requirement 1.5: Display confirmation message
      if (onSuccess) {
        onSuccess(record);
      }

    } catch (error) {
      // Call error callback
      if (onError) {
        onError(error);
      }
    }
  }
}
