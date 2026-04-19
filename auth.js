/**
 * Authentication Manager - Handles admin login and role-based access control
 */
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.sessionKey = "userSession";
    this.localCredentialsKey = "vehicle_admin_credentials";
    this.useLocalStorage = this.isLocalModeRequested() || !this.isFirebaseAvailable();

    if (!this.useLocalStorage) {
      this.localMode = Boolean(
      window.LOCAL_APP_DATA && window.LOCAL_APP_DATA.useLocalData
    );
    this.localCredentialsKey = "vehicleApp.adminCredentials";
    this.configRef =
      !this.localMode && typeof database !== "undefined"
        ? database.ref("config/adminCredentials")
        : null;
    }

    // Default admin credentials (will be saved on first use)
    this.adminCredentials = {
      username: "admin",
      password: this.hashPassword("admin123"),
    };

    if (this.localMode) {
      this.initializeLocalCredentials();
    }

    // Load credentials from storage
    this.loadCredentialsFromFirebase();

    // Check for existing session
    this.loadSession();
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
   * Check whether Firebase is available
   * @returns {boolean}
   */
  isFirebaseAvailable() {
    try {
      return typeof firebase !== "undefined" && firebase.database !== undefined;
    } catch (e) {
      return false;
    }
  }

  /**
   * Load admin credentials from Firebase or localStorage
   */
  async loadCredentialsFromFirebase() {
    if (this.localMode) {
      const stored = localStorage.getItem(this.localCredentialsKey);
      if (stored) {
        try {
          this.adminCredentials = JSON.parse(stored);
          return;
        } catch (error) {
          console.error("Error loading local admin credentials:", error);
        }
      }

      const seedCredentials =
        window.LOCAL_APP_DATA &&
        window.LOCAL_APP_DATA.config &&
        window.LOCAL_APP_DATA.config.adminCredentials;

      if (seedCredentials) {
        this.adminCredentials = seedCredentials;
      }

      localStorage.setItem(
        this.localCredentialsKey,
        JSON.stringify(this.adminCredentials)
      );
      return;
    }

    try {
      if (this.useLocalStorage) {
        const raw = window.localStorage.getItem(this.localCredentialsKey);
        if (raw) {
          this.adminCredentials = JSON.parse(raw);
          console.log("Admin credentials loaded from localStorage");
        } else {
          await this.saveCredentialsToFirebase();
          console.log("Default admin credentials saved to localStorage");
        }
        return;
      }

      const snapshot = await this.configRef.once("value");
      if (snapshot.exists()) {
        this.adminCredentials = snapshot.val();
        console.log("Admin credentials loaded from Firebase");
      } else {
        await this.saveCredentialsToFirebase();
        console.log("Default admin credentials saved to Firebase");
      }
    } catch (error) {
      console.error("Error loading credentials:", error);
    }
  }

  /**
   * Save admin credentials to Firebase or localStorage
   */
  async saveCredentialsToFirebase() {
    if (this.localMode) {
      localStorage.setItem(
        this.localCredentialsKey,
        JSON.stringify(this.adminCredentials)
      );
      return;
    }

    try {
      if (this.useLocalStorage) {
        window.localStorage.setItem(this.localCredentialsKey, JSON.stringify(this.adminCredentials));
        console.log("Admin credentials saved to localStorage");
        return;
      }

      await this.configRef.set(this.adminCredentials);
      console.log("Admin credentials saved to Firebase");
    } catch (error) {
      console.error("Error saving credentials:", error);
      throw error;
    }
  }

  initializeLocalCredentials() {
    const shouldReset =
      window.LOCAL_APP_DATA && window.LOCAL_APP_DATA.resetOnLoad;
    const hasStoredCredentials =
      localStorage.getItem(this.localCredentialsKey) !== null;

    if (!hasStoredCredentials || shouldReset) {
      const seedCredentials =
        window.LOCAL_APP_DATA &&
        window.LOCAL_APP_DATA.config &&
        window.LOCAL_APP_DATA.config.adminCredentials;

      const credentialsToStore = seedCredentials || this.adminCredentials;
      localStorage.setItem(
        this.localCredentialsKey,
        JSON.stringify(credentialsToStore)
      );
    }
  }

  /**
   * Simple hash function for password (client-side only)
   * Note: This is basic security. For production, use proper backend authentication
   * @param {string} password - Password to hash
   * @returns {string} Hashed password
   */
  hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Authenticate user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {boolean} True if authentication successful
   */
  login(username, password) {
    const hashedPassword = this.hashPassword(password);

    if (
      username === this.adminCredentials.username &&
      hashedPassword === this.adminCredentials.password
    ) {
      this.currentUser = {
        username: username,
        role: "admin",
        loginTime: Date.now(),
      };
      this.saveSession();
      return true;
    }

    return false;
  }

  /**
   * Log out current user
   */
  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.sessionKey);
  }

  /**
   * Check if user is logged in as admin
   * @returns {boolean} True if admin is logged in
   */
  isAdmin() {
    return this.currentUser && this.currentUser.role === "admin";
  }

  /**
   * Get current user
   * @returns {Object|null} Current user object or null
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Save session to localStorage (persists across browser refreshes)
   */
  saveSession() {
    if (this.currentUser) {
      localStorage.setItem(this.sessionKey, JSON.stringify(this.currentUser));
    }
  }

  /**
   * Load session from localStorage
   */
  loadSession() {
    const session = localStorage.getItem(this.sessionKey);
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
      } catch (e) {
        console.error("Failed to load session:", e);
        this.currentUser = null;
      }
    }
  }

  /**
   * Change admin password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Promise that resolves to true if password changed successfully
   */
  async changePassword(currentPassword, newPassword) {
    if (!this.isAdmin()) {
      return false;
    }

    const hashedCurrent = this.hashPassword(currentPassword);
    if (hashedCurrent !== this.adminCredentials.password) {
      return false;
    }

    this.adminCredentials.password = this.hashPassword(newPassword);
    await this.saveCredentialsToFirebase();
    return true;
  }

  /**
   * Check if this is first time setup (using default password)
   * @returns {boolean} True if using default password
   */
  isDefaultPassword() {
    return this.adminCredentials.password === this.hashPassword("admin123");
  }
}
