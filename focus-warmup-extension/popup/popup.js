/* global FWStorage */

const DEFAULTS = {
  distractionSites: [
    { host: "facebook.com", enabled: true },
    { host: "instagram.com", enabled: true },
    { host: "tiktok.com", enabled: true },
    { host: "youtube.com", enabled: true },
    { host: "twitter.com", enabled: false },
    { host: "reddit.com", enabled: false }
  ],
  topics: [
    "Machine Learning",
    "Spanish",
    "JavaScript",
    "Python",
    "History",
    "Philosophy"
  ],
  timers: { startingBreakMinutes: 5, decrementMinutes: 1 }
};

// Helper function for DOM queries
function $(id) { return document.getElementById(id); }

// Helper function for creating cards
function createCard(className, content, dataAttr = {}) {
  const card = document.createElement('label');
  card.className = className;
  card.innerHTML = content;
  
  Object.entries(dataAttr).forEach(([key, value]) => {
    card.setAttribute(`data-${key}`, value);
  });
  
  return card;
}

async function load() {
  const { fwSettings } = await FWStorage.getSync(["fwSettings"]);
  return fwSettings || { 
    distractionSites: DEFAULTS.distractionSites.slice(), 
    topics: DEFAULTS.topics.slice(),
    timers: { ...DEFAULTS.timers } 
  };
}

async function save(settings) {
  await FWStorage.setSync({ fwSettings: settings });
}

async function reloadAndRender() {
  const updatedSettings = await load();
  renderSites(updatedSettings);
  renderTopics(updatedSettings);
  return updatedSettings;
}

function renderSites(settings) {
  const container = $('activeSites');
  container.innerHTML = '';
  
  // Show enabled sites
  const enabledSites = settings.distractionSites.filter(s => s.enabled);
  
  enabledSites.forEach(site => {
    const card = createCard('site-card', `
      <input type="checkbox" data-host="${site.host}" checked />
      <span>${site.host.replace('.com', '')}</span>
    `, { host: site.host });
    
    container.appendChild(card);
  });
  
  // Add event listeners for checkboxes
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', async () => {
      const host = cb.getAttribute('data-host');
      const site = settings.distractionSites.find(s => s.host === host);
      if (site) {
        site.enabled = cb.checked;
        await save(settings);
        renderSites(settings); // Re-render to show/hide unchecked items
      }
    });
  });
}

function renderTopics(settings) {
  const container = $('activeTopics');
  container.innerHTML = '';
  
  // Show all topics
  settings.topics.forEach(topic => {
    const card = createCard('topic-card', `
      <input type="checkbox" data-topic="${topic}" checked />
      <span>${topic}</span>
    `, { topic });
    
    container.appendChild(card);
  });
  
  // Add event listeners for checkboxes
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', async () => {
      const topic = cb.getAttribute('data-topic');
      if (cb.checked) {
        // Add topic if not already present
        if (!settings.topics.includes(topic)) {
          settings.topics.push(topic);
        }
      } else {
        // Remove topic
        const index = settings.topics.indexOf(topic);
        if (index > -1) {
          settings.topics.splice(index, 1);
        }
      }
      await save(settings);
      renderTopics(settings);
    });
  });
}

function addCustomSite(settings) {
  const input = $('customSiteInput');
  const val = input.value.trim().toLowerCase();
  
  if (!val) {
    return;
  }
  
  const host = val.includes('.') ? val : val + '.com';
  
  // Check if site already exists
  const existingSite = settings.distractionSites.find(s => s.host === host);
  if (!existingSite) {
    settings.distractionSites.push({ host, enabled: true });
    
    // Clear input and save
    input.value = '';
    
    // Save first, then re-render
    save(settings).then(async () => {
      await reloadAndRender();
      
      // Show success feedback
      const button = $('addCustomSite');
      const originalText = button.textContent;
      button.textContent = 'Added!';
      button.style.background = '#10b981';
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 1000);
    }).catch(err => {
      console.error('Error saving settings:', err);
      
      // Show error feedback
      const button = $('addCustomSite');
      const originalText = button.textContent;
      button.textContent = 'Error!';
      button.style.background = '#ef4444';
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 1000);
    });
  } else {
    // If site exists but is disabled, enable it
    if (!existingSite.enabled) {
      existingSite.enabled = true;
      save(settings).then(async () => {
        await reloadAndRender();
        
        // Show success feedback
        const button = $('addCustomSite');
        const originalText = button.textContent;
        button.textContent = 'Enabled!';
        button.style.background = '#10b981';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = '';
        }, 1000);
      }).catch(err => {
        console.error('Error enabling site:', err);
        
        // Show error feedback
        const button = $('addCustomSite');
        const originalText = button.textContent;
        button.textContent = 'Error!';
        button.style.background = '#ef4444';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = '';
        }, 1000);
      });
    } else {
      // Site already exists and is enabled
      const button = $('addCustomSite');
      const originalText = button.textContent;
      button.textContent = 'Already added!';
      button.style.background = '#f59e0b';
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 1000);
    }
  }
}

function addCustomTopic(settings) {
  const input = $('customTopicInput');
  const val = input.value.trim();
  if (!val) return;
  
  if (!settings.topics.includes(val)) {
    settings.topics.push(val);
    renderTopics(settings);
    input.value = '';
    save(settings);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const { fwMeta } = await FWStorage.getSync(["fwMeta"]);
  if (fwMeta?.firstRun) {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/index.html') });
    window.close();
    return;
  }
  
  let s = await load();
  
  renderSites(s);
  renderTopics(s);
  
  $('addCustomSite').addEventListener('click', async () => {
    addCustomSite(s);
    // Update the settings reference after adding
    s = await load();
  });
  $('customSiteInput').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomSite(s);
      // Update the settings reference after adding
      s = await load();
    }
  });

  $('addCustomTopic').addEventListener('click', async () => {
    addCustomTopic(s);
    // Update the settings reference after adding
    s = await load();
  });
  $('customTopicInput').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTopic(s);
      // Update the settings reference after adding
      s = await load();
    }
  });

  $('saveBtn').addEventListener('click', async () => {
    await save(s);
    // Reload settings to ensure UI is up to date
    const updatedSettings = await load();
    renderSites(updatedSettings);
    renderTopics(updatedSettings);
    window.close();
  });

  $('openHistory').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('history/index.html') });
    window.close();
  });

  $('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
});