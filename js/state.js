class AppState {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
    this.currentView = 'dashboard';
    this.activeListeners = [];
    this.subscribers = new Map();
  }

  setUser(user, profile) {
    this.currentUser = user;
    this.userProfile = profile;
    this.emit('authStateChanged', { user, profile });
  }

  clearUser() {
    this.currentUser = null;
    this.userProfile = null;
    this.cleanupListeners();
    this.emit('authStateChanged', { user: null, profile: null });
  }

  isAdmin() {
    return this.userProfile && this.userProfile.accountType === 'admin';
  }

  isActive() {
    return this.userProfile && this.userProfile.status === 'active';
  }

  registerListener(unsubscribeFn) {
    if (typeof unsubscribeFn === 'function') {
      this.activeListeners.push(unsubscribeFn);
    }
  }

  cleanupListeners() {
    this.activeListeners.forEach((unsub) => {
      try { unsub(); } catch (err) { console.error('Error unsubscribing listener:', err); }
    });
    this.activeListeners = [];
  }

  on(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event).push(callback);
  }

  emit(event, data) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).forEach((cb) => cb(data));
    }
  }
}

export const state = new AppState();
