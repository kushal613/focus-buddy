/* global FWStorage */

let currentStep = 1;
const totalSteps = 5;
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
    decrementMinutes: 1,
    graceMode: false,
    devFast: true
  }
};

// Initialize tempSettings with default values
let tempSettings = { ...DEFAULT_SETTINGS };

function updateProgress() {
  const progress = (currentStep / totalSteps) * 100;
  document.getElementById('progressFill').style.width = progress + '%';
}

function showStep(stepNum) {
  console.log('Focus Warmup: showStep called with stepNum:', stepNum);
  
  // Log all step elements to see what's available
  const allSteps = document.querySelectorAll('.step');
  console.log('Focus Warmup: All step elements found:', allSteps.length);
  allSteps.forEach((step, index) => {
    console.log(`Focus Warmup: Step ${index + 1}:`, step.id, 'classes:', step.className);
  });
  
  document.querySelectorAll('.step').forEach(step => {
    step.classList.remove('active');
  });
  
  const targetStep = document.getElementById(`step${stepNum}`);
  console.log('Focus Warmup: Target step element:', targetStep);
  
  if (targetStep) {
    targetStep.classList.add('active');
    console.log('Focus Warmup: Step', stepNum, 'activated');
    
    // Verify the step is actually visible
    setTimeout(() => {
      const isVisible = targetStep.classList.contains('active') && 
                       targetStep.style.display !== 'none' && 
                       targetStep.offsetWidth > 0;
      console.log('Focus Warmup: Step visibility check:', isVisible);
    }, 100);
  } else {
    console.error('Focus Warmup: Step element not found for step', stepNum);
    
    // Fallback: try to show any step that exists
    const fallbackStep = document.querySelector('.step');
    if (fallbackStep) {
      console.log('Focus Warmup: Using fallback step:', fallbackStep.id);
      fallbackStep.classList.add('active');
    }
  }
  
  updateProgress();
}

function nextStep() {
  console.log('Focus Warmup: nextStep called, currentStep:', currentStep, 'totalSteps:', totalSteps);
  
  if (currentStep < totalSteps) {
    if (currentStep === 2) saveSites();
    if (currentStep === 3) saveTopics();
    if (currentStep === 4) saveTimers();
    
    currentStep++;
    console.log('Focus Warmup: Moving to step:', currentStep);
    showStep(currentStep);
    
    if (currentStep === 5) updateSummary();
  } else {
    console.log('Focus Warmup: Already at last step');
  }
}

// Fallback navigation method
function forceNextStep() {
  console.log('Focus Warmup: Force next step called');
  
  // Hide current step
  const currentStepElement = document.querySelector('.step.active');
  if (currentStepElement) {
    currentStepElement.classList.remove('active');
    currentStepElement.style.display = 'none';
  }
  
  // Show next step
  const nextStepElement = document.getElementById(`step${currentStep + 1}`);
  if (nextStepElement) {
    nextStepElement.classList.add('active');
    nextStepElement.style.display = 'block';
    console.log('Focus Warmup: Force showed step', currentStep + 1);
  } else {
    console.error('Focus Warmup: Could not find next step element');
  }
  
  currentStep++;
  updateProgress();
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
}

function saveSites() {
  console.log('Focus Warmup: saveSites called');
  tempSettings.distractionSites = [];
  
  // Get checked common sites
  document.querySelectorAll('.site-check:checked').forEach(cb => {
    const host = cb.getAttribute('data-host');
    if (host) {
      tempSettings.distractionSites.push({ host, enabled: true });
      console.log('Focus Warmup: Added site:', host);
    }
  });
  
  // Get custom sites
  document.querySelectorAll('#customList li').forEach(li => {
    const host = li.textContent.replace(' ×', '').trim();
    if (host) {
      tempSettings.distractionSites.push({ host, enabled: true });
      console.log('Focus Warmup: Added custom site:', host);
    }
  });
  
  console.log('Focus Warmup: Final sites:', tempSettings.distractionSites);
}

function saveTopics() {
  console.log('Focus Warmup: saveTopics called');
  tempSettings.topics = [];
  
  document.querySelectorAll('#topicList li').forEach(li => {
    const topic = li.textContent.replace(' ×', '').trim();
    if (topic) {
      tempSettings.topics.push(topic);
      console.log('Focus Warmup: Added topic:', topic);
    }
  });
  
  console.log('Focus Warmup: Final topics:', tempSettings.topics);
}

function saveTimers() {
  console.log('Focus Warmup: saveTimers called');
  tempSettings.timers.startingBreakMinutes = Number(document.getElementById('startTime').value) || 5;
  tempSettings.timers.decrementMinutes = Number(document.getElementById('decrementTime').value) || 1;
  
  console.log('Focus Warmup: Final timers:', tempSettings.timers);
}

function addCustomSite() {
  const input = document.getElementById('customSite');
  const val = input.value.trim().toLowerCase();
  if (!val) return;
  
  // Clean up the site name - remove http/https and www if present
  let cleanSite = val.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
  
  // Check if already exists
  const existingSites = Array.from(document.querySelectorAll('#customList li')).map(li => 
    li.textContent.replace(' ×', '').trim()
  );
  
  if (existingSites.includes(cleanSite)) {
    // Highlight the input briefly to show it's already added
    input.style.borderColor = '#ef4444';
    setTimeout(() => {
      input.style.borderColor = '';
    }, 1000);
    return;
  }
  
  const list = document.getElementById('customList');
  const li = document.createElement('li');
  li.innerHTML = `${cleanSite} <span class="remove-btn">×</span>`;
  const removeBtn = li.querySelector('.remove-btn');
  removeBtn.addEventListener('click', () => {
    li.remove();
    // Save sites immediately after removing
    setTimeout(() => saveSites(), 100);
  });
  list.appendChild(li);
  input.value = '';
  
  // Add a subtle animation
  li.style.opacity = '0';
  li.style.transform = 'translateY(-10px)';
  setTimeout(() => {
    li.style.transition = 'all 0.3s ease';
    li.style.opacity = '1';
    li.style.transform = 'translateY(0)';
  }, 10);
  
  // Save sites immediately after adding
  setTimeout(() => saveSites(), 100);
}

function addTopic() {
  const input = document.getElementById('topicInput');
  const val = input.value.trim();
  if (!val) return;
  
  // Check if already exists
  const existingTopics = Array.from(document.querySelectorAll('#topicList li')).map(li => 
    li.textContent.replace(' ×', '').trim()
  );
  
  if (existingTopics.includes(val)) {
    // Highlight the input briefly to show it's already added
    input.style.borderColor = '#ef4444';
    setTimeout(() => {
      input.style.borderColor = '';
    }, 1000);
    return;
  }
  
  const list = document.getElementById('topicList');
  const li = document.createElement('li');
  li.innerHTML = `${val} <span class="remove-btn">×</span>`;
  const removeBtn = li.querySelector('.remove-btn');
  removeBtn.addEventListener('click', () => {
    li.remove();
    // Save topics immediately after removing
    setTimeout(() => saveTopics(), 100);
  });
  list.appendChild(li);
  input.value = '';
  
  // Add a subtle animation
  li.style.opacity = '0';
  li.style.transform = 'translateY(-10px)';
  setTimeout(() => {
    li.style.transition = 'all 0.3s ease';
    li.style.opacity = '1';
    li.style.transform = 'translateY(0)';
  }, 10);
  
  // Save topics immediately after adding
  setTimeout(() => saveTopics(), 100);
}

function quickAddTopic(topic) {
  const list = document.getElementById('topicList');
  const existing = Array.from(list.children).some(li => 
    li.textContent.replace(' ×', '').trim() === topic
  );
  
  if (!existing) {
    const li = document.createElement('li');
    li.innerHTML = `${topic} <span class="remove-btn">×</span>`;
    const removeBtn = li.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      li.remove();
      // Save topics immediately after removing
      setTimeout(() => saveTopics(), 100);
    });
    list.appendChild(li);
    
    // Add a subtle animation
    li.style.opacity = '0';
    li.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      li.style.transition = 'all 0.3s ease';
      li.style.opacity = '1';
      li.style.transform = 'translateY(0)';
    }, 10);
    
    // Save topics immediately after adding
    setTimeout(() => saveTopics(), 100);
  } else {
    // Highlight the chip briefly to show it's already added
    const chip = document.querySelector(`[data-topic="${topic}"]`);
    if (chip) {
      chip.style.background = '#ef4444';
      chip.style.color = 'white';
      setTimeout(() => {
        chip.style.background = '';
        chip.style.color = '';
      }, 1000);
    }
  }
}

function updateSummary() {
  saveSites();
  saveTopics();
  saveTimers();
  
  document.getElementById('siteCount').textContent = tempSettings.distractionSites.length;
  
  // Count all study materials: topics + PDFs
  const topicCount = tempSettings.topics.length;
  const pdfCount = tempSettings.documents ? tempSettings.documents.length : 0;
  const totalStudyMaterials = topicCount + pdfCount;
  
  console.log('Focus Warmup: Onboarding Summary', {
    topics: tempSettings.topics,
    documents: tempSettings.documents,
    topicCount,
    pdfCount,
    totalStudyMaterials
  });
  
  document.getElementById('topicCount').textContent = totalStudyMaterials;
  document.getElementById('timerSummary').textContent = tempSettings.timers.startingBreakMinutes;
}

async function finishSetup() {
  console.log('Focus Warmup: finishSetup called');
  
  // Save all data one final time before closing
  console.log('Focus Warmup: Saving all data one final time');
  saveSites();
  saveTopics();
  saveTimers();
  
  console.log('Focus Warmup: Final tempSettings:', tempSettings);
  
  try {
    await FWStorage.setSync({ fwSettings: tempSettings });
    console.log('Focus Warmup: Settings saved successfully');
    
    await FWStorage.setSync({ fwMeta: { firstRun: false, onboardingComplete: true } });
    console.log('Focus Warmup: Meta saved successfully');
    
    console.log('Focus Warmup: Closing window');
    window.close();
  } catch (error) {
    console.error('Focus Warmup: Error in finishSetup:', error);
    alert('Error saving settings: ' + error.message);
  }
}

console.log('Focus Warmup: Script loaded, waiting for DOM...');
console.log('Focus Warmup: FWStorage available:', typeof FWStorage !== 'undefined');

// Simple immediate test function
function testButtonClick() {
  console.log('Focus Warmup: Test function called!');
  alert('Test function works!');
}

// Add a global function for testing
window.testButtonClick = testButtonClick;

document.addEventListener('DOMContentLoaded', () => {
  console.log('Focus Warmup: DOM loaded, setting up event listeners');
  
  // Immediate test - can we find any elements?
  const allButtons = document.querySelectorAll('button');
  const allElementsWithId = document.querySelectorAll('[id]');
  
  console.log('Focus Warmup: Found buttons:', allButtons.length);
  console.log('Focus Warmup: Found elements with ID:', allElementsWithId.length);
  
  // Log all button IDs
  allButtons.forEach((btn, index) => {
    console.log(`Focus Warmup: Button ${index}:`, btn.id, btn.textContent);
  });
  
  // Try to find the Get Started button
  const getStartedBtn = document.getElementById('getStartedBtn');
  console.log('Focus Warmup: Get Started button found:', getStartedBtn);
  
  if (getStartedBtn) {
    console.log('Focus Warmup: Adding click listener to Get Started button');
    
    // Simple click handler
    getStartedBtn.onclick = function(e) {
      console.log('Focus Warmup: Get Started button clicked via onclick!');
      e.preventDefault();
      e.stopPropagation();
      
      // Hide all steps first
      document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
      });
      
      // Show step 2
      const step2 = document.getElementById('step2');
      if (step2) {
        step2.classList.add('active');
        step2.style.display = 'block';
        console.log('Focus Warmup: Moved from step 1 to step 2');
        currentStep = 2;
        updateProgress();
      } else {
        console.error('Focus Warmup: Could not find step 2');
        alert('Error: Could not find step 2');
      }
    };
    
    // Also add addEventListener as backup
    getStartedBtn.addEventListener('click', function(e) {
      console.log('Focus Warmup: Get Started button clicked via addEventListener!');
    });
    
  } else {
    console.error('Focus Warmup: Get Started button not found!');
  }
  
  // Set up other navigation buttons with simple handlers
  try {
    const step2Back = document.getElementById('step2Back');
    const step2Next = document.getElementById('step2Next');
    const step3Back = document.getElementById('step3Back');
    const step3Next = document.getElementById('step3Next');
    const step4Back = document.getElementById('step4Back');
    const step4Next = document.getElementById('step4Next');
    const step5Back = document.getElementById('step5Back');
    const finishBtn = document.getElementById('finishBtn');
    
    if (step2Back) step2Back.onclick = function() {
      // Hide all steps
      document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
      });
      // Show step 1
      const step1 = document.getElementById('step1');
      if (step1) {
        step1.classList.add('active');
        step1.style.display = 'block';
        currentStep = 1;
        updateProgress();
      }
    };
    
    if (step2Next) step2Next.onclick = function() {
      // Hide all steps
      document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
      });
      // Show step 3
      const step3 = document.getElementById('step3');
      if (step3) {
        step3.classList.add('active');
        step3.style.display = 'block';
        currentStep = 3;
        updateProgress();
      }
    };
    
    if (step3Back) step3Back.onclick = function() {
      // Hide all steps
      document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
      });
      // Show step 2
      const step2 = document.getElementById('step2');
      if (step2) {
        step2.classList.add('active');
        step2.style.display = 'block';
        currentStep = 2;
        updateProgress();
      }
    };
    
    if (step3Next) step3Next.onclick = function() {
      // Hide all steps
      document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
      });
      // Show step 4
      const step4 = document.getElementById('step4');
      if (step4) {
        step4.classList.add('active');
        step4.style.display = 'block';
        currentStep = 4;
        updateProgress();
      }
    };
    
    if (step4Back) step4Back.onclick = function() {
      // Hide all steps
      document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
      });
      // Show step 3
      const step3 = document.getElementById('step3');
      if (step3) {
        step3.classList.add('active');
        step3.style.display = 'block';
        currentStep = 3;
        updateProgress();
      }
    };
    
    if (step4Next) step4Next.onclick = function() {
      // Hide all steps
      document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
      });
      // Show step 5
      const step5 = document.getElementById('step5');
      if (step5) {
        step5.classList.add('active');
        step5.style.display = 'block';
        currentStep = 5;
        updateProgress();
        updateSummary();
      }
    };
    
    if (step5Back) step5Back.onclick = function() {
      // Hide all steps
      document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
      });
      // Show step 4
      const step4 = document.getElementById('step4');
      if (step4) {
        step4.classList.add('active');
        step4.style.display = 'block';
        currentStep = 4;
        updateProgress();
      }
    };
    
    if (finishBtn) {
      console.log('Focus Warmup: Found finish button, setting up click handler');
      
      // Test function to verify button works
      const testFinishSetup = function(e) {
        console.log('Focus Warmup: Finish button clicked!');
        console.log('Focus Warmup: Event:', e);
        console.log('Focus Warmup: Button element:', this);
        finishSetup();
      };
      
      finishBtn.onclick = testFinishSetup;
      
      // Also add addEventListener as backup
      finishBtn.addEventListener('click', testFinishSetup);
      
      // Make sure button is visible and clickable
      finishBtn.style.cursor = 'pointer';
      finishBtn.style.pointerEvents = 'auto';
      finishBtn.disabled = false;
      
      console.log('Focus Warmup: Finish button setup complete');
      console.log('Focus Warmup: Button properties:', {
        id: finishBtn.id,
        className: finishBtn.className,
        disabled: finishBtn.disabled,
        style: finishBtn.style.cssText
      });
    } else {
      console.error('Focus Warmup: Finish button not found!');
    }
    
    console.log('Focus Warmup: Navigation buttons set up');
  } catch (error) {
    console.error('Focus Warmup: Error setting up navigation buttons:', error);
  }
  
  // Set up other interactive elements
  try {
    const addCustomSiteBtn = document.getElementById('addCustomSiteBtn');
    const addTopicBtn = document.getElementById('addTopicBtn');
    
    if (addCustomSiteBtn) addCustomSiteBtn.onclick = addCustomSite;
    if (addTopicBtn) addTopicBtn.onclick = addTopic;
    
    // Set up chip buttons
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
      chip.onclick = function(e) {
        const topic = this.getAttribute('data-topic');
        if (topic) {
          quickAddTopic(topic);
          // Save topics immediately after adding
          setTimeout(() => saveTopics(), 100);
        }
      };
    });
    
    // Set up site checkboxes to save immediately when changed
    document.querySelectorAll('.site-check').forEach(cb => {
      cb.addEventListener('change', () => {
        console.log('Focus Warmup: Site checkbox changed, saving sites');
        setTimeout(() => saveSites(), 100);
      });
    });
    
    // Set up timer inputs to save immediately when changed
    const timerInputs = ['startTime', 'decrementTime'];
    timerInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', () => {
          console.log('Focus Warmup: Timer input changed, saving timers');
          setTimeout(() => saveTimers(), 100);
        });
      }
    });
    
    // Set up upload document button
    const onboardingUploadBtn = document.getElementById('onboardingUploadBtn');
    if (onboardingUploadBtn) {
      onboardingUploadBtn.onclick = function() {
        document.getElementById('onboardingPdfUpload').click();
      };
    }
    
    // Set up PDF upload change handler
    const onboardingPdfUpload = document.getElementById('onboardingPdfUpload');
    if (onboardingPdfUpload) {
      onboardingPdfUpload.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const statusDiv = document.getElementById('onboardingUploadStatus');
        statusDiv.textContent = 'Processing document...';
        statusDiv.style.color = '#3b82f6';

        try {
          // Check if backend server is running
          const healthCheck = await fetch('http://localhost:3132/health', { 
            method: 'GET',
            timeout: 3000 
          }).catch(() => null);
          
          if (!healthCheck || !healthCheck.ok) {
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
          
          if (!tempSettings.documents) tempSettings.documents = [];
          
          const doc = {
            name: file.name,
            content: result.preview || 'PDF content processed',
            uploadDate: Date.now(),
            size: file.size,
            processed: true,
            chunks: result.metadata?.totalChunks || 0
          };
          
          tempSettings.documents.push(doc);
          
          statusDiv.textContent = `✓ ${file.name} processed successfully`;
          statusDiv.style.color = '#10b981';
          
          renderOnboardingUploads();
          
        } catch (error) {
          console.error('PDF upload error:', error);
          let errorMessage = 'Error processing PDF';
          
          if (error.message.includes('PDF processing service is not available')) {
            errorMessage = 'PDF processing service is not available. Please ensure the backend server is running.';
          } else if (error.message.includes('Only PDF files are allowed')) {
            errorMessage = 'Please select a valid PDF file.';
          } else if (error.message.includes('file size')) {
            errorMessage = 'File is too large. Please select a PDF under 10MB.';
          } else if (error.message.includes('empty or unreadable')) {
            errorMessage = 'PDF appears to be empty or unreadable. Please try a different file.';
          } else if (error.message.includes('Upload failed')) {
            errorMessage = 'Upload failed. Please check your connection and try again.';
          } else {
            errorMessage = `Error processing ${file.name}: ${error.message}`;
          }
          
          statusDiv.textContent = errorMessage;
          statusDiv.style.color = '#ef4444';
        }
      };
    }
    
    console.log('Focus Warmup: Interactive elements set up');
  } catch (error) {
    console.error('Focus Warmup: Error setting up interactive elements:', error);
  }
  
  // Final check
  console.log('Focus Warmup: Setup complete');
  console.log('Focus Warmup: Current step:', currentStep);
  console.log('Focus Warmup: Active step:', document.querySelector('.step.active'));
  
  // Ensure step 1 is active
  const step1 = document.getElementById('step1');
  if (step1) {
    step1.classList.add('active');
    step1.style.display = 'block';
    console.log('Focus Warmup: Step 1 activated');
  }
});



function renderOnboardingUploads() {
  const itemsDiv = document.getElementById('onboardingUploadedItems');
  if (!itemsDiv) return;
  
  const docs = tempSettings.documents || [];
  
  const allItems = [
    ...docs.map((doc, index) => ({ type: 'doc', name: doc.name, icon: '📄', index })),
  ];
  
  if (allItems.length === 0) {
    itemsDiv.innerHTML = '';
    return;
  }
  
  itemsDiv.innerHTML = allItems.map(item => `
    <div class="uploaded-item">
      <span class="item-icon">${item.icon}</span>
      <span class="item-name">${item.name}</span>
      <span class="remove-item" data-type="${item.type}" data-index="${item.index}">×</span>
    </div>
  `).join('');
  
  // Add event listeners for remove buttons
  itemsDiv.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.dataset.type;
      const index = parseInt(e.target.dataset.index);
      
      if (type === 'doc') {
        tempSettings.documents.splice(index, 1);
      }
      
      renderOnboardingUploads();
    });
  });
}
