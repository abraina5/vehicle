/**
 * App Controller - Main application initialization and coordination
 * Requirements: 5.1, 5.2, 5.4, 6.4
 */
class App {
  constructor() {
    this.storageManager = null;
    this.searchManager = null;
    this.formHandler = null;
    this.uiManager = null;

    // Debounce timer for search inputs
    this.searchDebounceTimer = null;
    this.debounceDelay = 300; // 300ms delay

    // Store current search filters
    this.currentSearchFilters = {
      name: "",
      plate: "",
    };
  }

  /**
   * Initialize the application
   * Requirement 5.1: Persist data in Client-Side Storage
   * Requirement 5.2: Load previously stored records
   * Requirement 5.4: Display error when localStorage unavailable
   */
  init() {
    // Initialize managers
    this.authManager = new AuthManager();
    this.storageManager = new StorageManager();
    this.searchManager = new SearchManager();
    this.uiManager = new UIManager();
    this.formHandler = new FormHandler(this.storageManager);
    this.configManager = new ConfigManager(this.formHandler);

    // Update UI based on auth status
    this.updateAuthUI();

    // Check localStorage availability on init
    // Requirement 5.4: Display error if unavailable
    if (!this.storageManager.isStorageAvailable()) {
      this.uiManager.showMessage(
        "Local storage is not available. Data cannot be saved.",
        "error"
      );
      // Disable form submission if storage is unavailable
      const form = document.getElementById("addRecordForm");
      if (form) {
        form.querySelector('button[type="submit"]').disabled = true;
      }
      return;
    }

    // Set up event listeners
    this.setupEventListeners();

    // Load and display all records on page load
    // Requirement 5.2: Load previously stored records from Firebase
    this.loadAndDisplayRecords();

    // Set up real-time listener for record changes
    this.setupRealtimeListener();
  }

  /**
   * Set up all event listeners for the application
   */
  setupEventListeners() {
    // Set up event listener for form submission
    const form = document.getElementById("addRecordForm");
    if (form) {
      form.addEventListener("submit", (e) => this.handleFormSubmit(e));
    }

    // Set up event listener for image upload to trigger OCR
    const plateImageInput = document.getElementById("plateImage");
    if (plateImageInput) {
      plateImageInput.addEventListener("change", (e) =>
        this.handleImageUpload(e)
      );
    }

    // Set up event listeners for search inputs with debouncing
    const searchNameInput = document.getElementById("searchName");
    const searchPlateInput = document.getElementById("searchPlate");

    if (searchNameInput) {
      searchNameInput.addEventListener("input", (e) => {
        this.handleSearchInput(e, "name");
      });
    }

    if (searchPlateInput) {
      searchPlateInput.addEventListener("input", (e) => {
        this.handleSearchInput(e, "plate");
      });
    }

    // Set up event listener for delete buttons using event delegation
    const recordsContainer = document.getElementById("recordsContainer");
    if (recordsContainer) {
      recordsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-delete")) {
          // Check if user is admin before allowing delete
          if (!this.authManager.isAdmin()) {
            this.uiManager.showMessage(
              "Only admins can delete records. Please login.",
              "error"
            );
            return;
          }
          const recordId = e.target.getAttribute("data-id");
          this.handleDelete(recordId);
        }
      });
    }

    // Set up authentication event listeners
    this.setupAuthListeners();
  }

  /**
   * Set up authentication-related event listeners
   */
  setupAuthListeners() {
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginModal = document.getElementById("loginModal");
    const closeLoginModal = document.getElementById("closeLoginModal");
    const loginForm = document.getElementById("loginForm");
    const changePasswordBtn = document.getElementById("changePasswordBtn");
    const changePasswordModal = document.getElementById("changePasswordModal");
    const closePasswordModal = document.getElementById("closePasswordModal");
    const changePasswordForm = document.getElementById("changePasswordForm");

    // Login button
    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        loginModal.style.display = "flex";
        // Show warning if using default password
        if (this.authManager.isDefaultPassword()) {
          document.getElementById("defaultPasswordWarning").style.display =
            "block";
        }
      });
    }

    // Logout button
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        this.authManager.logout();
        this.updateAuthUI();
        this.uiManager.showMessage("Logged out successfully", "info");
      });
    }

    // Close login modal
    if (closeLoginModal) {
      closeLoginModal.addEventListener("click", () => {
        loginModal.style.display = "none";
      });
    }

    // Login form submission
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("loginUsername").value;
        const password = document.getElementById("loginPassword").value;

        if (this.authManager.login(username, password)) {
          loginModal.style.display = "none";
          this.updateAuthUI();
          this.uiManager.showMessage("Login successful!", "success");
          loginForm.reset();
          document.getElementById("loginError").style.display = "none";

          // Show warning if using default password
          if (this.authManager.isDefaultPassword()) {
            this.uiManager.showMessage(
              "⚠️ Please change the default password!",
              "warning"
            );
          }
        } else {
          document.getElementById("loginError").textContent =
            "Invalid username or password";
          document.getElementById("loginError").style.display = "block";
        }
      });
    }

    // Change password button
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener("click", () => {
        changePasswordModal.style.display = "flex";
      });
    }

    // Close password modal
    if (closePasswordModal) {
      closePasswordModal.addEventListener("click", () => {
        changePasswordModal.style.display = "none";
      });
    }

    // Change password form submission
    if (changePasswordForm) {
      changePasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById("currentPassword")
          .value;
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword")
          .value;
        const errorDiv = document.getElementById("passwordError");

        if (newPassword !== confirmPassword) {
          errorDiv.textContent = "New passwords do not match";
          errorDiv.style.display = "block";
          return;
        }

        if (newPassword.length < 6) {
          errorDiv.textContent = "Password must be at least 6 characters";
          errorDiv.style.display = "block";
          return;
        }

        try {
          const success = await this.authManager.changePassword(
            currentPassword,
            newPassword
          );
          if (success) {
            changePasswordModal.style.display = "none";
            this.uiManager.showMessage(
              "Password changed in Firebase successfully! All devices will use the new password.",
              "success"
            );
            changePasswordForm.reset();
            errorDiv.style.display = "none";
          } else {
            errorDiv.textContent = "Current password is incorrect";
            errorDiv.style.display = "block";
          }
        } catch (error) {
          errorDiv.textContent = "Failed to change password. Please try again.";
          errorDiv.style.display = "block";
        }
      });
    }

    // Close modals when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target === loginModal) {
        loginModal.style.display = "none";
      }
      if (e.target === changePasswordModal) {
        changePasswordModal.style.display = "none";
      }
    });
  }

  /**
   * Update UI based on authentication status
   */
  updateAuthUI() {
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const configToggle = document.getElementById("configToggle");
    const userStatus = document.getElementById("userStatus");
    const configPanel = document.getElementById("configPanel");
    const searchNameGroup = document.getElementById("searchNameGroup");
    const searchNameInput = document.getElementById("searchName");

    if (this.authManager.isAdmin()) {
      // Admin is logged in
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
      configToggle.style.display = "inline-block";
      userStatus.textContent = "👤 Admin";
      userStatus.style.color = "#10b981";
      userStatus.style.fontWeight = "600";

      // Show delete buttons
      this.showDeleteButtons(true);

      // Show name search field for admin
      if (searchNameGroup) {
        searchNameGroup.style.display = "block";
      }
      if (searchNameInput) {
        searchNameInput.disabled = false;
      }
    } else {
      // Not logged in
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
      configToggle.style.display = "none";
      userStatus.textContent = "";
      configPanel.style.display = "none";

      // Hide delete buttons
      this.showDeleteButtons(false);

      // Hide name search field for non-admin
      if (searchNameGroup) {
        searchNameGroup.style.display = "none";
      }
      if (searchNameInput) {
        searchNameInput.disabled = true;
        searchNameInput.value = ""; // Clear any existing search
      }

      // Clear name filter when logging out
      this.currentSearchFilters.name = "";
    }
  }

  /**
   * Show or hide delete buttons based on admin status
   * @param {boolean} show - Whether to show delete buttons
   */
  showDeleteButtons(show) {
    const deleteButtons = document.querySelectorAll(".btn-delete");
    deleteButtons.forEach((btn) => {
      btn.style.display = show ? "block" : "none";
    });
  }

  /**
   * Handle image upload and trigger OCR to extract plate number
   * @param {Event} event - The file input change event
   */
  async handleImageUpload(event) {
    const fileInput = event.target;
    const plateNumberInput = document.getElementById("plateNumber");

    if (!fileInput.files || fileInput.files.length === 0) {
      return;
    }

    const file = fileInput.files[0];

    // Show processing message
    this.uiManager.showMessage(
      "Processing image with OCR... This may take a moment.",
      "info"
    );

    try {
      // Extract text from image using OCR
      const extractedText = await this.formHandler.extractTextFromImage(file);

      if (extractedText && extractedText.length > 0) {
        // Populate the plate number field with extracted text
        plateNumberInput.value = extractedText;

        // Focus on the field so user can easily verify/edit
        plateNumberInput.focus();
        plateNumberInput.select();

        this.uiManager.showMessage(
          `OCR detected: "${extractedText}" - Please verify and correct if needed.`,
          "warning"
        );
      } else {
        this.uiManager.showMessage(
          "Could not extract plate number. Please enter it manually.",
          "warning"
        );
        plateNumberInput.focus();
      }
    } catch (error) {
      console.error("OCR processing error:", error);
      this.uiManager.showMessage(
        "OCR failed. Please enter the plate number manually.",
        "warning"
      );
      plateNumberInput.focus();
    }
  }

  /**
   * Handle form submission
   * @param {Event} event - The form submit event
   */
  async handleFormSubmit(event) {
    // Show loading message
    this.uiManager.showMessage("📤 Uploading to Firebase...", "info");

    await this.formHandler.handleSubmit(
      event,
      async (record) => {
        // Success callback
        // Requirement 1.5: Display confirmation message
        const hasImage = record.imageData ? "with image" : "without image";
        this.uiManager.showMessage(
          `✅ Record successfully stored in Firebase! Plate: ${
            record.plateNumber
          } (${hasImage})`,
          "success"
        );
        this.uiManager.clearForm();

        // Clear any active search filters
        this.clearSearchInputs();

        // No need to reload - real-time listener will update automatically
      },
      (error) => {
        // Error callback
        this.uiManager.showMessage(
          `❌ Failed to store record: ${error.message}`,
          "error"
        );
      }
    );
  }

  /**
   * Handle search input with debouncing
   * @param {Event} event - The input event
   * @param {string} searchType - Type of search ('name' or 'plate')
   */
  handleSearchInput(event, searchType) {
    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Set new timer for debounced search
    this.searchDebounceTimer = setTimeout(() => {
      this.performSearch(searchType);
    }, this.debounceDelay);
  }

  /**
   * Perform search based on current input values
   * @param {string} searchType - Type of search that triggered this ('name' or 'plate')
   */
  async performSearch(searchType) {
    const searchNameInput = document.getElementById("searchName");
    const searchPlateInput = document.getElementById("searchPlate");

    const nameQuery = searchNameInput ? searchNameInput.value : "";
    const plateQuery = searchPlateInput ? searchPlateInput.value : "";

    // Non-admin users can only search by plate number
    const isAdmin = this.authManager.isAdmin();

    // Store current search filters
    this.currentSearchFilters.name = isAdmin ? nameQuery : "";
    this.currentSearchFilters.plate = plateQuery;

    // Get all records from storage
    let records = await this.storageManager.getAllRecords();

    // Apply filters
    records = this.applySearchFilters(records);

    // Display filtered results
    this.uiManager.renderRecords(records);
  }

  /**
   * Apply current search filters to records
   * @param {Array} records - Records to filter
   * @returns {Array} Filtered records
   */
  applySearchFilters(records) {
    let filtered = records;
    const isAdmin = this.authManager.isAdmin();

    // Apply name filter if name search has a value (admin only)
    if (
      this.currentSearchFilters.name &&
      this.currentSearchFilters.name.trim() !== ""
    ) {
      filtered = this.searchManager.searchByName(
        this.currentSearchFilters.name,
        filtered,
        isAdmin
      );
    }

    // Apply plate filter if plate search has a value (available to all users)
    if (
      this.currentSearchFilters.plate &&
      this.currentSearchFilters.plate.trim() !== ""
    ) {
      filtered = this.searchManager.searchByPlate(
        this.currentSearchFilters.plate,
        filtered
      );
    }

    return filtered;
  }

  /**
   * Handle record deletion
   * Requirement 6.4: Handle delete button clicks
   * @param {string} recordId - The ID of the record to delete
   */
  handleDelete(recordId) {
    // Show confirmation dialog
    // Requirement 6.1: Prompt user to confirm deletion
    this.uiManager.showDeleteConfirmation(recordId, async (id) => {
      // User confirmed deletion
      try {
        const success = await this.storageManager.deleteRecord(id);

        if (success) {
          this.uiManager.showMessage("Record deleted successfully.", "success");
          // No need to reload - real-time listener will update automatically
        } else {
          this.uiManager.showMessage(
            "Failed to delete record. Please try again.",
            "error"
          );
        }
      } catch (error) {
        console.error("Delete error:", error);
        this.uiManager.showMessage(
          "Failed to delete record. Please try again.",
          "error"
        );
      }
    });
  }

  /**
   * Set up real-time listener for Firebase data changes
   */
  setupRealtimeListener() {
    this.storageManager.onRecordsChange((records) => {
      console.log("Records updated from Firebase:", records.length);

      // Apply current search filters before displaying
      const filteredRecords = this.applySearchFilters(records);

      this.uiManager.renderRecords(filteredRecords);
      this.updateAuthUI(); // Update delete button visibility
    });
  }

  /**
   * Load all records from storage and display them
   * Requirement 5.2: Load previously stored records
   */
  async loadAndDisplayRecords() {
    try {
      const records = await this.storageManager.getAllRecords();
      this.uiManager.renderRecords(records);
    } catch (error) {
      console.error("Error loading records:", error);
      this.uiManager.showMessage("Failed to load records", "error");
    }
  }

  /**
   * Clear all search input fields
   */
  clearSearchInputs() {
    const searchNameInput = document.getElementById("searchName");
    const searchPlateInput = document.getElementById("searchPlate");

    if (searchNameInput) {
      searchNameInput.value = "";
    }

    if (searchPlateInput) {
      searchPlateInput.value = "";
    }

    // Clear stored filters
    this.currentSearchFilters.name = "";
    this.currentSearchFilters.plate = "";
  }
}

// Initialize the application when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new App(); // Make app globally accessible for UI privacy checks
  window.app.init();
});
