/**
 * UIManager - Handles all DOM manipulation and rendering
 * Requirements: 1.5, 2.4, 3.4, 4.1, 4.2, 4.3, 6.1, 6.3
 */
class UIManager {
  constructor() {
    this.recordsContainer = document.getElementById("recordsContainer");
    this.noResultsMessage = document.getElementById("noResultsMessage");
    this.messageContainer = document.getElementById("messageContainer");
    this.imageModal = document.getElementById("imageModal");
    this.modalImage = document.getElementById("modalImage");
    this.messageModal = document.getElementById("messageModal");
    this.messageModalPlate = document.getElementById("messageModalPlate");
    this.messageBody = document.getElementById("messageBody");
    this.sendMessageBtn = document.getElementById("sendMessageBtn");
    this.cancelMessageBtn = document.getElementById("cancelMessageBtn");
    this.closeMessageModalBtn = document.getElementById("closeMessageModal");
    this.messagePhone = null;
    this.isSendingMessage = false;
    this.form = document.getElementById("addRecordForm");
    this.recordCounter = document.getElementById("recordCounter");

    // Set up modal close handlers
    this.setupModalHandlers();
    this.setupMessageModalHandlers();
  }

  /**
   * Set up event handlers for the image modal
   */
  setupModalHandlers() {
    // Close image modal when clicking the close button
    const closeButton = this.imageModal.querySelector(".modal-close");
    if (closeButton) {
      closeButton.addEventListener("click", () => this.closeImageModal());
    }

    // Close image modal when clicking outside the image
    this.imageModal.addEventListener("click", (e) => {
      if (e.target === this.imageModal) {
        this.closeImageModal();
      }
    });

    // Close modal on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (this.imageModal.style.display === "flex") {
          this.closeImageModal();
        }
        if (this.messageModal && this.messageModal.style.display === "flex") {
          this.closeMessageComposer();
        }
      }
    });
  }

  setupMessageModalHandlers() {
    if (this.closeMessageModalBtn) {
      this.closeMessageModalBtn.addEventListener("click", () =>
        this.closeMessageComposer()
      );
    }

    if (this.cancelMessageBtn) {
      this.cancelMessageBtn.addEventListener("click", () =>
        this.closeMessageComposer()
      );
    }

    if (this.sendMessageBtn) {
      this.sendMessageBtn.addEventListener("click", async () => {
        const messageText = this.messageBody.value.trim();
        if (!messageText) {
          this.showMessage("Please type a message before continuing.", "error");
          return;
        }

        const sanitizedPhone = (this.messagePhone || "").replace(/[^\d\+]/g, "");
        }

        const smsUrl = `sms:${sanitizedPhone}?body=${encodeURIComponent(
          messageText
        )}`;
        this.closeMessageComposer();
        window.location.href = smsUrl;
      });
    }

    if (this.messageModal) {
      this.messageModal.addEventListener("click", (e) => {
        if (e.target === this.messageModal) {
          this.closeMessageComposer();
        }
      });
    }
  }

  /**
   * Open the message composer modal for a specific record
   * @param {string} plateNumber - The vehicle plate number
   */
  openMessageComposer(plateNumber, phoneNumber) {
    if (!this.messageModal) return;

    this.messagePhone = phoneNumber || null;

    if (this.messageModalPlate) {
      this.messageModalPlate.textContent = plateNumber || "the vehicle";
    }

    if (this.messageBody) {
      this.messageBody.value = "";
      this.messageBody.placeholder = "Type your own message here...";
      this.messageBody.disabled = false;
      this.messageBody.focus();
    }

    this.setMessageSendingState(false);
    this.messageModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  /**
   * Close the message composer modal
   */
  closeMessageComposer() {
    if (!this.messageModal) return;
    this.setMessageSendingState(false);
    this.messageModal.style.display = "none";
    document.body.style.overflow = "";
  }

  setMessageSendingState(isSending) {
    this.isSendingMessage = isSending;

    if (this.sendMessageBtn) {
      this.sendMessageBtn.disabled = isSending;
      this.sendMessageBtn.textContent = isSending ? "Sending..." : "Send";
    }

    if (this.cancelMessageBtn) {
      this.cancelMessageBtn.disabled = isSending;
    }

    if (this.closeMessageModalBtn) {
      this.closeMessageModalBtn.disabled = isSending;
    }

    if (this.messageBody) {
      this.messageBody.disabled = isSending;
    }
  }

  async sendMessage(messageText) {
    const endpoint = window.messageServiceConfig?.endpoint;
    const phoneNumber = (this.messagePhone || "").trim();
    const plateNumber = this.messageModalPlate?.textContent?.trim() || "Unknown plate";

    if (!endpoint) {
      throw new Error("Message service is not configured.");
    }

    if (!phoneNumber) {
      throw new Error("No phone number is available for this vehicle.");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber,
        plateNumber,
        message: messageText,
      }),
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.error || "The message service rejected the request.");
    }

    return payload;
  }

  /**
   * Render license plate records to the DOM
   * Requirement 4.1: Display license plate image for each record
   * Requirement 4.3: Display owner name and phone number alongside image
   * Requirement 2.4, 3.4: Display "no results found" message when appropriate
   * @param {Array} records - Array of license plate records to display
   */
  renderRecords(records) {
    // Clear existing content
    this.recordsContainer.innerHTML = "";

    // Update record counter
    const count = records ? records.length : 0;
    if (this.recordCounter) {
      this.recordCounter.textContent = `(${count})`;
    }

    // Handle empty results
    if (!records || records.length === 0) {
      this.noResultsMessage.style.display = "block";
      return;
    }

    // Hide no results message
    this.noResultsMessage.style.display = "none";

    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();

    // Create a card for each record
    records.forEach((record) => {
      const card = this.createRecordCard(record);
      fragment.appendChild(card);
    });

    // Append all cards at once
    this.recordsContainer.appendChild(fragment);
  }

  /**
   * Redact sensitive information for non-admin users
   * @param {string} text - Text to redact
   * @param {string} type - Type of data ('name' or 'phone')
   * @returns {string} Redacted text
   */
  redactSensitiveInfo(text, type) {
    if (!text) return "";

    if (type === "name") {
      // Show first letter + asterisks (e.g., "John Doe" → "J*** D**")
      return text
        .split(" ")
        .map((word) => {
          if (word.length === 0) return "";
          return word[0] + "*".repeat(Math.min(word.length - 1, 3));
        })
        .join(" ");
    } else if (type === "phone") {
      // Show last 4 digits only (e.g., "555-1234" → "***-1234")
      const cleaned = text.replace(/\D/g, ""); // Remove non-digits
      if (cleaned.length <= 4) return "****";
      return "*".repeat(cleaned.length - 4) + cleaned.slice(-4);
    }
    return text;
  }

  /**
   * Check if current user is admin
   * @returns {boolean} True if admin is logged in
   */
  isAdmin() {
    // Check if authManager exists in global scope (from app.js)
    if (typeof window.app !== "undefined" && window.app.authManager) {
      return window.app.authManager.isAdmin();
    }
    return false;
  }

  /**
   * Create a record card HTML element
   * Requirement 4.1: Show license plate image
   * Requirement 4.2: Display image in larger view on click
   * Requirement 4.3: Display owner name and phone number (admin only)
   * Requirement 6.1: Include delete button
   * @param {Object} record - The license plate record
   * @returns {HTMLElement} The card element
   */
  createRecordCard(record) {
    const card = document.createElement("div");
    card.className = "record-card";
    card.setAttribute("data-id", record.id);

    // Check if user is admin
    const isAdmin = this.isAdmin();

    // Redact sensitive info for non-admin users
    const displayOwnerName = isAdmin
      ? this.escapeHtml(record.ownerName)
      : this.redactSensitiveInfo(record.ownerName, "name");

    const displayPhoneNumber = isAdmin
      ? this.escapeHtml(record.phoneNumber)
      : this.redactSensitiveInfo(record.phoneNumber, "phone");

    // Create image container HTML (only if image exists)
    const imageHtml = record.imageData
      ? `
      <div class="record-image-container">
        <img 
          src="${record.imageData}" 
          alt="License plate ${record.plateNumber}"
          class="record-image"
          data-image="${record.imageData}">
      </div>
    `
      : `
      <div class="record-image-container no-image">
        <div class="no-image-placeholder">
          <span>No Image</span>
        </div>
      </div>
    `;

    // Add privacy indicator for non-admin users
    const privacyNote = !isAdmin
      ? '<div class="privacy-note">🔒 Login as admin to view full details</div>'
      : "";

    // Create card HTML structure
    card.innerHTML = `
      ${imageHtml}
      <div class="record-details">
        <div class="record-field">
          <span class="record-label">Plate Number:</span>
          <span class="record-value">${this.escapeHtml(
            record.plateNumber
          )}</span>
        </div>
        <div class="record-field">
          <span class="record-label">Owner:</span>
          <span class="record-value ${
            !isAdmin ? "redacted" : ""
          }">${displayOwnerName}</span>
        </div>
        <div class="record-field">
          <span class="record-label">Phone:</span>
          <span class="record-value ${
            !isAdmin ? "redacted" : ""
          }">${displayPhoneNumber}</span>
        </div>
        ${privacyNote}
      </div>
      <div class="record-actions">
        <button
          class="btn-message"
          type="button"
          data-phone="${this.escapeHtml(record.phoneNumber)}"
          data-plate="${this.escapeHtml(record.plateNumber)}"
          aria-label="Send message to owner of ${this.escapeHtml(record.plateNumber)}"
        >
          SEND MESSAGE
        </button>
        <button class="btn-delete" data-id="${
          record.id
        }" aria-label="Delete record for ${this.escapeHtml(record.plateNumber)}">
          Delete
        </button>
      </div>
    `;

    // Add click handler for image to show modal (only if image exists)
    // Requirement 4.2: Display image in larger view when clicked
    if (record.imageData) {
      const image = card.querySelector(".record-image");
      image.addEventListener("click", () => {
        this.showImageModal(record.imageData);
      });
    }

    return card;
  }

  /**
   * Escape HTML to prevent XSS attacks
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Display success or error messages to the user
   * Requirement 1.5: Display confirmation message
   * @param {string} message - The message to display
   * @param {string} type - Message type ('success' or 'error')
   */
  showMessage(message, type = "success") {
    // Clear any existing messages
    this.messageContainer.innerHTML = "";

    // Create message element
    const messageElement = document.createElement("div");
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;

    // Add to container
    this.messageContainer.appendChild(messageElement);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageElement.classList.add("message-fade-out");
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.remove();
        }
      }, 300);
    }, 5000);
  }

  /**
   * Display full-size image in a modal
   * Requirement 4.2: Display image in larger view
   * @param {string} imageUrl - The base64 image data URL
   */
  showImageModal(imageUrl) {
    this.modalImage.src = imageUrl;
    this.imageModal.style.display = "flex";
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
  }

  /**
   * Close the image modal
   */
  closeImageModal() {
    this.imageModal.style.display = "none";
    this.modalImage.src = "";
    // Restore body scroll
    document.body.style.overflow = "";
  }

  /**
   * Clear the add record form
   * @param {HTMLFormElement} form - The form to clear (optional, uses default if not provided)
   */
  clearForm(form = null) {
    const targetForm = form || this.form;
    if (targetForm) {
      targetForm.reset();
    }
  }

  /**
   * Show confirmation dialog for record deletion
   * Requirement 6.1: Prompt user to confirm deletion
   * Requirement 6.3: Update displayed results after deletion
   * @param {string} id - The ID of the record to delete
   * @param {Function} callback - Callback function to execute if user confirms
   */
  showDeleteConfirmation(id, callback) {
    // Use native browser confirmation dialog
    const confirmed = confirm(
      "Are you sure you want to delete this record? This action cannot be undone."
    );

    if (confirmed && callback) {
      callback(id);
    }
  }
}
