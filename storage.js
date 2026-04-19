/**
 * StorageManager - Handles all data persistence operations with Firebase
 * Uses base64 encoding for images (no Firebase Storage needed)
 * Requirements: 1.2, 5.1, 5.2, 5.3, 5.4, 6.2
 */
class StorageManager {
  constructor() {
    this.listeners = [];
    this.maxImageSize = 400 * 1024; // 400 KB recommended for base64
    this.localMode = Boolean(
      window.LOCAL_APP_DATA && window.LOCAL_APP_DATA.useLocalData
    );
    this.localRecordsKey = "vehicleApp.localRecords";
    this.recordsRef =
      !this.localMode && typeof database !== "undefined"
        ? database.ref("records")
        : null;

    if (this.localMode) {
      this.initializeLocalRecords();
    }
    this.localStorageKey = "vehicle_records";
    this.useLocalStorage = this.isLocalModeRequested() || !this.isFirebaseAvailable();

    if (!this.useLocalStorage) {
      this.recordsRef = database.ref("records");
    } else {
      console.log("Firebase unavailable or local mode requested; using localStorage fallback for records.");
    }
  }

  /**
   * Check whether local mode is requested via URL parameter
   * @returns {boolean}
   */
  isLocalModeRequested() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("local") === "true";
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if Firebase is available
   * Requirement 5.4: Display error when storage unavailable
   * @returns {boolean} True if Firebase is available
   */
  isFirebaseAvailable() {
    try {
      if (this.localMode) {
        localStorage.setItem("__vehicle_storage_test__", "1");
        localStorage.removeItem("__vehicle_storage_test__");
        return true;
      }

      return typeof firebase !== "undefined" && firebase.database !== undefined;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if storage is available for the app
   * @returns {boolean} True if Firebase or localStorage is available
   */
  isStorageAvailable() {
    try {
      if (this.useLocalStorage) {
        const testKey = "__vehicle_storage_test__";
        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);
        return true;
      }
      return this.isFirebaseAvailable();
    } catch (e) {
      console.error("Storage not available:", e);
      return false;
    }
  }

  /**
   * Compress and optimize image for base64 storage
   * @param {string} imageData - Base64 image data
   * @returns {Promise<string>} Promise that resolves to compressed base64 data
   */
  async compressImage(imageData) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions (max 800px width)
        const maxWidth = 800;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.7 quality
        const compressedData = canvas.toDataURL("image/jpeg", 0.7);
        resolve(compressedData);
      };
      img.onerror = reject;
      img.src = imageData;
    });
  }

  /**
   * Save a license plate record to Firebase or localStorage
   * Requirement 1.2: Store record in database
   * Requirement 5.1: Persist data in Firebase or local mode
   * @param {Object} record - The record to save
   * @returns {Promise<boolean>} Promise that resolves to true if save was successful
   */
  async saveRecord(record) {
    try {
      // Compress image if present
      let imageData = null;
      if (record.imageData) {
        console.log("Compressing image...");
        imageData = await this.compressImage(record.imageData);
        console.log("Image compressed successfully");
      }

      const savedRecord = {
        id: record.id,
        plateNumber: record.plateNumber,
        ownerName: record.ownerName,
        phoneNumber: record.phoneNumber,
        imageData: imageData,
        createdAt: record.createdAt,
      };

      if (this.localMode) {
        const records = this.getLocalRecords();
        const existingIndex = records.findIndex((item) => item.id === record.id);

        if (existingIndex >= 0) {
          records[existingIndex] = firebaseRecord;
        } else {
          records.push(firebaseRecord);
        }

        this.setLocalRecords(records);
        this.notifyLocalListeners();
        console.log("Record saved to local editable store:", record.id);
        return true;
      }

      if (this.useLocalStorage) {
        const records = this.loadLocalRecords();
        const existingIndex = records.findIndex((item) => item.id === record.id);
        if (existingIndex >= 0) {
          records[existingIndex] = savedRecord;
        } else {
          records.push(savedRecord);
        }
        this.saveLocalRecords(records);
        this.notifyRecordsChange(records);
        console.log("Record saved to localStorage:", record.id);
        return true;
      }

      await this.recordsRef.child(record.id).set(savedRecord);
      console.log("Record saved to Firebase with base64 image:", record.id);
      return true;
    } catch (e) {
      console.error("Error saving record:", e);
      throw new Error("Failed to save record. Please try again.");
    }
  }

  /**
   * Load records from browser localStorage
   * @returns {Array} Parsed list of stored records
   */
  loadLocalRecords() {
    try {
      const raw = window.localStorage.getItem(this.localStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Error loading records from localStorage:", e);
      return [];
    }
  }

  /**
   * Write records to browser localStorage
   * @param {Array} records - The records to save
   */
  saveLocalRecords(records) {
    try {
      window.localStorage.setItem(this.localStorageKey, JSON.stringify(records));
    } catch (e) {
      console.error("Error saving records to localStorage:", e);
    }
  }

  /**
   * Notify listeners when localStorage records change
   * @param {Array} records - Current record list
   */
  notifyRecordsChange(records) {
    this.listeners.forEach((callback) => {
      try {
        callback(records);
      } catch (e) {
        console.error("Error notifying record listener:", e);
      }
    });
  }

  /**
   * Retrieve all stored records from Firebase or localStorage
   * Requirement 5.2: Load previously stored records
   * @returns {Promise<Array>} Promise that resolves to array of record objects
   */
  async getAllRecords() {
    try {
      const snapshot = await this.recordsRef.once("value");
      const records = [];

      snapshot.forEach((childSnapshot) => {
        const record = childSnapshot.val();
        records.push(record);
      });

      records.sort((a, b) => b.createdAt - a.createdAt);
      return records;
    } catch (e) {
      console.error("Error retrieving records:", e);
      return [];
    }
  }

  /**
   * Listen for real-time updates to records
   * @param {Function} callback - Callback function to call when data changes
   */
  onRecordsChange(callback) {
    const listener = this.recordsRef.on("value", (snapshot) => {
      const records = [];
      snapshot.forEach((childSnapshot) => {
        const record = childSnapshot.val();
        records.push(record);
      });
      records.sort((a, b) => b.createdAt - a.createdAt);
      callback(records);
    });

    this.listeners.push(listener);
  }

  /**
   * Stop listening for real-time updates
   */
  offRecordsChange() {
    this.recordsRef.off("value");
    this.listeners = [];
  }

  /**
   * Delete a record by ID from Firebase or localStorage
   * Requirement 6.2: Remove record from Firebase
   * @param {string} id - The ID of the record to delete
   * @returns {Promise<boolean>} Promise that resolves to true if deletion was successful
   */
  async deleteRecord(id) {
    try {
      // Delete record from Database (image is stored as base64 in the record)
      await this.recordsRef.child(id).remove();
      console.log("Record deleted from Firebase:", id);
      return true;
    } catch (e) {
      console.error("Error deleting record:", e);
      return false;
    }
  }

  getLocalRecords() {
    const stored = localStorage.getItem(this.localRecordsKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Failed to parse local records:", error);
      }
    }

    const seedRecords =
      window.LOCAL_APP_DATA && Array.isArray(window.LOCAL_APP_DATA.records)
        ? window.LOCAL_APP_DATA.records
        : [];

    return [...seedRecords];
  }

  setLocalRecords(records) {
    localStorage.setItem(this.localRecordsKey, JSON.stringify(records));
  }

  getSortedLocalRecords() {
    const records = this.getLocalRecords();
    records.sort((a, b) => b.createdAt - a.createdAt);
    return records;
  }

  notifyLocalListeners() {
    const records = this.getSortedLocalRecords();
    this.listeners.forEach((callback) => callback(records));
  }

  initializeLocalRecords() {
    const shouldReset =
      window.LOCAL_APP_DATA && window.LOCAL_APP_DATA.resetOnLoad;
    const hasStoredRecords = localStorage.getItem(this.localRecordsKey) !== null;

    if (!hasStoredRecords || shouldReset) {
      const seedRecords =
        window.LOCAL_APP_DATA && Array.isArray(window.LOCAL_APP_DATA.records)
          ? window.LOCAL_APP_DATA.records
          : [];
      this.setLocalRecords(seedRecords);
    }
  }
}
