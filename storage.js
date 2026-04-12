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
  }

  /**
   * Check if Firebase is available
   * Requirement 5.4: Display error when storage unavailable
   * @returns {boolean} True if Firebase is available
   */
  isStorageAvailable() {
    try {
      if (this.localMode) {
        localStorage.setItem("__vehicle_storage_test__", "1");
        localStorage.removeItem("__vehicle_storage_test__");
        return true;
      }

      return typeof firebase !== "undefined" && firebase.database !== undefined;
    } catch (e) {
      console.error("Firebase not available:", e);
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
   * Save a license plate record to Firebase
   * Requirement 1.2: Store record in Firebase Database
   * Requirement 5.1: Persist data in Firebase
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

      // Prepare record for Firebase (with compressed base64 image)
      const firebaseRecord = {
        id: record.id,
        plateNumber: record.plateNumber,
        ownerName: record.ownerName,
        phoneNumber: record.phoneNumber,
        imageData: imageData, // Store base64 directly in database
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

      // Save to Firebase Realtime Database
      await this.recordsRef.child(record.id).set(firebaseRecord);
      console.log("Record saved to Firebase with base64 image:", record.id);
      return true;
    } catch (e) {
      console.error("Error saving record to Firebase:", e);
      throw new Error("Failed to save record. Please try again.");
    }
  }

  /**
   * Retrieve all stored records from Firebase
   * Requirement 5.2: Load previously stored records
   * @returns {Promise<Array>} Promise that resolves to array of record objects
   */
  async getAllRecords() {
    try {
      if (this.localMode) {
        return this.getSortedLocalRecords();
      }

      const snapshot = await this.recordsRef.once("value");
      const records = [];

      snapshot.forEach((childSnapshot) => {
        const record = childSnapshot.val();
        // imageData is already in base64 format, no conversion needed
        records.push(record);
      });

      // Sort by creation date (newest first)
      records.sort((a, b) => b.createdAt - a.createdAt);

      return records;
    } catch (e) {
      console.error("Error retrieving records from Firebase:", e);
      return [];
    }
  }

  /**
   * Listen for real-time updates to records
   * @param {Function} callback - Callback function to call when data changes
   */
  onRecordsChange(callback) {
    if (this.localMode) {
      this.listeners.push(callback);
      callback(this.getSortedLocalRecords());
      return;
    }

    const listener = this.recordsRef.on("value", (snapshot) => {
      const records = [];
      snapshot.forEach((childSnapshot) => {
        const record = childSnapshot.val();
        // imageData is already in base64 format, no conversion needed
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
    if (this.recordsRef) {
      this.recordsRef.off("value");
    }
    this.listeners = [];
  }

  /**
   * Delete a record by ID from Firebase
   * Requirement 6.2: Remove record from Firebase
   * @param {string} id - The ID of the record to delete
   * @returns {Promise<boolean>} Promise that resolves to true if deletion was successful
   */
  async deleteRecord(id) {
    try {
      if (this.localMode) {
        const records = this.getLocalRecords().filter((record) => record.id !== id);
        this.setLocalRecords(records);
        this.notifyLocalListeners();
        console.log("Record deleted from local editable store:", id);
        return true;
      }

      // Delete record from Database (image is stored as base64 in the record)
      await this.recordsRef.child(id).remove();
      console.log("Record deleted from Firebase:", id);
      return true;
    } catch (e) {
      console.error("Error deleting record from Firebase:", e);
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
