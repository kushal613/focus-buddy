/* Learning History - Complete Implementation */

let allHistory = [];
let filteredHistory = [];
let selectedDate = new Date();
let currentMonth = new Date();
let siteChart = null;

// Utility Functions
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes) {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getDateString(date) {
  return date.toISOString().split('T')[0];
}

function sanitizeText(text) {
  if (!text) return '';
  let cleaned = text.replace(/\[[^\]]*\]/g, '').replace(/\s{2,}/g, ' ').trim();
  cleaned = cleaned.replace(/^\s*#{1,6}\s*/gm, '');
  if (/\bYou:\b/i.test(cleaned)) {
    cleaned = cleaned.split(/\bYou:\b/i).pop().replace(/^\s*"?|"?\s*$/g, '').trim();
  }
  cleaned = cleaned.replace(/^(?:User|Assistant|You|System|AI)\s*:\s*/i, '');
  cleaned = cleaned.replace(/```.*?```/gs, '');
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return cleaned;
}

function cleanConversationData(conversation) {
  if (!Array.isArray(conversation)) return [];
  
  const cleaned = [];
  const seen = new Set();
  
  for (const msg of conversation) {
    if (!msg || typeof msg !== 'object' || !msg.role || !msg.content) continue;
    
    const role = msg.role.toLowerCase();
    if (role !== 'user' && role !== 'assistant') continue;
    
    const content = String(msg.content).trim();
    if (!content) continue;
    
    const key = `${role}:${content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    cleaned.push({
      role,
      content: sanitizeText(content),
      timestamp: msg.timestamp || Date.now()
    });
  }
  
  return cleaned;
}

// Data Loading and Processing
async function loadHistory() {
  try {
    // Show loading state
    const loadingState = document.getElementById('loadingState');
    const historyList = document.getElementById('historyList');
    const emptyState = document.getElementById('emptyState');
    
    loadingState.style.display = 'block';
    historyList.style.display = 'none';
    emptyState.style.display = 'none';
    
    // Get history from background script
    let response;
    try {
      response = await chrome.runtime.sendMessage({ type: 'FW_GET_LEARNING_HISTORY' });
    } catch (err) {
      console.log('Background script message failed, trying direct storage:', err);
      response = null;
    }
    
    if (response?.ok && Array.isArray(response.history)) {
      allHistory = response.history;
      console.log('Loaded history from background script:', allHistory.length, 'entries');
    } else {
      // Fallback to direct storage access
      try {
        const storageResult = await chrome.storage.local.get(['fwHistory']);
        allHistory = storageResult.fwHistory || [];
        console.log('Loaded history from direct storage:', allHistory.length, 'entries');
      } catch (storageErr) {
        console.log('Storage access failed:', storageErr);
        allHistory = [];
      }
    }
    
    // Ensure allHistory is an array
    if (!Array.isArray(allHistory)) {
      console.log('History is not an array, initializing empty array');
      allHistory = [];
    }
    
    // Clean and process history data
    allHistory = allHistory.map(entry => ({
      ...entry,
      conversation: cleanConversationData(entry.conversation || []),
      timestamp: entry.timestamp || Date.now(),
      site: entry.site || 'Unknown',
      topic: entry.topic || 'General'
    }));
    
    // Sort by timestamp (newest first)
    allHistory.sort((a, b) => b.timestamp - a.timestamp);
    
    // Show all entries by default (no date filtering)
    filteredHistory = [...allHistory];
    
    console.log('Processed history data:', allHistory.length, 'entries');
    
    // Update UI components independently to prevent one failure from breaking everything
    try {
      await updateStats();
    } catch (statsErr) {
      console.error('Failed to update stats:', statsErr);
    }
    
    try {
      await updateChart();
    } catch (chartErr) {
      console.error('Failed to update chart:', chartErr);
    }
    
    try {
      updateFilters();
    } catch (filtersErr) {
      console.error('Failed to update filters:', filtersErr);
    }
    
    try {
      updateDateDisplay();
    } catch (dateErr) {
      console.error('Failed to update date display:', dateErr);
    }
    
    try {
      renderHistory();
    } catch (renderErr) {
      console.error('Failed to render history:', renderErr);
    }
    
    // Hide loading state
    loadingState.style.display = 'none';
    
  } catch (err) {
    console.error('Failed to load history:', err);
    
    // Hide loading state
    document.getElementById('loadingState').style.display = 'none';
    
    // Initialize with empty data to prevent further errors
    allHistory = [];
    filteredHistory = [];
    
    // Update UI with empty state - don't let individual failures break the page
    try {
      await updateStats();
    } catch (updateErr) {
      console.error('Failed to update stats in error handler:', updateErr);
    }
    
    try {
      await updateChart();
    } catch (updateErr) {
      console.error('Failed to update chart in error handler:', updateErr);
    }
    
    try {
      updateFilters();
    } catch (updateErr) {
      console.error('Failed to update filters in error handler:', updateErr);
    }
    
    try {
      updateDateDisplay();
    } catch (updateErr) {
      console.error('Failed to update date display in error handler:', updateErr);
    }
    
    try {
      renderHistory();
    } catch (updateErr) {
      console.error('Failed to render history in error handler:', updateErr);
    }
    
    showError('Failed to load learning history. Please try refreshing the page.');
  }
}

// Filtering Functions
function filterHistoryByDate() {
  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  filteredHistory = allHistory.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= startOfDay && entryDate <= endOfDay;
  });
}

function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const topicFilter = document.getElementById('topicFilter').value;
  
  let filtered = [...filteredHistory];
  
  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(entry => {
      const searchText = [
        entry.topic,
        entry.site,
        entry.prompt || '',
        entry.answer || '',
        ...entry.conversation.map(msg => msg.content)
      ].join(' ').toLowerCase();
      return searchText.includes(searchTerm);
    });
  }
  
  // Apply topic filter
  if (topicFilter) {
    filtered = filtered.filter(entry => entry.topic === topicFilter);
  }
  
  renderHistory(filtered);
}

// Statistics Functions
async function updateStats() {
  try {
    // Use allHistory for overall stats, not filteredHistory
    const allEntries = allHistory;
    
    // Total sessions (all time)
    const totalSessions = allEntries.length;
    document.getElementById('totalSessions').textContent = totalSessions;
    
    // Tasks completed (entries with meaningful conversations)
    const tasksCompleted = allEntries.filter(entry => 
      entry.conversation && entry.conversation.length >= 2 // At least user + assistant message
    ).length;
    document.getElementById('tasksCompleted').textContent = tasksCompleted;
    
    // Calculate average focus time - simplified to avoid dependency on site visits
    let avgFocusTime = '0m';
    if (allEntries.length > 0) {
      // Simple estimate: 5 minutes per session
      avgFocusTime = '5m';
    }
    
    document.getElementById('avgFocusTime').textContent = avgFocusTime;
  } catch (err) {
    console.error('Error updating stats:', err);
    // Set default values on error
    document.getElementById('totalSessions').textContent = '0';
    document.getElementById('tasksCompleted').textContent = '0';
    document.getElementById('avgFocusTime').textContent = '0m';
  }
}

// Chart Functions
async function updateChart() {
  try {
    const ctx = document.getElementById('siteChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (siteChart) {
      siteChart.destroy();
    }
    
    // Get actual time spent data from site visits
    let siteTimeData = {};
    try {
      const response = await chrome.runtime.sendMessage({ type: 'FW_GET_SITE_VISITS' });
      console.log('Focus Warmup: Site visits response:', response);
      if (response?.ok && response.siteVisits) {
        // Calculate total time spent on each site
        Object.entries(response.siteVisits).forEach(([host, siteData]) => {
          console.log('Focus Warmup: Processing site data for', host, ':', siteData);
          if (siteData.visits && Array.isArray(siteData.visits)) {
            const totalTime = siteData.visits.reduce((sum, visit) => {
              return sum + (visit.duration || 0);
            }, 0);
            if (totalTime > 0) {
              siteTimeData[host] = totalTime;
              console.log('Focus Warmup: Added time data for', host, ':', totalTime, 'ms');
            }
          }
        });
      }
    } catch (err) {
      console.log('Could not fetch site visit data, using session counts as fallback:', err);
    }
    
    console.log('Focus Warmup: Final site time data:', siteTimeData);
    
    // If no time data available, fall back to session counts
    if (Object.keys(siteTimeData).length === 0) {
      allHistory.forEach(entry => {
        const site = entry.site;
        siteTimeData[site] = (siteTimeData[site] || 0) + 1;
      });
    }
    
    const sites = Object.keys(siteTimeData);
    const values = Object.values(siteTimeData);
    
    if (sites.length === 0) {
      ctx.style.display = 'none';
      document.querySelector('.chart-section').innerHTML = `
        <h3>Time Spent on Distracting Sites</h3>
        <div class="empty-chart">
          <div class="empty-icon">📊</div>
          <p>No data available yet</p>
        </div>
      `;
      return;
    }
    
    ctx.style.display = 'block';
    
    // Check if we have time data (milliseconds) or session counts
    const hasTimeData = values.some(v => v > 1000); // If any value > 1 second, it's time data
    
    siteChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: sites,
        datasets: [{
          data: values,
          backgroundColor: [
            '#3b82f6',
            '#8b5cf6',
            '#06b6d4',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#84cc16',
            '#f97316'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const site = context.label;
                const value = context.parsed;
                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                
                if (hasTimeData) {
                  // Convert milliseconds to minutes
                  const minutes = Math.round(value / (1000 * 60));
                  return `${site}: ${minutes}m (${percentage}%)`;
                } else {
                  return `${site}: ${value} sessions (${percentage}%)`;
                }
              }
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('Error updating chart:', err);
    // Hide chart on error
    const ctx = document.getElementById('siteChart');
    if (ctx) {
      ctx.style.display = 'none';
    }
  }
}

// Fallback chart function
function updateSimpleChart() {
  const ctx = document.getElementById('siteChart');
  if (!ctx) return;
  
  // Group by site using all history data
  const siteData = {};
  allHistory.forEach(entry => {
    const site = entry.site;
    siteData[site] = (siteData[site] || 0) + 1;
  });
  
  const sites = Object.keys(siteData);
  const counts = Object.values(siteData);
  
  if (sites.length === 0) {
    ctx.style.display = 'none';
    document.querySelector('.chart-section').innerHTML = `
      <h3>Time Spent on Distracting Sites</h3>
      <div class="empty-chart">
        <div class="empty-icon">📊</div>
        <p>No data available yet</p>
      </div>
    `;
    return;
  }
  
  ctx.style.display = 'block';
  
  siteChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sites,
      datasets: [{
        data: counts,
        backgroundColor: [
          '#3b82f6',
          '#8b5cf6',
          '#06b6d4',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#84cc16',
          '#f97316'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const site = context.label;
              const count = context.parsed;
              const percentage = ((count / allHistory.length) * 100).toFixed(1);
              return `${site}: ${count} sessions (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Filter Options
function updateFilters() {
  const topics = [...new Set(allHistory.map(entry => entry.topic))].sort();
  
  const topicFilter = document.getElementById('topicFilter');
  
  // Update topic filter
  topicFilter.innerHTML = '<option value="">All Topics</option>';
  topics.forEach(topic => {
    const option = document.createElement('option');
    option.value = topic;
    option.textContent = topic;
    topicFilter.appendChild(option);
  });
}

// Date Functions
function updateDateDisplay() {
  const dateDisplay = document.getElementById('selectedDate');
  const now = new Date();
  
  if (isSameDay(selectedDate, now)) {
    dateDisplay.textContent = 'Today';
  } else if (isSameDay(selectedDate, new Date(now.getTime() - 24 * 60 * 60 * 1000))) {
    dateDisplay.textContent = 'Yesterday';
  } else {
    dateDisplay.textContent = selectedDate.toLocaleDateString();
  }
  
  // Update calendar month display
  document.getElementById('currentMonth').textContent = 
    currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Calendar Functions
function toggleCalendar() {
  const calendar = document.getElementById('calendar');
  if (calendar.style.display === 'none' || calendar.style.display === '') {
    calendar.style.display = 'block';
    renderCalendar();
  } else {
    calendar.style.display = 'none';
  }
}

function renderCalendar() {
  const calendar = document.getElementById('calendar');
  const monthYear = document.getElementById('monthYear');
  
  monthYear.textContent = currentMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  let html = '';
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    const isSelected = isSameDay(date, selectedDate);
    const hasHistory = allHistory.some(entry => isSameDay(new Date(entry.timestamp), date));
    
    let className = 'calendar-day';
    if (!isCurrentMonth) className += ' other-month';
    if (isSelected) className += ' selected';
    if (hasHistory) className += ' has-history';
    
    html += `<div class="${className}" data-date="${date.toISOString().split('T')[0]}">${date.getDate()}</div>`;
  }
  
  calendar.querySelector('.calendar-grid').innerHTML = html;
}

// Rendering Functions
function renderHistory(entries = filteredHistory) {
  const historyList = document.getElementById('historyList');
  const emptyState = document.getElementById('emptyState');
  
  if (entries.length === 0) {
    historyList.style.display = 'none';
    emptyState.style.display = 'block';
    
    // Update empty state message based on whether there's any history at all
    const emptyStateElement = document.getElementById('emptyState');
    if (allHistory.length === 0) {
      emptyStateElement.innerHTML = `
        <div class="empty-icon">📚</div>
        <h3>No learning history yet</h3>
        <p>Start building your learning journal by completing micro-tasks on distraction sites. The extension will automatically record your learning conversations here.</p>
        <p style="margin-top: 16px; font-size: 13px; color: var(--muted);">
          💡 Tip: Visit sites like YouTube, TikTok, or Facebook to trigger learning popups
        </p>
      `;
    } else {
      // There are entries but they're not showing for this date
      emptyStateElement.innerHTML = `
        <div class="empty-icon">📅</div>
        <h3>No learning history for this date</h3>
        <p>You have ${allHistory.length} learning entries, but none for ${selectedDate.toLocaleDateString()}.</p>
        <p style="margin-top: 16px; font-size: 13px; color: var(--muted);">
          💡 Try selecting a different date or check your learning history
        </p>
      `;
    }
    return;
  }
  
  historyList.style.display = 'block';
  emptyState.style.display = 'none';
  
  // Group entries by topic for better organization
  const entriesByTopic = {};
  entries.forEach(entry => {
    const topic = entry.topic || 'General';
    if (!entriesByTopic[topic]) {
      entriesByTopic[topic] = [];
    }
    entriesByTopic[topic].push(entry);
  });
  
  // Sort topics by most recent activity
  const sortedTopics = Object.keys(entriesByTopic).sort((a, b) => {
    const aLatest = Math.max(...entriesByTopic[a].map(e => e.timestamp));
    const bLatest = Math.max(...entriesByTopic[b].map(e => e.timestamp));
    return bLatest - aLatest;
  });
  
  let html = '';
  
  sortedTopics.forEach(topic => {
    const topicEntries = entriesByTopic[topic];
    
    // Add topic header
    html += `
      <div class="topic-section">
        <div class="topic-header">
          <h3 class="topic-title">${topic}</h3>
          <span class="topic-count">${topicEntries.length} interaction${topicEntries.length !== 1 ? 's' : ''}</span>
        </div>
    `;
    
    // Add entries for this topic
    topicEntries.forEach(entry => {
      const conversation = entry.conversation || [];
      const previewLength = 200;
      const hasMore = conversation.length > 2;
      
      // Show all entries with any meaningful content (assistant or user messages)
      const hasAssistant = conversation.some(msg => msg.role === 'assistant');
      const hasUser = conversation.some(msg => msg.role === 'user');
      const hasMeaningfulContent = hasAssistant || hasUser;
      
      if (hasMeaningfulContent) {
        const preview = conversation.slice(0, 2).map(msg => 
          `<div class="conv-message ${msg.role}">
            <div class="conv-text">${msg.content.substring(0, previewLength)}${msg.content.length > previewLength ? '...' : ''}</div>
          </div>`
        ).join('');
        
        const fullConversation = conversation.map(msg => 
          `<div class="conv-message ${msg.role}">
            <div class="conv-text">${msg.content}</div>
          </div>`
        ).join('');
        
        html += `
          <div class="history-item">
            <div class="history-header">
              <div class="history-meta">
                <span class="site">${entry.site}</span>
                <span class="time">${formatTime(entry.timestamp)}</span>
              </div>
              <div class="history-actions">
                ${hasMore ? `<button class="show-more-btn" data-id="${entry.timestamp}">Show More</button>` : ''}
              </div>
            </div>
            
            <div class="history-content">
              <div id="preview-${entry.timestamp}" class="conversation-preview">
                ${preview}
              </div>
              
              ${hasMore ? `
                <div id="conv-${entry.timestamp}" class="conversation-full" style="display: none;">
                  ${fullConversation}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }
    });
    
    html += '</div>'; // Close topic section
  });
  
  historyList.innerHTML = html;
}

// Export and Clear Functions
async function exportData() {
  try {
    const data = {
      exportDate: new Date().toISOString(),
      totalEntries: allHistory.length,
      entries: allHistory
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-warmup-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Data exported successfully!');
  } catch (err) {
    console.error('Export failed', err);
    showError('Failed to export data. Please try again.');
  }
}

async function clearHistory() {
  if (!confirm('Are you sure you want to clear all learning history? This action cannot be undone.')) {
    return;
  }
  
  try {
    await chrome.storage.local.remove(['fwHistory']);
    allHistory = [];
    filteredHistory = [];
    
    updateStats();
    updateChart();
    updateFilters();
    renderHistory();
    
    showSuccess('History cleared successfully!');
  } catch (err) {
    console.error('Clear failed', err);
    showError('Failed to clear history. Please try again.');
  }
}

// UI Helper Functions
function showSuccess(message) {
  // Simple success notification
  const notification = document.createElement('div');
  notification.className = 'notification success';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showError(message) {
  // Simple error notification
  const notification = document.createElement('div');
  notification.className = 'notification error';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Conversation Toggle
function toggleConversation(timestamp) {
  const fullConv = document.getElementById(`conv-${timestamp}`);
  const preview = document.getElementById(`preview-${timestamp}`);
  const btn = document.querySelector(`button[data-id="${timestamp}"]`);
  
  if (!fullConv || !btn) return;
  
  const isHidden = fullConv.style.display === 'none' || fullConv.style.display === '';
  
  if (isHidden) {
    fullConv.style.display = 'block';
    if (preview) preview.style.display = 'none';
    btn.textContent = 'Show Less';
  } else {
    fullConv.style.display = 'none';
    if (preview) preview.style.display = 'block';
    btn.textContent = 'Show More';
  }
}

// Debug function to test data loading
async function testDataLoading() {
  console.log('=== Testing Data Loading ===');
  
  // Test direct storage access
  try {
    const storageResult = await chrome.storage.local.get(['fwHistory']);
    console.log('Direct storage result:', storageResult);
    console.log('History array:', storageResult.fwHistory);
    console.log('History length:', storageResult.fwHistory?.length || 0);
  } catch (err) {
    console.error('Direct storage test failed:', err);
  }
  
  // Test background script message
  try {
    const response = await chrome.runtime.sendMessage({ type: 'FW_GET_LEARNING_HISTORY' });
    console.log('Background script response:', response);
  } catch (err) {
    console.error('Background script test failed:', err);
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Test data loading first
  testDataLoading();
  
  // Load initial data
  loadHistory();
  
  // Set up event listeners
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('topicFilter').addEventListener('change', applyFilters);
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('clearBtn').addEventListener('click', clearHistory);
  
  // Calendar event listeners
  document.getElementById('calendarToggle').addEventListener('click', toggleCalendar);
  document.getElementById('prevDay').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - 1);
    updateDateDisplay();
    filterHistoryByDate();
    applyFilters();
  });
  
  document.getElementById('nextDay').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + 1);
    updateDateDisplay();
    filterHistoryByDate();
    applyFilters();
  });
  
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  });
  
  // Calendar day click handler
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('calendar-day')) {
      const dateStr = e.target.getAttribute('data-date');
      selectedDate = new Date(dateStr);
      updateDateDisplay();
      filterHistoryByDate();
      applyFilters();
      toggleCalendar();
    }
  });
  
  // Close calendar when clicking outside
  document.addEventListener('click', (e) => {
    const calendar = document.getElementById('calendar');
    const calendarToggle = document.getElementById('calendarToggle');
    
    if (!calendar.contains(e.target) && !calendarToggle.contains(e.target)) {
      calendar.style.display = 'none';
    }
  });
  
  // Show more/less buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('show-more-btn')) {
      const timestamp = e.target.getAttribute('data-id');
      toggleConversation(timestamp);
    }
  });
  
  // Make toggleConversation available globally
  window.toggleConversation = toggleConversation;
});