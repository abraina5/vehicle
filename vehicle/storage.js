/**
 * StorageManager - Handles all data persistence operations with Firebase
 * Uses base64 encoding for images (no Firebase Storage needed)
 * Requirements: 1.2, 5.1, 5.2, 5.3, 5.4, 6.2
 */
class StorageManager {
  constructor() {
    this.recordsRef = database.ref("records");
    this.listeners = [];
    this.maxImageSize = 400 * 1024; // 400 KB recommended for base64
  }

  /**
   * Check if Firebase is available
   * Requirement 5.4: Display error when storage unavailable
   * @returns {boolean} True if Firebase is available
   */
  isStorageAvailable() {
    try {
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
    this.recordsRef.off("value");
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
      // Delete record from Database (image is stored as base64 in the record)
      await this.recordsRef.child(id).remove();
      console.log("Record deleted from Firebase:", id);
      return true;
    } catch (e) {
      console.error("Error deleting record from Firebase:", e);
      return false;
    }
  }
}
