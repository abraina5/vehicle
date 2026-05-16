/**
 * Authentication Manager - Handles admin login and role-based access control
 */
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.sessionKey = "userSession";
    this.configRef = database.ref("config/adminCredentials");

    // Default admin credentials (will be saved to Firebase on first use)
    this.adminCredentials = {
      username: "admin",
      password: this.hashPassword("admin123"), // Default password
    };

    // Load credentials from Firebase
    this.loadCredentialsFromFirebase();

    // Check for existing session
    this.loadSession();
  }

  /**
   * Load admin credentials from Firebase
   */
  async loadCredentialsFromFirebase() {
    try {
      const snapshot = await this.configRef.once("value");
      if (snapshot.exists()) {
        this.adminCredentials = snapshot.val();
        console.log("Admin credentials loaded from Firebase");
      } else {
        // First time setup - save default credentials to Firebase
        await this.saveCredentialsToFirebase();
        console.log("Default admin credentials saved to Firebase");
      }
    } catch (error) {
      console.error("Error loading credentials from Firebase:", error);
    }
  }

  /**
   * Save admin credentials to Firebase
   */
  async saveCredentialsToFirebase() {
    try {
      await this.configRef.set(this.adminCredentials);
      console.log("Admin credentials saved to Firebase");
    } catch (error) {
      console.error("Error saving credentials to Firebase:", error);
      throw error;
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
