/* global FWStorage */

const DEFAULT_SETTINGS = {
  distractionSites: [
    { host: "tiktok.com", enabled: true },
    { host: "youtube.com", enabled: true },
    { host: "instagram.com", enabled: false },
    { host: "pinterest.com", enabled: true },
    { host: "facebook.com", enabled: true }
  ],
  topics: [],
  resources: [],
  timers: {
    startingBreakMinutes: 5,
    decrementMinutes: 1
  }
};

// Common site hosts for filtering
const COMMON_HOSTS = ["tiktok.com", "youtube.com", "instagram.com", "twitter.com", "amazon.com", "ebay.com", "pinterest.com", "facebook.com"];

async function loadSettings() {
  const { fwSettings } = await FWStorage.getSync(["fwSettings"]);
  return fwSettings || DEFAULT_SETTINGS;
}

async function saveSettings(settings) {
  await FWStorage.setSync({ fwSettings: settings });
}

function $(id) { return document.getElementById(id); }

function renderCustomSites(settings) {
  const list = $("customSiteList");
  list.innerHTML = "";
  const customs = settings.distractionSites.filter((s) => !COMMON_HOSTS.includes(s.host));
  
  customs.forEach((site, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="site-text">${site.host}</span> <button class="remove-btn" data-index="${index}">×</button>`;
    list.appendChild(li);
  });
  
  // Bind remove buttons
  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      const customs = settings.distractionSites.filter((s) => !COMMON_HOSTS.includes(s.host));
      const siteToRemove = customs[index];
      if (siteToRemove) {
        const siteIndex = settings.distractionSites.findIndex(s => s.host === siteToRemove.host);
        if (siteIndex >= 0) {
          settings.distractionSites.splice(siteIndex, 1);
          await saveSettings(settings);
          renderCustomSites(settings);
        }
      }
    });
  });
}

function applyCommonSites(settings) {
  const checkboxes = document.querySelectorAll('.common-site');
  checkboxes.forEach((cb) => {
    const host = cb.getAttribute('data-host');
    if (!host) return;
    const existing = settings.distractionSites.find((s) => s.host === host);
    if (cb.checked) {
      if (existing) existing.enabled = true; else settings.distractionSites.push({ host, enabled: true });
    } else {
      if (existing) existing.enabled = false;
    }
  });
}



document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();

  // Timers
  $("startingBreak").value = settings.timers.startingBreakMinutes || 5;
  $("decrement").value = settings.timers.decrementMinutes || 1;

  renderCustomSites(settings);
  // Auto-save for all form elements
  document.querySelectorAll('.common-site').forEach((cb) => {
    const host = cb.getAttribute('data-host');
    const item = settings.distractionSites.find((s) => s.host === host);
    cb.checked = !!(item?.enabled);
    cb.addEventListener('change', async () => { 
      applyCommonSites(settings); 
      await saveSettings(settings); 
    });
  });

  // Auto-save for timer settings
  $("startingBreak").addEventListener('blur', async () => {
    settings.timers.startingBreakMinutes = Number($("startingBreak").value) || 5;
    await saveSettings(settings);
  });

  $("decrement").addEventListener('blur', async () => {
    settings.timers.decrementMinutes = Number($("decrement").value) || 1;
    await saveSettings(settings);
  });

  // Auto-save for resources
  $("resourcesInput").addEventListener('blur', async () => {
    settings.resources = ($("resourcesInput").value || "").split(/\n+/).map(s => s.trim()).filter(Boolean);
    await saveSettings(settings);
  });

  if (Array.isArray(settings.topics)) {
    settings.topics.forEach((t, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="topic-text">${t}</span> <button class="remove-btn" data-index="${idx}">×</button>`;
      $("topicList").appendChild(li);
    });
    // bind deletes
    $("topicList").querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const i = parseInt(e.target.getAttribute('data-index'));
        if (!isNaN(i)) {
          settings.topics.splice(i, 1);
          // re-render
          $("topicList").innerHTML = '';
          settings.topics.forEach((t, idx2) => {
            const li2 = document.createElement("li");
            li2.innerHTML = `<span class="topic-text">${t}</span> <button class="remove-btn" data-index="${idx2}">×</button>`;
            $("topicList").appendChild(li2);
          });
          // rebind
          $("topicList").querySelectorAll('.remove-btn').forEach(btn2 => {
            btn2.addEventListener('click', (ev) => btn.click());
          });
          await saveSettings(settings);
        }
      });
    });
  }
  if (Array.isArray(settings.resources)) {
    $("resourcesInput").value = settings.resources.join("\n");
  }

  $("addCustomSite").addEventListener("click", () => {
    const val = ($("customSiteInput").value || "").trim().toLowerCase();
    if (!val) return;
    if (!settings.distractionSites.find((s) => s.host === val)) {
      settings.distractionSites.push({ host: val, enabled: true });
      renderCustomSites(settings);
      $("customSiteInput").value = "";
      // auto-save
      saveSettings(settings);
    }
  });

  $("addTopic").addEventListener("click", () => {
    const val = ($("topicInput").value || "").trim();
    if (!val) return;
    settings.topics.push(val);
    const li = document.createElement("li");
    li.innerHTML = `<span class="topic-text">${val}</span> <button class="remove-btn" data-index="${settings.topics.length - 1}">×</button>`;
    $("topicList").appendChild(li);
    li.querySelector('.remove-btn').addEventListener('click', async () => {
      const idx = settings.topics.indexOf(val);
      if (idx >= 0) {
        settings.topics.splice(idx, 1);
        li.remove();
        await saveSettings(settings);
      }
    });
    $("topicInput").value = "";
    // auto-save
    saveSettings(settings);
  });

  $("resetBtn").addEventListener("click", async () => {
    await saveSettings(DEFAULT_SETTINGS);
    location.reload();
  });

  $("historyBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('history/index.html') });
  });

  $("uploadBtn").addEventListener('click', () => $("pdfUpload").click());

  $("pdfUpload").addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusDiv = $("uploadStatus");
    const docsDiv = $("uploadedDocs");
    
    statusDiv.textContent = 'Processing document...';
    statusDiv.style.color = '#3b82f6';

    try {
      // Check if backend server is running
      const healthCheck = await fetch('http://localhost:3132/health', { 
        method: 'GET',
        timeout: 3000 
      });
      
      if (!healthCheck.ok) {
        throw new Error('PDF processing service is not available. Please ensure the backend server is running.');
      }

      // Upload to PDF backend for proper processing
      const formData = new FormData();
      formData.append('pdf', file);
      
      statusDiv.textContent = 'Uploading and processing PDF...';
      statusDiv.style.color = '#3b82f6';
      
      const response = await fetch('http://localhost:3132/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      const settings = await FWStorage.getSync(['fwSettings']);
      const currentSettings = settings.fwSettings || { documents: [] };
      if (!currentSettings.documents) currentSettings.documents = [];
      
      const doc = {
        name: file.name,
        content: result.preview || 'PDF content processed',
        uploadDate: Date.now(),
        size: file.size,
        processed: true,
        chunks: result.metadata?.totalChunks || 0
      };
      
      currentSettings.documents.push(doc);
      await FWStorage.setSync({ fwSettings: currentSettings });
      
      statusDiv.textContent = `✓ ${file.name} processed successfully (${result.metadata?.totalChunks || 0} chunks)`;
      statusDiv.style.color = '#10b981';
      
      renderUploadedDocs();
      
    } catch (error) {
      console.error('PDF upload error:', error);
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.style.color = '#ef4444';
    }
  });

  async function renderUploadedDocs() {
    const settings = await FWStorage.getSync(['fwSettings']);
    const docs = settings.fwSettings?.documents || [];
    const docsDiv = $("uploadedDocs");
    
    if (docs.length === 0) {
      docsDiv.innerHTML = '';
      return;
    }
    
    docsDiv.innerHTML = docs.map((doc, index) => `
      <div class="uploaded-doc">
        <span class="doc-name">📄 ${doc.name}</span>
        <span class="remove-doc" data-index="${index}">×</span>
      </div>
    `).join('');
    
    docsDiv.querySelectorAll('.remove-doc').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        const settings = await FWStorage.getSync(['fwSettings']);
        const currentSettings = settings.fwSettings || {};
        currentSettings.documents.splice(index, 1);
        await FWStorage.setSync({ fwSettings: currentSettings });
        renderUploadedDocs();
      });
    });
  }

  renderUploadedDocs();
});
