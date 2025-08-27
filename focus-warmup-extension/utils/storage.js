// Minimal storage utility wrappers for chrome.storage

const FWStorage = {
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

};

// Expose in both module and global scopes for options page
try { window.FWStorage = FWStorage; } catch (_) {}



