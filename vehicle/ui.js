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
    this.form = document.getElementById("addRecordForm");
    this.recordCounter = document.getElementById("recordCounter");

    this.setupModalHandlers();
  }

  /**
   * Set up event handlers for the image modal
   */
  setupModalHandlers() {
    const closeButton = this.imageModal.querySelector(".modal-close");
    if (closeButton) {
      closeButton.addEventListener("click", () => this.closeImageModal());
    }

    this.imageModal.addEventListener("click", (e) => {
      if (e.target === this.imageModal) {
        this.closeImageModal();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.imageModal.style.display === "flex") {
        this.closeImageModal();
      }
    });
  }

  /**
   * Render license plate records to the DOM
   * Requirement 4.1: Display license plate image for each record
   * Requirement 4.3: Display phone number for logged-in users
   * Requirement 2.4, 3.4: Display "no results found" message when appropriate
   * @param {Array} records - Array of license plate records to display
   */
  renderRecords(records) {
    this.recordsContainer.innerHTML = "";

    const count = records ? records.length : 0;
    if (this.recordCounter) {
      this.recordCounter.textContent = `(${count})`;
    }

    if (!records || records.length === 0) {
      this.noResultsMessage.style.display = "block";
      return;
    }

    this.noResultsMessage.style.display = "none";

    const fragment = document.createDocumentFragment();

    records.forEach((record) => {
      const card = this.createRecordCard(record);
      fragment.appendChild(card);
    });

    this.recordsContainer.appendChild(fragment);
  }

  /**
   * Check if current user is admin
   * @returns {boolean} True if admin is logged in
   */
  isAdmin() {
    if (typeof window.app !== "undefined" && window.app.authManager) {
      return window.app.authManager.isAdmin();
    }
    return false;
  }

  isLoggedIn() {
    if (typeof window.app !== "undefined" && window.app.authManager) {
      return window.app.authManager.isLoggedIn();
    }
    return false;
  }

  /**
   * Create a record card HTML element
   * Requirement 4.1: Show license plate image
   * Requirement 4.2: Display image in larger view on click
   * Requirement 4.3: Display phone number for logged-in users
   * @param {Object} record - The license plate record
   * @returns {HTMLElement} The card element
   */
  createRecordCard(record) {
    const card = document.createElement("div");
    card.className = "record-card";
    card.setAttribute("data-id", record.id);

    const isLoggedIn = this.isLoggedIn();
    const phoneHtml = isLoggedIn
      ? `
        <div class="record-field">
          <span class="record-label">Phone:</span>
          <span class="record-value">${this.escapeHtml(record.phoneNumber)}</span>
        </div>
      `
      : "";

    const imageHtml = record.imageData
      ? `
      <div class="record-image-container">
        <img
          src="${record.imageData}"
          alt="License plate ${this.escapeHtml(record.plateNumber)}"
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

    card.innerHTML = `
      ${imageHtml}
      <div class="record-details">
        <div class="record-field">
          <span class="record-label">Plate Number:</span>
          <span class="record-value">${this.escapeHtml(record.plateNumber)}</span>
        </div>
        ${phoneHtml}
      </div>
    `;

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
    this.messageContainer.innerHTML = "";

    const messageElement = document.createElement("div");
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;

    this.messageContainer.appendChild(messageElement);

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
    document.body.style.overflow = "hidden";
  }

  /**
   * Close the image modal
   */
  closeImageModal() {
    this.imageModal.style.display = "none";
    this.modalImage.src = "";
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

}
