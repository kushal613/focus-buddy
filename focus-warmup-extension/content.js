// Focus Warmup - Content Script

(function initFocusWarmupContent() {
  const OVERLAY_ID = "focus-warmup-overlay";

  let currentConversation = [];
  let currentTopic = null;
  let teachCount = 0;
  let quizCount = 0;
  let awaitingMCQ = false;
  let lastContinuationConcept = '';
  let hasAnsweredMCQCorrectly = false;
  let mcqActive = false;
  let hasPDFContent = false;
  let pdfDocuments = [];
  
  function setConversationPlaceholder(text) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    let conversationDiv = overlay.querySelector('.fw-conversation');
    if (!conversationDiv) {
      conversationDiv = document.createElement('div');
      conversationDiv.className = 'fw-conversation';
      conversationDiv.id = 'fw-conversation';
      const anchor = overlay.querySelector('#fw-actions');
      if (anchor) {
        overlay.querySelector('.fw-card').insertBefore(conversationDiv, anchor);
      } else {
        overlay.querySelector('.fw-card').appendChild(conversationDiv);
      }
    }
    conversationDiv.innerHTML = `
      <div class="conv-message assistant">
        <div class="conv-text">${sanitizeText(text)}</div>
      </div>
    `;
  }



  function createOverlay() {
    if (document.getElementById(OVERLAY_ID)) return document.getElementById(OVERLAY_ID);
    
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;

    overlay.innerHTML = `
      <div class="fw-overlay-backdrop">
        <div class="fw-card">
          <div class="fw-title">Focus Warmup</div>
          <div class="fw-conversation" id="fw-conversation"></div>
          <div class="fw-action-buttons" id="fw-actions">
            <button id="fw-teach" class="action-btn">Learn More</button>
            <button id="fw-quiz" class="action-btn">Quiz Me</button>
            <button id="fw-hint" class="action-btn secondary" style="display:none;">Hint</button>
            <button id="fw-exit" class="action-btn secondary" style="display:none;">Back to Doom Scrolling</button>
          </div>

          <div class="fw-mcq-options" id="fw-mcq-options" style="display: none;">
            <div class="mcq-option" data-choice="A" id="mcq-a">A</div>
            <div class="mcq-option" data-choice="B" id="mcq-b">B</div>
            <div class="mcq-option" data-choice="C" id="mcq-c">C</div>
            <div class="mcq-option" data-choice="D" id="mcq-d">D</div>
          </div>
          <div class="fw-subtext" id="fw-help">Quick brain warmup to get focused.</div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(overlay);
    try {
      document.documentElement.style.overflow = 'hidden';
      document.body && (document.body.style.overflow = 'hidden');
      document.body && (document.body.style.position = 'relative');
    } catch (_) {}

    // Start with an initial teaching message
    requestTeaching();
    
    // Mark that popup has been shown for this site
    chrome.runtime.sendMessage({ 
      type: 'FW_POPUP_SHOWN', 
      host: location.hostname,
      topic: currentTopic || 'General'
    });

    const teachBtn = overlay.querySelector('#fw-teach');
    const quizBtn = overlay.querySelector('#fw-quiz');
    const hintBtn = overlay.querySelector('#fw-hint');
    const exitBtn = overlay.querySelector('#fw-exit');
    const askWrap = document.createElement('div');
    askWrap.className = 'fw-ask';
    askWrap.id = 'fw-ask';
    askWrap.style.display = 'none';
    askWrap.innerHTML = '<textarea id="fw-question" class="ask-input" rows="1" placeholder="Ask about something specific you just learned…"></textarea>\n            <button id="fw-ask-btn" class="ask-btn">Ask</button>';
    const card = overlay.querySelector('.fw-card');
    const actions = overlay.querySelector('#fw-actions');
    if (card && actions) card.insertBefore(askWrap, actions.nextSibling);
    const askInput = askWrap.querySelector('#fw-question');
    const askBtn = askWrap.querySelector('#fw-ask-btn');

    teachBtn?.addEventListener('click', async () => { 
      await requestTeaching(); 
      teachCount++;
      
      // Ensure all buttons are visible after teaching
      const overlay = document.getElementById(OVERLAY_ID);
      if (overlay) {
        const teachBtn = overlay.querySelector('#fw-teach');
        const quizBtn = overlay.querySelector('#fw-quiz');
        const exitBtn = overlay.querySelector('#fw-exit');
        const hintBtn = overlay.querySelector('#fw-hint');
        
        // Show main action buttons
        if (teachBtn) teachBtn.style.display = 'inline-block';
        if (quizBtn) quizBtn.style.display = 'inline-block';
        if (hintBtn) hintBtn.style.display = 'none';
        
        // Enable quiz only after explicit Learn More
        if (quizBtn) {
          quizBtn.classList.remove('disabled');
          quizBtn.removeAttribute('title');
        }
        
        // Show ask UI and hide MCQ options
        const ask = overlay.querySelector('#fw-ask');
        if (ask) ask.style.display = 'flex';
        const mcqOptions = overlay.querySelector('#fw-mcq-options');
        if (mcqOptions) mcqOptions.style.display = 'none';
        mcqActive = false;
      }
    });
    quizBtn?.addEventListener('click', async () => { 
      // Require Learn More first
      if (!overlay.querySelector('#fw-quiz')?.classList.contains('disabled') && false) {}
      const qEl = overlay.querySelector('#fw-quiz');
      if (qEl && qEl.classList.contains('disabled')) {
        const helpDiv = document.getElementById('fw-help');
        if (helpDiv) helpDiv.textContent = 'Tip: Click Learn More first, then take a quiz.';
        qEl.setAttribute('title', 'Click Learn More first');
        return;
      }
      // Hide other actions during an active question
      if (teachBtn) teachBtn.style.display = 'none';
      if (quizBtn) quizBtn.style.display = 'none';
      if (exitBtn) exitBtn.style.display = 'none';
      if (hintBtn) hintBtn.style.display = 'inline-block';
      // Hide ask during MCQ
      const ask = overlay.querySelector('#fw-ask');
      if (ask) ask.style.display = 'none';
      await requestMCQ(); 
      quizCount++;
      // no auto-exit; user will choose to exit
    });
    hintBtn?.addEventListener('click', async () => {
      const lastAssistant = currentConversation.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
      const req = `Give a concise hint (<= 15 words) that nudges the user toward the correct option for this question, without revealing the answer outright. Question context: "${lastAssistant}". No markdown.`;
      const resp = await chrome.runtime.sendMessage({ type: 'FW_CHAT', conversationHistory: currentConversation.concat([{ role:'user', content: req }]) });
      if (resp?.ok && resp.reply) {
        // Render hint as a thought-bubble, do not alter MCQ options visibility
        const overlay = document.getElementById(OVERLAY_ID);
        const conversation = overlay?.querySelector('#fw-conversation');
        if (conversation) {
          const hintDiv = document.createElement('div');
          hintDiv.className = 'conv-message assistant hint';
          hintDiv.innerHTML = `<div class="conv-text">${sanitizeText(resp.reply)}</div>`;
          conversation.appendChild(hintDiv);
          conversation.scrollTop = conversation.scrollHeight;
        }
      }
    });

    // Ask-a-question handlers
    let isSubmittingAsk = false;
    const submitAsk = async () => {
      if (isSubmittingAsk) return; // Prevent duplicate submissions
      
      const q = (askInput?.value || '').trim();
      if (!q) return;
      
      isSubmittingAsk = true;
      
      // Show as user message
      currentConversation.push({ role: 'user', content: q });
      
      // Create a specific prompt for user questions with length limit
      const userQuestionPrompt = `The user asked: "${q}"

Please provide a concise answer to their question. Keep your response to 2-3 sentences maximum (<= 50 words). Be helpful and specific, but brief. No markdown or headings.`;
      
      const resp = await chrome.runtime.sendMessage({ 
        type: 'FW_CHAT', 
        conversationHistory: currentConversation.concat([{ role: 'user', content: userQuestionPrompt }])
      });
      
      if (resp?.ok && resp.reply) {
        currentConversation.push({ role: 'assistant', content: resp.reply });
        updateConversationUI();
        
        // Save session after user asks a question
        await saveSession();
      }
      
      if (askInput) {
        askInput.value = '';
        askInput.style.height = '40px';
      }
      
      isSubmittingAsk = false;
      // Asking a question does not enable Quiz Me; keep Learn More gating
    };
    
    askBtn?.addEventListener('click', submitAsk);
    askInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitAsk();
      }
    });
            // Auto-grow textarea
            askInput?.addEventListener('input', () => {
              askInput.style.height = '40px'; // Reset to base height first
              const scrollHeight = askInput.scrollHeight;
              askInput.style.height = Math.min(80, Math.max(40, scrollHeight)) + 'px';
            });

    exitBtn?.addEventListener('click', async () => {
      // Only save session if user completed an MCQ correctly
      if (hasAnsweredMCQCorrectly) {
        await saveSession();
      }
      // If user exits without completing MCQ, don't mark as completed
      // The pending popup will remain, so if they refresh, it shows immediately
      removeOverlay();
      scheduleNextCycle();
    });

    return overlay;
  }

  async function checkPDFStatus() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'FW_CHECK_PDF_STATUS' });
      if (resp?.ok) {
        hasPDFContent = resp.hasPDF;
        pdfDocuments = resp.documents || [];
        
        console.log('Focus Warmup: PDF Status Updated', {
          hasPDFContent,
          pdfDocuments: pdfDocuments.length
        });
      }
    } catch (error) {
      console.error('Failed to check PDF status:', error);
    }
  }

  async function ensureTopic() {
    // Check PDF status first
    await checkPDFStatus();
    
    if (!currentTopic) {
      try {
        // Get next topic in rotation with conversation context
        const next = await chrome.runtime.sendMessage({ type: 'FW_GET_NEXT_TOPIC' });
        if (next?.ok && next.topic) {
          currentTopic = next.topic;
          
          // Load existing conversation for this topic
          if (next.conversation && next.conversation.length > 0) {
            currentConversation = [...next.conversation];
            console.log(`Focus Warmup: Loaded existing conversation for ${currentTopic} (${currentConversation.length} messages)`);
          } else {
            currentConversation = [];
          }
        } else {
          // Fallback only if background fails
          const { fwSettings } = await chrome.storage.sync.get(['fwSettings']);
          currentTopic = (fwSettings?.topics && fwSettings.topics[0]) || 'General';
          currentConversation = [];
        }
      } catch (_) { 
        // Fallback if all else fails
        const { fwSettings } = await chrome.storage.sync.get(['fwSettings']);
        currentTopic = (fwSettings?.topics && fwSettings.topics[0]) || 'General';
        currentConversation = [];
      }
    }
    
    // Priority: PDF > Regular topics
    if (hasPDFContent && pdfDocuments.length > 0) {
      const pdfDoc = pdfDocuments[0]; // Use the first PDF document
      console.log('Focus Warmup: Using PDF topic', pdfDoc.name);
      return `PDF: ${pdfDoc.name}`;
    }
    
    console.log('Focus Warmup: Using regular topic', currentTopic);
    return currentTopic;
  }

  async function loadContinuity() {
    try {
      const { fwLastTopic, fwLastConcept } = await chrome.storage.local.get(['fwLastTopic','fwLastConcept']);
      if (fwLastTopic) currentTopic = fwLastTopic;
      if (fwLastConcept) lastContinuationConcept = fwLastConcept;
    } catch (_) {}
  }

  async function requestTeaching() {
    const topic = await ensureTopic();
    if (!lastContinuationConcept) { await loadContinuity(); }
    
    // Ensure we're not in MCQ mode when teaching
    awaitingMCQ = false;
    mcqActive = false;
    
    // Show immediate placeholder so the card isn't blank
    if (currentConversation.length === 0) {
      setConversationPlaceholder(`Preparing a concept about ${topic}...`);
    }
    const lastAssistant = currentConversation.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
    const req = currentConversation.length === 0
      ? (lastContinuationConcept
          ? `Teach about ${topic} continuing from: "${lastContinuationConcept}". Maximum 30 words, no markdown.`
          : `Teach about ${topic}. Maximum 30 words, no markdown.`)
      : `Following from the last message, continue to teach the user a new concept about ${topic} in ~2 sentences. Maximum 30 words, no markdown.`;
    
    const resp = await chrome.runtime.sendMessage({ 
      type: 'FW_CHAT', 
      conversationHistory: currentConversation,
      mode: 'teach',
      teachingPrompt: req
    });
    
    if (resp?.ok && resp.reply) {
      currentConversation.push({ role: 'assistant', content: resp.reply });
      
      // NEVER show MCQ interface for teaching responses
      updateConversationUI();
      
      // Show ask UI after any teaching response (first or subsequent)
      const overlay = document.getElementById(OVERLAY_ID);
      if (overlay) {
        const ask = overlay.querySelector('#fw-ask');
        if (ask) ask.style.display = 'flex';
        
        // Hide MCQ options when Learn More is clicked
        const mcqOptions = overlay.querySelector('#fw-mcq-options');
        if (mcqOptions) mcqOptions.style.display = 'none';
        mcqActive = false;
      }
      
      // Save session after teaching
      await saveSession();
    } else {
      setConversationPlaceholder(`Error: Could not reach AI service. Please ensure servers are running (3131, 3132).`);
    }
  }

  async function requestMCQ() {
    const topic = await ensureTopic();
    const lastAssistant = currentConversation.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
    const recentTeaching = currentConversation
      .filter(m => m.role === 'assistant' && !m.content.includes('A)') && !m.content.includes('B)'))
      .slice(-2)
      .map(m => m.content)
      .join(' ');
    
    const req = `Based on this recent teaching: "${recentTeaching}"

Generate one multiple-choice question that directly tests understanding of the concepts just taught. The question should be about ${topic} and specifically relate to the teaching content above.

After the question, list options exactly as A) ..., B) ..., C) ..., D) ... on new lines. 
- Make option A, B, C, or D the correct answer based on the teaching content
- Make the other options plausible but clearly incorrect
- Do not include any labels like "Correct Answer"
- Do not use markdown or headings
- Keep the question to one sentence
- Ensure the correct answer directly reflects what was just taught
- IMPORTANT: Randomize which position (A, B, C, or D) contains the correct answer - do not always put it in position A`;

    awaitingMCQ = true;
    const resp = await chrome.runtime.sendMessage({ 
      type: 'FW_CHAT', 
      conversationHistory: currentConversation,
      mode: 'quiz',
      quizPrompt: req
    });
    if (resp?.ok && resp.reply) {
      currentConversation.push({ role: 'assistant', content: resp.reply });
      
      // Check if this is an MCQ response
      if (resp.phase === 'quiz') {
        const mcq = detectMCQ(resp.reply);
        if (mcq) {
          showMCQInterface(document.getElementById(OVERLAY_ID), mcq);
        }
      }
      
      updateConversationUI();
      // Ensure action bar remains visible under MCQ so user can choose to learn/quiz again after a correct answer
      const overlay = document.getElementById(OVERLAY_ID);
      if (overlay) {
        const actions = overlay.querySelector('#fw-actions');
        if (actions) actions.style.display = 'flex';
      }
    } else {
      setConversationPlaceholder(`Error: Could not reach AI service. Please ensure servers are running (3131, 3132).`);
    }
  }

  function updateConversationUI() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;

    // Update conversation display
    let conversationDiv = overlay.querySelector('.fw-conversation');
    if (!conversationDiv) {
      conversationDiv = document.createElement('div');
      conversationDiv.className = 'fw-conversation';
      conversationDiv.id = 'fw-conversation';
      const anchor = overlay.querySelector('#fw-actions');
      if (anchor) {
        overlay.querySelector('.fw-card').insertBefore(conversationDiv, anchor);
      } else {
        overlay.querySelector('.fw-card').appendChild(conversationDiv);
      }
    }

    // Detect MCQ only when explicitly requested
    const lastMsg = currentConversation[currentConversation.length - 1];
    let mcq = null;
    if (awaitingMCQ && lastMsg && lastMsg.role === 'assistant') {
      mcq = detectMCQ(lastMsg.content);
    }

    // Show recent conversation (last 6 messages), exclude MCQ messages from chat display
    const recentMessages = currentConversation.slice(-6);
    const messagesToRender = mcq ? recentMessages.slice(0, -1) : recentMessages;
    conversationDiv.innerHTML = messagesToRender.map(msg => {
      const isMCQ = detectMCQ(msg.content);
      const messageClass = isMCQ ? 'conv-message assistant mcq-question' : `conv-message ${msg.role}`;
      
      // Don't render MCQ messages in chat - they'll be shown as bubbles
      if (isMCQ) {
        return '';
      }
      
      return `
        <div class="${messageClass}">
        <div class="conv-text">${sanitizeText(msg.content)}</div>
      </div>
      `;
    }).join('');

    if (mcq) { 
      showMCQInterface(overlay, mcq); 
    } else { 
      // Keep MCQ visible if currently active (e.g., after hints/feedback)
      if (!mcqActive) {
        hideMCQInterface(overlay);
      }
    }

    // Update help text
    const helpDiv = overlay.querySelector('#fw-help');
    if (helpDiv) {
      helpDiv.textContent = `Quick brain warmup to get focused.`;
    }

    // Scroll conversation to bottom
    conversationDiv.scrollTop = conversationDiv.scrollHeight;
  }

  function removeOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (el) el.remove();
    try {
      document.documentElement.style.overflow = '';
      document.body && (document.body.style.overflow = '');
      document.body && (document.body.style.position = '');
    } catch (_) {}
  }

  function detectMCQ(text) {
    // Look for A) B) C) D) pattern or A. B. C. D. pattern
    const pattern = /([A-D][\)\.])\s*([^A-D\n][\s\S]*?)(?=\s+[A-D][\)\.]|$)/g;
    const options = [];
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      options.push({
        letter: match[1].charAt(0),
        text: match[2].trim()
      });
    }
    
    if (options.length >= 4) {
      // Extract the question (everything before the first option)
      const firstOptionIndex = text.search(/[A-D][\)\.]/);
      const question = firstOptionIndex > 0 ? text.substring(0, firstOptionIndex).trim() : text;
      
      return {
        question,
        options
      };
    }
    
    return null;
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

  function formatMCQOptions(text) {
    // Check if this looks like MCQ content (contains A) B) C) D) pattern)
    if (!/[A-D][\)\.]\s*[^A-D]/.test(text)) {
      return text;
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



  function showMCQInterface(overlay, mcqData) {
    const mcqOptions = overlay.querySelector('#fw-mcq-options');
    const actions = overlay.querySelector('#fw-actions');
    
    // Hide action buttons when showing MCQ
    if (actions) actions.style.display = 'none';
    if (mcqOptions) {
      mcqOptions.style.display = 'none'; // Hide the grid layout
      awaitingMCQ = false;
      mcqActive = true;
      
      // Show the MCQ question and options in the conversation
      const conversation = overlay.querySelector('#fw-conversation');
      if (conversation) {
        // Add the question with orange styling
        const qDiv = document.createElement('div');
        qDiv.className = 'conv-message assistant mcq-question';
        qDiv.innerHTML = `<div class="conv-text">${sanitizeText(mcqData.question)}</div>`;
        conversation.appendChild(qDiv);
        
        // Add each option as a separate bubble
        mcqData.options.forEach((option, index) => {
          const optionDiv = document.createElement('div');
          optionDiv.className = 'conv-message user mcq-option-bubble';
          optionDiv.setAttribute('data-choice', String.fromCharCode(65 + index)); // A, B, C, D
          optionDiv.innerHTML = `<div class="conv-text">${String.fromCharCode(65 + index)}) ${option.text}</div>`;
          optionDiv.style.cursor = 'pointer';
          optionDiv.onclick = () => selectMCQOption(optionDiv);
          conversation.appendChild(optionDiv);
        });
        
        conversation.scrollTop = conversation.scrollHeight;
      }
    }
  }

  function hideMCQInterface(overlay) {
    const mcqOptions = overlay.querySelector('#fw-mcq-options');
    const actions = overlay.querySelector('#fw-actions');
    
    if (actions) actions.style.display = 'flex';
    if (mcqOptions) mcqOptions.style.display = 'none';
  }





  function selectMCQOption(selectedOption) {
    // Remove selected class from all option bubbles first
    document.querySelectorAll('.mcq-option-bubble').forEach(opt => {
      opt.classList.remove('selected', 'error', 'correct');
    });
    
    // Add selected class to the clicked option
    selectedOption.classList.add('selected');
    const choice = selectedOption.getAttribute('data-choice');
    setTimeout(() => handleMCQAnswer(choice), 300);
  }

  async function handleMCQAnswer(choice) {
    // Evaluate via backend for correctness
    const lastAssistant = currentConversation.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
    const evalResp = await chrome.runtime.sendMessage({ type: 'FW_EVALUATE_MCQ', question: lastAssistant, answer: choice, conversationHistory: currentConversation });
    const overlay = document.getElementById(OVERLAY_ID);
    const mcqOptionBubbles = overlay?.querySelectorAll('.mcq-option-bubble');
    
    if (evalResp?.ok && evalResp.result) {
      const isCorrect = !!evalResp.result.correct;
      const feedback = evalResp.result.feedback || (isCorrect ? 'Correct!' : 'Not quite, try again.');
      
      // Visual feedback on option bubbles
      mcqOptionBubbles?.forEach(opt => {
        const letter = opt.getAttribute('data-choice');
        opt.classList.remove('selected','error','correct');
        if (letter === choice) {
          opt.classList.add(isCorrect ? 'correct' : 'error');
        }
        // Disable clicking options after a selection
        opt.style.pointerEvents = 'none';
      });

      // Add feedback bubble with explanation
      if (overlay) {
        const conversation = overlay.querySelector('#fw-conversation');
        if (conversation) {
          const fbDiv = document.createElement('div');
          fbDiv.className = 'conv-message assistant';
          
          if (isCorrect) {
            // For correct answers, provide a brief explanation
            const explanationPrompt = `The user correctly answered "${choice}" to this question: "${lastAssistant}". Provide a brief explanation (1-2 sentences) of why this answer is correct. Keep it concise and educational.`;
            
            const explanationResp = await chrome.runtime.sendMessage({ 
              type: 'FW_CHAT', 
              conversationHistory: currentConversation,
              mode: 'explain',
              teachingPrompt: explanationPrompt
            });
            
            const explanation = explanationResp?.ok && explanationResp.reply ? explanationResp.reply : feedback;
            fbDiv.innerHTML = `<div class="conv-text">✅ Correct! ${sanitizeText(explanation)}</div>`;
          } else {
            // For incorrect answers, provide the correct answer
            const correctAnswer = evalResp.result.correctAnswer || 'A';
            fbDiv.innerHTML = `<div class="conv-text">❌ Not quite. The correct answer is ${correctAnswer}. ${sanitizeText(feedback)}</div>`;
          }
          
          conversation.appendChild(fbDiv);
          // Auto-scroll to show the feedback
          setTimeout(() => {
            conversation.scrollTop = conversation.scrollHeight;
          }, 100);
        }
        // After answer, restore action buttons
        const teachBtn = overlay.querySelector('#fw-teach');
        const quizBtn = overlay.querySelector('#fw-quiz');
        const exitBtn = overlay.querySelector('#fw-exit');
        const hintBtn = overlay.querySelector('#fw-hint');
        
        // Always restore main action buttons
        if (hintBtn) hintBtn.style.display = 'none';
        if (teachBtn) teachBtn.style.display = 'inline-block';
        if (quizBtn) {
          quizBtn.style.display = 'inline-block';
          // Require Learn More again before next quiz
          quizBtn.classList.add('disabled');
          quizBtn.setAttribute('title','Click Learn More first');
        }
        
        // Show ask input again
        const ask = overlay.querySelector('#fw-ask');
        if (ask) ask.style.display = 'flex';
        
        // Hide MCQ options
        const mcqOptions = overlay.querySelector('#fw-mcq-options');
        if (mcqOptions) mcqOptions.style.display = 'none';
        mcqActive = false;
      }

      if (isCorrect) {
        // Show exit CTA and keep conversation below options
        const exitBtn = overlay?.querySelector('#fw-exit');
        hasAnsweredMCQCorrectly = true;
        quizCount++;
        
        // Only show exit button after answering correctly
        if (exitBtn) exitBtn.style.display = 'inline-block';
        
        // Save session when user completes a quiz correctly
        await saveSession();
      } else {
        // Offer retry: keep options visible and add a small hint text
        if (overlay) {
          const helpDiv = overlay.querySelector('#fw-help');
          if (helpDiv) helpDiv.textContent = 'Not quite—try again!';
          // Re-enable options for retry
          mcqOptions?.forEach(opt => opt.style.pointerEvents = 'auto');
        }
      }
    } else {
      // Evaluation error
      if (overlay) {
        const helpDiv = overlay.querySelector('#fw-help');
        if (helpDiv) helpDiv.textContent = 'Error evaluating answer. Please try again.';
        
        // Restore buttons even on error
        const teachBtn = overlay.querySelector('#fw-teach');
        const quizBtn = overlay.querySelector('#fw-quiz');
        const hintBtn = overlay.querySelector('#fw-hint');
        const ask = overlay.querySelector('#fw-ask');
        
        if (hintBtn) hintBtn.style.display = 'none';
        if (teachBtn) teachBtn.style.display = 'inline-block';
        if (quizBtn) {
          quizBtn.style.display = 'inline-block';
          quizBtn.classList.add('disabled');
          quizBtn.setAttribute('title','Click Learn More first');
        }
        if (ask) ask.style.display = 'flex';
        
        // Hide MCQ options
        const mcqOptions = overlay.querySelector('#fw-mcq-options');
        if (mcqOptions) mcqOptions.style.display = 'none';
        mcqActive = false;
      }
    }
  }

  async function saveSession() {
    try {
      const host = location.hostname;
      const topic = currentTopic || 'General';
      // Only save if we had any assistant content
      const hasAssistant = currentConversation.some(m => m.role === 'assistant');
      if (!hasAssistant) return;
      // Persist continuity (topic + last concept) for next session
      const lastAssistantMsg = currentConversation.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
      lastContinuationConcept = lastAssistantMsg;
      await chrome.storage.local.set({ fwLastTopic: topic, fwLastConcept: lastAssistantMsg });
      await chrome.runtime.sendMessage({
        type: 'FW_COMPLETE_TASK',
        host,
        topic,
        conversation: currentConversation
      });
      
      // Save topic conversation for continuity
      await chrome.runtime.sendMessage({
        type: 'FW_SAVE_TOPIC_CONVERSATION',
        topic: currentTopic,
        conversation: currentConversation
      });
      
      // Mark popup as completed (user successfully answered MCQ)
      await chrome.runtime.sendMessage({
        type: 'FW_POPUP_COMPLETED',
        host: location.hostname
      });
    } catch (_) {}
  }

  async function computeDelayMs() {
    try {
      const settingsResp = await chrome.runtime.sendMessage({ type: 'FW_GET_SETTINGS' });
      const settings = settingsResp?.settings;
      const breakResp = await chrome.runtime.sendMessage({ type: 'FW_GET_BREAK', host: location.hostname });
      const minutes = breakResp?.minutes || 5;
      return settings?.timers?.devFast ? Math.max(1, minutes) * 1000 : Math.max(1, minutes) * 60 * 1000;
    } catch (_) {
      return 5000;
    }
  }



  async function runOnce() {
    try {
      const { fwSettings } = await chrome.storage.sync.get(['fwSettings']);
      const currentHost = location.hostname.replace(/^www\./, '').toLowerCase();
      
      // Check if current site matches any enabled distraction site
      const site = fwSettings?.distractionSites?.find(s => {
        const siteHost = s.host.toLowerCase();
        // Exact match or subdomain match
        return currentHost === siteHost || currentHost.endsWith('.' + siteHost);
      });
      
      if (!site?.enabled) return;
      
      // Track site visit start
      await chrome.runtime.sendMessage({ 
        type: 'FW_SITE_VISIT_START', 
        host: location.hostname 
      });
      
    } catch (err) {
      return;
    }

    // Check if there's a pending popup for this site (user refreshed without completing)
    const pendingCheck = await chrome.runtime.sendMessage({ 
      type: 'FW_CHECK_PENDING_POPUP', 
      host: location.hostname 
    });
    
    if (pendingCheck?.hasPending) {
      // User refreshed without completing the popup - show immediately
      console.log('Focus Warmup: Detected page refresh without popup completion. Showing popup immediately.');
      currentConversation = [];
      teachCount = 0;
      quizCount = 0;
      awaitingMCQ = false;
      hasAnsweredMCQCorrectly = false;
      createOverlay();
      return;
    }

    const delay = await computeDelayMs();
    setTimeout(() => {
      currentConversation = [];
      teachCount = 0;
      quizCount = 0;
      awaitingMCQ = false;
      hasAnsweredMCQCorrectly = false;
      createOverlay();
    }, delay);
  }

  function scheduleNextCycle() { runOnce(); }

  // Handle page unload - if user navigates away without completing popup, 
  // the pending popup will remain and show immediately on return
  window.addEventListener('beforeunload', async () => {
    // Track site visit end
    try {
      await chrome.runtime.sendMessage({ 
        type: 'FW_SITE_VISIT_END', 
        host: location.hostname 
      });
    } catch (err) {
      // Ignore errors on page unload
    }
    
    // The pending popup state is preserved in chrome.storage.local
    // so if user refreshes or navigates back, it will show immediately
  });

  runOnce();
})();