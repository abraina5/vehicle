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
      fragment.appendChild(this.createRecordCard(record));
    });

    this.recordsContainer.appendChild(fragment);
  }

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

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

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

  showImageModal(imageUrl) {
    this.modalImage.src = imageUrl;
    this.imageModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  closeImageModal() {
    this.imageModal.style.display = "none";
    this.modalImage.src = "";
    document.body.style.overflow = "";
  }

  clearForm(form = null) {
    const targetForm = form || this.form;
    if (targetForm) {
      targetForm.reset();
    }
  }

}
