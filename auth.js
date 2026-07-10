/**
 * Authentication Manager - Handles regular and admin login/session state
 */
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.sessionKey = "userSession";
    this.userCredentialsKey = "vehicleUserCredentials";
    this.adminCredentialsKey = "vehicleAdminCredentials";

    // Regular login. Change these source values to change regular access.
    this.defaultUserCredentials = {
      username: "user",
      password: this.hashPassword("user123"),
    };

    // Default admin login. Change these source values to reset the app default.
    this.defaultAdminCredentials = {
      username: "krishna",
      password: this.hashPassword("krishna123"),
    };

    this.userCredentials = this.loadCredentials(
      this.userCredentialsKey,
      this.defaultUserCredentials,
      "user"
    );
    this.adminCredentials = this.loadCredentials(
      this.adminCredentialsKey,
      this.defaultAdminCredentials,
      "admin"
    );
    this.loadSession();
  }

  hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  loadCredentials(storageKey, defaultCredentials, label) {
    try {
      const storedCredentials = localStorage.getItem(storageKey);
      if (storedCredentials) {
        return JSON.parse(storedCredentials);
      }
    } catch (error) {
      console.error(`Failed to load ${label} credentials:`, error);
    }

    return { ...defaultCredentials };
  }

  saveCredentials(storageKey, credentials) {
    localStorage.setItem(storageKey, JSON.stringify(credentials));
  }

  login(username, password, role = "user") {
    const credentials =
      role === "admin" ? this.adminCredentials : this.userCredentials;
    const hashedPassword = this.hashPassword(password);

    if (
      username === credentials.username &&
      hashedPassword === credentials.password
    ) {
      this.currentUser = {
        username,
        role,
        loginTime: Date.now(),
      };
      this.saveSession();
      return true;
    }

    return false;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.sessionKey);
  }

  isLoggedIn() {
    return Boolean(this.currentUser);
  }

  isAdmin() {
    return Boolean(this.currentUser && this.currentUser.role === "admin");
  }

  getCurrentUser() {
    return this.currentUser;
  }

  changePassword(targetRole, currentAdminPassword, newPassword) {
    if (!this.isAdmin()) {
      return false;
    }

    if (
      this.hashPassword(currentAdminPassword) !== this.adminCredentials.password
    ) {
      return false;
    }

    if (targetRole === "admin") {
      this.adminCredentials.password = this.hashPassword(newPassword);
      this.saveCredentials(this.adminCredentialsKey, this.adminCredentials);
    } else {
      this.userCredentials.password = this.hashPassword(newPassword);
      this.saveCredentials(this.userCredentialsKey, this.userCredentials);
    }

    return true;
  }

  saveSession() {
    if (this.currentUser) {
      localStorage.setItem(this.sessionKey, JSON.stringify(this.currentUser));
    }
  }

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
}
