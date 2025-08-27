/* global FWStorage */

let allHistory = [];
let filteredHistory = [];
let groupedHistory = {};
let selectedDate = new Date();
let currentMonth = new Date();
let siteChart = null;

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

function formatDurationFromMs(milliseconds) {
  const minutes = milliseconds / (1000 * 60);
  return formatDuration(minutes);
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
  // Remove markdown headings like ### or ## or # at line starts
  cleaned = cleaned.replace(/^\s*#{1,6}\s*/gm, '');
  // Remove role prefixes and clean up ChatGPT artifacts
  if (/\bYou:\b/i.test(cleaned)) {
    cleaned = cleaned.split(/\bYou:\b/i).pop().replace(/^\s*"?|"?\s*$/g, '').trim();
  }
  cleaned = cleaned.replace(/^(?:User|Assistant|You|System|AI)\s*:\s*/i, '');
  // Remove markdown formatting that doesn't render well, but preserve bold for MCQ answers
  cleaned = cleaned.replace(/```.*?```/gs, '');
  // Convert bold markdown to HTML bold tags
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Format MCQ options for better readability
  cleaned = formatMCQOptions(cleaned);
  
  // Preserve correct-answer-text spans (they contain HTML that should not be escaped)
  // Note: correct-answer-text spans are added programmatically, not from user input
  return cleaned;
}

function cleanConversationData(conversation) {
  if (!Array.isArray(conversation)) {
    return [];
  }
  
  const cleaned = [];
  const seen = new Set();
  
  for (const msg of conversation) {
    // Skip invalid messages
    if (!msg || typeof msg !== 'object' || !msg.role || !msg.content) {
      continue;
    }
    
    // Normalize role
    const role = msg.role.toLowerCase();
    if (role !== 'user' && role !== 'assistant') {
      continue;
    }
    
    // Clean content
    const content = String(msg.content).trim();
    if (!content) {
      continue;
    }
    
    // Create unique key for deduplication
    const key = `${role}:${content}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    
    cleaned.push({
      role: role,
      content: content
    });
  }
  
  return cleaned;
}

function formatMCQOptions(text) {
  // Check if this looks like MCQ content (contains A) B) C) D) pattern)
  if (!/[A-D][\)\.]\s*[^A-D]/.test(text)) {
    return text;
  }
  
  // If the text already contains correct-answer-text spans, preserve them
  if (text.includes('correct-answer-text')) {
    // The content is already properly formatted with correct answer highlighting
    // Just ensure proper line breaks for display
    return text.replace(/([A-D][\)\.])\s*/g, '<br>$1 ').replace(/^<br>/, '');
  }
  
  // Split the text into question and options
  const firstOptionIndex = text.search(/[A-D][\)\.]/);
  if (firstOptionIndex === -1) {
    return text;
  }
  
  const question = text.substring(0, firstOptionIndex).trim();
  const optionsText = text.substring(firstOptionIndex);
  
  // Format options with proper line breaks and spacing
  const formattedOptions = optionsText
    .replace(/([A-D][\)\.])\s*/g, '<br>$1 ')
    .replace(/^<br>/, ''); // Remove leading <br> from first option
  
  return `${question}<br><br>${formattedOptions}`;
}

function groupHistoryByTopic(history) {
  const grouped = {};
  
  history.forEach(item => {
    const topic = item.topic || 'General';
    if (!grouped[topic]) {
      grouped[topic] = [];
    }
    grouped[topic].push(item);
  });
  
  // Sort conversations within each topic by timestamp (newest first)
  Object.keys(grouped).forEach(topic => {
    grouped[topic].sort((a, b) => b.timestamp - a.timestamp);
  });
  
  return grouped;
}

function renderConversationMessage(msg, isMCQ = false) {
  const messageClass = isMCQ ? 'conv-message assistant mcq-question' : `conv-message ${msg.role}`;
  const content = sanitizeText(msg.content);
  
  return `
    <div class="${messageClass}">
      <div class="conv-text">${content}</div>
    </div>
  `;
}

function renderHistoryItem(item) {
  // Clean and deduplicate conversation data
  let conversation = item.conversation || [];
  
  // If conversation is not an array, try to construct it from other fields
  if (!Array.isArray(conversation)) {
    conversation = [];
    if (item.prompt) {
      conversation.push({ role: 'assistant', content: item.prompt });
    }
    if (item.answer) {
      conversation.push({ role: 'user', content: item.answer });
    }
  }
  
  // Use the dedicated cleaning function
  conversation = cleanConversationData(conversation);
  
  console.log('Cleaned conversation for item:', item.timestamp, {
    originalLength: item.conversation?.length || 0,
    cleanedLength: conversation.length,
    sampleMessages: conversation.slice(0, 3)
  });
  
  // Show first few messages as preview
  const preview = conversation.slice(0, 3);
  const hasMore = conversation.length > 3;
  
  return `
    <div class="history-item" data-id="${item.timestamp}">
      <div class="item-header">
        <div class="item-meta">
          <span class="site-badge">${item.site}</span>
          <span class="date-meta">${formatTime(item.timestamp)}</span>
        </div>
      </div>
      
      <div class="conversation-preview" id="preview-${item.timestamp}">
        <div class="chat-container">
          ${preview.map(msg => {
            const isMCQ = msg.role === 'assistant' && /[A-D][\)\.]\s*[^A-D]/.test(msg.content);
            return renderConversationMessage(msg, isMCQ);
          }).join('')}
        </div>
      </div>
      
      ${hasMore ? `
        <button class="show-more-btn" data-id="${item.timestamp}" data-total="${conversation.length}">
          Show More
        </button>
        <div class="full-conversation" id="conv-${item.timestamp}" style="display: none;">
          <div class="chat-container">
            ${conversation.map(msg => {
              const isMCQ = msg.role === 'assistant' && /[A-D][\)\.]\s*[^A-D]/.test(msg.content);
              return renderConversationMessage(msg, isMCQ);
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderTopicSection(topic, conversations) {
  return `
    <div class="topic-section" data-topic="${topic}">
      <div class="topic-header">
        <h2 class="topic-title">${topic}</h2>
        <span class="topic-count">${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="topic-conversations">
        ${conversations.map(renderHistoryItem).join('')}
      </div>
    </div>
  `;
}

function renderHistory() {
  const container = document.getElementById('historyList');
  const emptyState = document.getElementById('emptyState');
  
  if (Object.keys(groupedHistory).length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  container.style.display = 'block';
  emptyState.style.display = 'none';
  
  // Sort topics by most recent conversation
  const sortedTopics = Object.keys(groupedHistory).sort((a, b) => {
    const aLatest = groupedHistory[a][0]?.timestamp || 0;
    const bLatest = groupedHistory[b][0]?.timestamp || 0;
    return bLatest - aLatest;
  });
  
  container.innerHTML = sortedTopics.map(topic => 
    renderTopicSection(topic, groupedHistory[topic])
  ).join('');
}

function calculateMetrics(history) {
  const totalSessions = history.length;
  
  // Calculate tasks completed (MCQs and other interactions)
  const tasksCompleted = history.filter(item => {
    const conversation = item.conversation || [];
    // Check for MCQ questions in the conversation
    return conversation.some(msg => 
      msg.role === 'assistant' && /[A-D][\)\.]\s*[^A-D]/.test(msg.content)
    ) || 
    // Also check if the item itself has MCQ content
    (item.prompt && /[A-D][\)\.]\s*[^A-D]/.test(item.prompt)) ||
    (item.answer && /[A-D][\)\.]\s*[^A-D]/.test(item.answer));
  }).length;
  
  // Calculate average focus time (simplified - using session duration if available)
  let totalFocusTime = 0;
  let focusTimeCount = 0;
  
  history.forEach(item => {
    if (item.duration) {
      totalFocusTime += item.duration;
      focusTimeCount++;
    }
  });
  
  const avgFocusTime = focusTimeCount > 0 ? totalFocusTime / focusTimeCount : 0;
  
  console.log('Metrics calculation:', {
    totalSessions,
    tasksCompleted,
    avgFocusTime,
    historyLength: history.length,
    sampleItem: history[0]
  });
  
  return {
    totalSessions,
    tasksCompleted,
    avgFocusTime
  };
}

async function calculateSiteDistribution(history) {
  // Get actual site visit data from background
  let siteVisits = {};
  try {
    const response = await chrome.runtime.sendMessage({ type: 'FW_GET_SITE_VISITS' });
    if (response?.ok) {
      siteVisits = response.siteVisits || {};
    }
  } catch (err) {
    console.error('Failed to get site visits:', err);
  }
  
  const siteData = {};
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ];
  
  // Process site visits data
  Object.entries(siteVisits).forEach(([site, data], index) => {
    if (!data.visits || data.visits.length === 0) return;
    
    const totalDuration = data.visits.reduce((sum, visit) => sum + (visit.duration || 0), 0);
    const visitCount = data.visits.length;
    const avgDuration = visitCount > 0 ? totalDuration / visitCount : 0;
    
    siteData[site] = {
      count: visitCount,
      totalDuration: totalDuration,
      avgDuration: avgDuration,
      color: colors[index % colors.length]
    };
  });
  
  // If no site visits data, fall back to session data
  if (Object.keys(siteData).length === 0) {
    history.forEach(item => {
      const site = item.site || 'Unknown';
      if (!siteData[site]) {
        siteData[site] = {
          count: 0,
          totalDuration: 0,
          sessions: []
        };
      }
      
      siteData[site].count++;
      if (item.duration) {
        siteData[site].totalDuration += item.duration;
      }
      siteData[site].sessions.push(item);
    });
  }
  
  // Convert to chart data format
  const totalTime = Object.values(siteData).reduce((sum, data) => sum + data.totalDuration, 0);
  const chartData = [];
  
  Object.entries(siteData).forEach(([site, data], index) => {
    const percentage = totalTime > 0 ? (data.totalDuration / totalTime * 100).toFixed(1) : 0;
    
    chartData.push({
      site: site,
      count: data.count,
      percentage: parseFloat(percentage),
      avgDuration: data.avgDuration || 0,
      totalDuration: data.totalDuration,
      color: data.color || colors[index % colors.length]
    });
  });
  
  // Sort by total duration (descending)
  chartData.sort((a, b) => b.totalDuration - a.totalDuration);
  
  return chartData;
}

function updateStats() {
  const metrics = calculateMetrics(filteredHistory);
  
  document.getElementById('totalSessions').textContent = metrics.totalSessions;
  document.getElementById('tasksCompleted').textContent = metrics.tasksCompleted;
  document.getElementById('avgFocusTime').textContent = formatDuration(metrics.avgFocusTime);
  
  // Update the pie chart
  updateSiteChart();
}

async function updateSiteChart() {
  const chartData = await calculateSiteDistribution(filteredHistory);
  const ctx = document.getElementById('siteChart');
  
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (siteChart) {
    siteChart.destroy();
  }
  
  if (chartData.length === 0) {
    // Show empty state
    ctx.style.display = 'none';
    return;
  }
  
  ctx.style.display = 'block';
  
  siteChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: chartData.map(d => d.site),
      datasets: [{
        data: chartData.map(d => d.totalDuration),
        backgroundColor: chartData.map(d => d.color),
        borderWidth: 2,
        borderColor: '#ffffff'
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
          enabled: false // We'll use custom tooltip
        }
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const data = chartData[index];
          showCustomTooltip(event, data);
        }
      },
      onHover: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const data = chartData[index];
          showCustomTooltip(event, data);
        } else {
          hideCustomTooltip();
        }
      }
    }
  });
}

function showCustomTooltip(event, data) {
  const tooltip = document.getElementById('chartTooltip');
  if (!tooltip) return;
  
  const tooltipSite = tooltip.querySelector('.tooltip-site');
  const tooltipPercentage = tooltip.querySelector('.tooltip-percentage');
  const tooltipDuration = tooltip.querySelector('.tooltip-duration');
  
  tooltipSite.textContent = data.site;
  tooltipPercentage.textContent = `${data.percentage}% of total time`;
  tooltipDuration.textContent = `Total: ${formatDurationFromMs(data.totalDuration)} (${data.count} visits)`;
  
  // Position tooltip
  const rect = event.target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  tooltip.style.left = `${x + 10}px`;
  tooltip.style.top = `${y - 10}px`;
  tooltip.style.display = 'block';
}

function hideCustomTooltip() {
  const tooltip = document.getElementById('chartTooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

function updateDateDisplay() {
  const dateDisplay = document.getElementById('selectedDate');
  const today = new Date();
  
  if (isSameDay(selectedDate, today)) {
    dateDisplay.textContent = 'Today';
  } else if (isSameDay(selectedDate, new Date(today.getTime() - 24 * 60 * 60 * 1000))) {
    dateDisplay.textContent = 'Yesterday';
  } else {
    dateDisplay.textContent = selectedDate.toLocaleDateString();
  }
}

function filterHistoryByDate() {
  const selectedDateStr = getDateString(selectedDate);
  
  filteredHistory = allHistory.filter(item => {
    const itemDate = new Date(item.timestamp);
    const itemDateStr = getDateString(itemDate);
    return itemDateStr === selectedDateStr;
  });
  
  console.log('Filtered history for date:', selectedDateStr, {
    totalHistory: allHistory.length,
    filteredHistory: filteredHistory.length,
    sampleItems: filteredHistory.slice(0, 2)
  });
  
  // Apply additional filters
  applyFilters();
}

function populateFilters() {
  const topicFilter = document.getElementById('topicFilter');
  const siteFilter = document.getElementById('siteFilter');
  
  // Get unique topics and sites from filtered history
  const topics = [...new Set(filteredHistory.map(h => h.topic))].sort();
  const sites = [...new Set(filteredHistory.map(h => h.site))].sort();
  
  // Clear existing options
  topicFilter.innerHTML = '<option value="">All Topics</option>';
  siteFilter.innerHTML = '<option value="">All Sites</option>';
  
  // Add topic options
  topics.forEach(topic => {
    const option = document.createElement('option');
    option.value = topic;
    option.textContent = topic;
    topicFilter.appendChild(option);
  });
  
  // Add site options
  sites.forEach(site => {
    const option = document.createElement('option');
    option.value = site;
    option.textContent = site;
    siteFilter.appendChild(option);
  });
  
  // Hide site filter as requested
  if (siteFilter) siteFilter.style.display = 'none';
}

function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const topicFilter = document.getElementById('topicFilter').value;
  const siteFilter = document.getElementById('siteFilter').value;
  
  let filtered = filteredHistory.filter(item => {
    const matchesSearch = !searchTerm || 
      (item.prompt && item.prompt.toLowerCase().includes(searchTerm)) ||
      (item.answer && item.answer.toLowerCase().includes(searchTerm)) ||
      (Array.isArray(item.conversation) && item.conversation.some(m => (m.content || '').toLowerCase().includes(searchTerm)));
    
    const matchesTopic = !topicFilter || item.topic === topicFilter;
    const matchesSite = !siteFilter || item.site === siteFilter;
    
    return matchesSearch && matchesTopic && matchesSite;
  });
  
  console.log('Applied filters:', {
    searchTerm,
    topicFilter,
    siteFilter,
    originalCount: filteredHistory.length,
    filteredCount: filtered.length
  });
  
  // Re-group filtered history
  groupedHistory = groupHistoryByTopic(filtered);
  renderHistory();
  updateStats(); // This will also update the chart
  populateFilters();
}

// Calendar functionality
function renderCalendar() {
  const calendarDays = document.getElementById('calendarDays');
  const currentMonthDisplay = document.getElementById('currentMonth');
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  currentMonthDisplay.textContent = currentMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  let calendarHTML = '';
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const isCurrentMonth = date.getMonth() === month;
    const isToday = isSameDay(date, new Date());
    const isSelected = isSameDay(date, selectedDate);
    const hasActivity = allHistory.some(item => 
      isSameDay(new Date(item.timestamp), date)
    );
    
    let classes = 'calendar-day';
    if (!isCurrentMonth) classes += ' other-month';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';
    if (hasActivity) classes += ' has-activity';
    
    calendarHTML += `<div class="${classes}" data-date="${getDateString(date)}">${date.getDate()}</div>`;
  }
  
  calendarDays.innerHTML = calendarHTML;
}

function toggleCalendar() {
  const calendar = document.getElementById('calendar');
  const isVisible = calendar.style.display !== 'none';
  
  if (isVisible) {
    calendar.style.display = 'none';
  } else {
    calendar.style.display = 'block';
    renderCalendar();
  }
}

function exportData() {
  const data = {
    exportDate: new Date().toISOString(),
    selectedDate: getDateString(selectedDate),
    totalEntries: filteredHistory.length,
    entries: filteredHistory
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `focus-warmup-history-${getDateString(selectedDate)}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

async function clearHistory() {
  if (confirm('Are you sure you want to clear all learning history? This cannot be undone.')) {
    await chrome.storage.local.set({ fwHistory: [] });
    allHistory = [];
    filteredHistory = [];
    groupedHistory = {};
    updateStats();
    populateFilters();
    renderHistory();
  }
}

async function loadHistory() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'FW_GET_LEARNING_HISTORY' });
    if (response && response.ok) {
      allHistory = response.history || [];
      
      // Debug: Log raw data structure
      console.log('Raw history data:', {
        totalItems: allHistory.length,
        sampleItem: allHistory[0],
        conversationStructure: allHistory[0]?.conversation
      });
      
      // Sort by timestamp (newest first)
      allHistory.sort((a, b) => b.timestamp - a.timestamp);
      
      // Filter by selected date
      filterHistoryByDate();
      
      updateDateDisplay();
    }
  } catch (err) {
    console.error('Failed to load history', err);
  }
}

function toggleConversation(timestamp, totalLen) {
  const fullConv = document.getElementById(`conv-${timestamp}`);
  const preview = document.getElementById(`preview-${timestamp}`);
  const btn = document.querySelector(`button[data-id="${timestamp}"]`);
  
  if (!fullConv || !btn) {
    console.error('Could not find elements:', { fullConv: !!fullConv, btn: !!btn, timestamp });
    return;
  }
  
  const isHidden = fullConv.style.display === 'none' || fullConv.style.display === '';
  
  if (isHidden) {
    // Show full conversation, hide preview
    fullConv.style.display = 'block';
    if (preview) preview.style.display = 'none';
    btn.textContent = 'Show Less';
  } else {
    // Show preview, hide full conversation
    fullConv.style.display = 'none';
    if (preview) preview.style.display = 'block';
    btn.textContent = 'Show More';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Load initial data
  loadHistory();
  
  // Set up event listeners
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('topicFilter').addEventListener('change', applyFilters);
  document.getElementById('siteFilter').addEventListener('change', applyFilters);
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('clearBtn').addEventListener('click', clearHistory);
  
  // Calendar event listeners
  document.getElementById('calendarToggle').addEventListener('click', toggleCalendar);
  document.getElementById('prevDay').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - 1);
    updateDateDisplay();
    filterHistoryByDate();
  });
  
  document.getElementById('nextDay').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + 1);
    updateDateDisplay();
    filterHistoryByDate();
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
  
  // Set up event delegation for show more buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('show-more-btn')) {
      const timestamp = e.target.getAttribute('data-id');
      const totalLen = parseInt(e.target.getAttribute('data-total'));
      toggleConversation(timestamp, totalLen);
    }
  });
  
  // Make toggleConversation available globally
  window.toggleConversation = toggleConversation;
});
