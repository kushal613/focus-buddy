// Complete storage utility wrappers for chrome.storage

const FWStorage = {
  // Sync storage methods
  getSync(keys) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.get(keys, (result) => {
          const err = chrome.runtime.lastError;
          if (err) reject(err); else resolve(result);
        });
      } catch (e) { reject(e); }
    });
  },
  
  setSync(obj) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.set(obj, () => {
          const err = chrome.runtime.lastError;
          if (err) reject(err); else resolve();
        });
      } catch (e) { reject(e); }
    });
  },

  // Local storage methods
  getLocal(keys) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(keys, (result) => {
          const err = chrome.runtime.lastError;
          if (err) reject(err); else resolve(result);
        });
      } catch (e) { reject(e); }
    });
  },

  setLocal(obj) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set(obj, () => {
          const err = chrome.runtime.lastError;
          if (err) reject(err); else resolve();
        });
      } catch (e) { reject(e); }
    });
  },

  removeLocal(keys) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.remove(keys, () => {
          const err = chrome.runtime.lastError;
          if (err) reject(err); else resolve();
        });
      } catch (e) { reject(e); }
    });
  },

  clearLocal() {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.clear(() => {
          const err = chrome.runtime.lastError;
          if (err) reject(err); else resolve();
        });
      } catch (e) { reject(e); }
    });
  },

  // Convenience methods for history
  async getHistory() {
    const result = await this.getLocal(['fwHistory']);
    return result.fwHistory || [];
  },

  async saveHistory(history) {
    await this.setLocal({ fwHistory: history });
  },

  async addHistoryEntry(entry) {
    const history = await this.getHistory();
    history.unshift(entry);
    // Keep only last 100 entries
    await this.saveHistory(history.slice(0, 100));
  },

  async clearHistory() {
    await this.removeLocal(['fwHistory']);
  }
};

// Expose in both module and global scopes for options page
try { window.FWStorage = FWStorage; } catch (_) {}



