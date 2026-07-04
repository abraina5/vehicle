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

    if (this.storageManager.useLocalStorage) {
      this.uiManager.showMessage(
        "Running in local test mode using browser storage. Records are saved locally in this browser.",
        "info"
      );
    }

    // Check localStorage availability on init
    // Requirement 5.4: Display error if unavailable
    if (!this.storageManager.isStorageAvailable()) {
      this.uiManager.showMessage(
        "Storage is not available. Data cannot be saved.",
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

    // Set up authentication event listeners
    this.setupAuthListeners();
  }

  /**
   * Set up authentication-related event listeners
   */
  setupAuthListeners() {
    const userLoginBtn = document.getElementById("userLoginBtn");
    const adminLoginBtn = document.getElementById("adminLoginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginModal = document.getElementById("loginModal");
    const loginModalTitle = document.getElementById("loginModalTitle");
    const loginRole = document.getElementById("loginRole");
    const closeLoginModal = document.getElementById("closeLoginModal");
    const loginForm = document.getElementById("loginForm");
    const changePasswordBtn = document.getElementById("changePasswordBtn");
    const changePasswordModal = document.getElementById("changePasswordModal");
    const closePasswordModal = document.getElementById("closePasswordModal");
    const changePasswordForm = document.getElementById("changePasswordForm");

    const openLoginModal = (role) => {
      if (loginRole) {
        loginRole.value = role;
      }
      if (loginModalTitle) {
        loginModalTitle.textContent = role === "admin" ? "Admin Login" : "User Login";
      }
      const loginError = document.getElementById("loginError");
      if (loginError) {
        loginError.style.display = "none";
      }
      if (loginModal) {
        loginModal.style.display = "flex";
      }
    };

    if (userLoginBtn) {
      userLoginBtn.addEventListener("click", () => openLoginModal("user"));
    }

    if (adminLoginBtn) {
      adminLoginBtn.addEventListener("click", () => openLoginModal("admin"));
    }

    // Logout button
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        this.authManager.logout();
        this.updateAuthUI();
        this.loadAndDisplayRecords();
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
        const role = document.getElementById("loginRole").value || "user";

        if (this.authManager.login(username, password, role)) {
          loginModal.style.display = "none";
          this.updateAuthUI();
          this.loadAndDisplayRecords();
          this.uiManager.showMessage("Login successful!", "success");
          loginForm.reset();
          document.getElementById("loginError").style.display = "none";
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
      changePasswordForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const targetRole = document.getElementById("passwordTargetRole").value;
        const currentPassword = document.getElementById("currentPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const errorDiv = document.getElementById("passwordError");

        if (newPassword !== confirmPassword) {
          errorDiv.textContent = "New passwords do not match.";
          errorDiv.style.display = "block";
          return;
        }

        if (newPassword.length < 6) {
          errorDiv.textContent = "Password must be at least 6 characters.";
          errorDiv.style.display = "block";
          return;
        }

        if (
          this.authManager.changePassword(targetRole, currentPassword, newPassword)
        ) {
          changePasswordModal.style.display = "none";
          changePasswordForm.reset();
          errorDiv.style.display = "none";
          const accountLabel = targetRole === "admin" ? "Admin" : "Regular user";
          this.uiManager.showMessage(
            `${accountLabel} password changed successfully.`,
            "success"
          );
        } else {
          errorDiv.textContent = "Current admin password is incorrect.";
          errorDiv.style.display = "block";
        }
      });
    }

    // Close login modal when clicking outside
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
    const userLoginBtn = document.getElementById("userLoginBtn");
    const adminLoginBtn = document.getElementById("adminLoginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const configToggle = document.getElementById("configToggle");
    const userStatus = document.getElementById("userStatus");
    const configPanel = document.getElementById("configPanel");
    const searchNameGroup = document.getElementById("searchNameGroup");
    const searchNameInput = document.getElementById("searchName");

    if (this.authManager.isLoggedIn()) {
      const isAdmin = this.authManager.isAdmin();
      userLoginBtn.style.display = "none";
      adminLoginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
      configToggle.style.display = isAdmin ? "inline-block" : "none";
      userStatus.textContent = isAdmin ? "Admin" : "User";
      userStatus.style.color = "#10b981";
      userStatus.style.fontWeight = "600";

      if (searchNameGroup) {
        searchNameGroup.style.display = isAdmin ? "block" : "none";
      }
      if (searchNameInput) {
        searchNameInput.disabled = !isAdmin;
        if (!isAdmin) {
          searchNameInput.value = "";
          this.currentSearchFilters.name = "";
        }
      }
    } else {
      // Not logged in
      userLoginBtn.style.display = "inline-block";
      adminLoginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
      configToggle.style.display = "none";
      userStatus.textContent = "";
      configPanel.style.display = "none";

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
    const saveTarget = this.storageManager.localMode
      ? "local editable data"
      : "Firebase";
    this.uiManager.showMessage(`Saving to ${saveTarget}...`, "info");

    await this.formHandler.handleSubmit(
      event,
      async (record) => {
        // Success callback
        // Requirement 1.5: Display confirmation message
        const hasImage = record.imageData ? "with image" : "without image";
        this.uiManager.showMessage(
          `Record successfully stored in ${saveTarget}! Plate: ${
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
          `Failed to store record: ${error.message}`,
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

    // Logged-out users can only search by plate number
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
   * Handle send message button clicks
   * @param {string} phone - The owner's phone number
   * @param {string} plateNumber - The vehicle plate number
   */
  /**
   * Set up real-time listener for storage data changes
   */
  setupRealtimeListener() {
    this.storageManager.onRecordsChange((records) => {
      console.log("Records updated from storage:", records.length);

      // Apply current search filters before displaying
      const filteredRecords = this.applySearchFilters(records);

      this.uiManager.renderRecords(filteredRecords);
      this.updateAuthUI();
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

