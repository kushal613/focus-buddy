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
  let mcqCompleted = false; // Track if MCQ has been completed and should stay in grid
  let hasPDFContent = false;
  let pdfDocuments = [];
  let lastCorrectAnswer = null; // Store the correct answer for highlighting
  
  // Helper function for common DOM queries
  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }
  
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
        
        // Show ask UI and hide MCQ options when Learn More is clicked
        const ask = overlay.querySelector('#fw-ask');
        if (ask) ask.style.display = 'flex';
        
        // Hide MCQ options when Learn More is clicked, regardless of completion status
        const mcqOptions = overlay.querySelector('#fw-mcq-options');
        if (mcqOptions) mcqOptions.style.display = 'none';
        mcqActive = false;
        // Don't reset mcqCompleted - let the context preservation logic handle it
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
      console.log('Focus Warmup: Added user message to conversation:', q);
      
      // Create a specific prompt for user questions with length limit
      const userQuestionPrompt = `The user asked: "${q}"

Please provide a concise answer to their question. Keep your response to 2-3 sentences maximum (<= 50 words). Be helpful and specific, but brief. No markdown or headings.`;
      
      const resp = await chrome.runtime.sendMessage({ 
        type: 'FW_CHAT', 
        conversationHistory: currentConversation.concat([{ role: 'user', content: userQuestionPrompt }])
      });
      
      if (resp?.ok && resp.reply) {
        currentConversation.push({ role: 'assistant', content: resp.reply });
        console.log('Focus Warmup: Added assistant message to conversation:', resp.reply);
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
      console.log('Focus Warmup: Exit button clicked, hasAnsweredMCQCorrectly:', hasAnsweredMCQCorrectly);
      
      // Save session if user completed an MCQ correctly OR if there's meaningful conversation
      const hasAssistant = currentConversation.some(m => m.role === 'assistant');
      const hasUser = currentConversation.some(m => m.role === 'user');
      
      if (hasAnsweredMCQCorrectly || (hasAssistant && hasUser)) {
        console.log('Focus Warmup: Saving session on exit - MCQ completed or meaningful conversation exists');
        await saveSession();
      } else {
        console.log('Focus Warmup: No meaningful conversation to save on exit');
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
    
    console.log('Focus Warmup: ensureTopic called, currentTopic:', currentTopic, 'currentConversation length:', currentConversation.length);
    
    if (!currentTopic) {
      try {
        // Get next topic in rotation with conversation context
        const next = await chrome.runtime.sendMessage({ type: 'FW_GET_NEXT_TOPIC' });
        console.log('Focus Warmup: Got next topic response:', next);
        if (next?.ok && next.topic) {
          currentTopic = next.topic;
          
          // Load existing conversation for this topic
          if (next.conversation && next.conversation.length > 0) {
            currentConversation = [...next.conversation];
            console.log(`Focus Warmup: Loaded existing conversation for ${currentTopic} (${currentConversation.length} messages)`);
            console.log('Focus Warmup: Loaded conversation:', currentConversation);
          } else {
            console.log('Focus Warmup: No existing conversation found, starting fresh');
            currentConversation = [];
          }
        } else {
          // Fallback only if background fails
          const { fwSettings } = await chrome.storage.sync.get(['fwSettings']);
          const topics = Array.isArray(fwSettings?.topics) && fwSettings.topics.length > 0 ? fwSettings.topics : ["General"];
          currentTopic = topics[0];
          console.log('Focus Warmup: Using fallback topic:', currentTopic);
          currentConversation = [];
        }
      } catch (_) { 
        // Fallback if all else fails
        const { fwSettings } = await chrome.storage.sync.get(['fwSettings']);
        const topics = Array.isArray(fwSettings?.topics) && fwSettings.topics.length > 0 ? fwSettings.topics : ["General"];
        currentTopic = topics[0];
        console.log('Focus Warmup: Using error fallback topic:', currentTopic);
        currentConversation = [];
      }
    } else {
      console.log('Focus Warmup: Using existing topic:', currentTopic, 'with conversation length:', currentConversation.length);
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
    
    console.log('Focus Warmup: requestTeaching called with conversation length:', currentConversation.length);
    console.log('Focus Warmup: Current conversation:', currentConversation);
    
    // Ensure we're not in MCQ mode when teaching
    awaitingMCQ = false;
    mcqActive = false;
    
    // Show immediate placeholder so the card isn't blank
    // But only if we're not in a context preservation scenario
    const hasMCQQuestion = currentConversation.some(msg => detectMCQ(msg.content));
    const hasMCQFeedback = currentConversation.some(msg => msg.content.includes('Correct!') || msg.content.includes('Not quite'));
    const shouldPreserveContext = hasMCQQuestion && hasMCQFeedback;
    
    if (currentConversation.length === 0 && !shouldPreserveContext) {
      console.log('Focus Warmup: Conversation is empty and not preserving context, showing placeholder');
      setConversationPlaceholder(`Preparing a concept about ${topic}...`);
    } else {
      console.log('Focus Warmup: Conversation has messages or preserving context, not showing placeholder');
      // If we have messages but they're not visible, render them
      if (currentConversation.length > 0) {
        console.log('Focus Warmup: Rendering existing conversation');
        updateConversationUI();
      }
    }
    const lastAssistant = currentConversation.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
    const req = currentConversation.length === 0
      ? (lastContinuationConcept
          ? `Teach about ${topic} continuing from: "${lastContinuationConcept}". Maximum 30 words, no markdown.`
          : `Teach about ${topic}. Maximum 30 words, no markdown.`)
      : `System: You are a concise teacher. The user already learned: "${lastAssistant}". Teach a DIFFERENT concept about ${topic} in exactly 2 sentences. Maximum 30 words total. No markdown.`;
    
    const resp = await chrome.runtime.sendMessage({ 
      type: 'FW_CHAT', 
      conversationHistory: currentConversation,
      mode: 'teach',
      teachingPrompt: req
    });
    
    if (resp?.ok && resp.reply) {
      console.log('Focus Warmup: Teaching response received:', resp.reply);
      console.log('Focus Warmup: Current conversation before adding new message:', currentConversation.length, 'messages');
      
      currentConversation.push({ role: 'assistant', content: resp.reply });
      
      console.log('Focus Warmup: Current conversation after adding new message:', currentConversation.length, 'messages');
      
      // Check if we're preserving context (after a quiz)
      const hasMCQQuestion = currentConversation.some(msg => detectMCQ(msg.content));
      const hasMCQFeedback = currentConversation.some(msg => msg.content.includes('Correct!') || msg.content.includes('Not quite'));
      const shouldPreserveContext = hasMCQQuestion && hasMCQFeedback;
      
      console.log('Focus Warmup: Context preservation check:', {
        hasMCQQuestion,
        hasMCQFeedback,
        shouldPreserveContext,
        conversationLength: currentConversation.length
      });
      
      if (shouldPreserveContext) {
        console.log('Focus Warmup: Preserving context - appending new message without rebuilding');
        // When preserving context, just append the new message without rebuilding
        const overlay = document.getElementById(OVERLAY_ID);
        if (overlay) {
          const conversation = overlay.querySelector('#fw-conversation');
          if (conversation) {
            // Ensure the conversation div exists and has the existing messages
            // If the conversation is empty or doesn't have the expected messages, rebuild it first
            const existingMessages = conversation.querySelectorAll('.conv-message');
            if (existingMessages.length === 0) {
              // If no messages are visible, rebuild the conversation to show all existing messages
              console.log('Focus Warmup: No visible messages found, rebuilding conversation first');
              updateConversationUI();
              // Get the conversation div again after rebuilding
              const rebuiltConversation = overlay.querySelector('#fw-conversation');
              if (rebuiltConversation) {
                const newMessageDiv = document.createElement('div');
                newMessageDiv.className = 'conv-message assistant';
                newMessageDiv.innerHTML = `<div class="conv-text">${sanitizeText(resp.reply)}</div>`;
                rebuiltConversation.appendChild(newMessageDiv);
                rebuiltConversation.scrollTop = rebuiltConversation.scrollHeight;
                console.log('Focus Warmup: New message appended after rebuilding');
              }
            } else {
              // Messages are already visible, just append the new one
              const newMessageDiv = document.createElement('div');
              newMessageDiv.className = 'conv-message assistant';
              newMessageDiv.innerHTML = `<div class="conv-text">${sanitizeText(resp.reply)}</div>`;
              conversation.appendChild(newMessageDiv);
              conversation.scrollTop = conversation.scrollHeight;
              console.log('Focus Warmup: New message appended successfully');
            }
          }
          
          // Show ask UI
          const ask = overlay.querySelector('#fw-ask');
          if (ask) ask.style.display = 'flex';
          
          // Hide MCQ options when Learn More is clicked
          const mcqOptions = overlay.querySelector('#fw-mcq-options');
          if (mcqOptions) mcqOptions.style.display = 'none';
          mcqActive = false;
        }
        
        // IMPORTANT: Don't call updateConversationUI() when preserving context
        console.log('Focus Warmup: Skipping updateConversationUI() to preserve context');
        return; // Exit early to prevent any further processing
      } else {
        console.log('Focus Warmup: Normal teaching - using updateConversationUI');
        // For normal teaching (not after quiz), use the normal update
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
      }
      
      // Save session after teaching, but only if not preserving context
      if (!shouldPreserveContext) {
        console.log('Focus Warmup: Normal teaching - saving session');
        await saveSession();
      } else {
        console.log('Focus Warmup: Context preservation mode - skipping save during teaching (will save on MCQ completion)');
      }
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
    
    const req = `Create a multiple-choice question about ${topic} based on: "${recentTeaching}"

Format exactly like this:
Question here?

A) First option
B) Second option  
C) Third option
D) Fourth option

Keep question to one sentence. Make one option correct, others wrong. No markdown.`;

    console.log('Focus Warmup: Requesting MCQ with prompt:', req);
    console.log('Focus Warmup: Topic:', topic);
    console.log('Focus Warmup: Recent teaching:', recentTeaching);

    awaitingMCQ = true;
    mcqCompleted = false; // Reset completed flag for new quiz
    lastCorrectAnswer = null; // Reset correct answer for new quiz
    const resp = await chrome.runtime.sendMessage({ 
      type: 'FW_CHAT', 
      conversationHistory: currentConversation,
      mode: 'quiz',
      quizPrompt: req
    });
    
    console.log('Focus Warmup: MCQ response received:', resp);
    
    if (resp?.ok && resp.reply) {
      console.log('Focus Warmup: MCQ content:', resp.reply);
      currentConversation.push({ role: 'assistant', content: resp.reply });
      
      // Always try to detect MCQ for quiz responses
      if (resp.phase === 'quiz') {
        console.log('Quiz response received, phase:', resp.phase);
        console.log('Response content:', resp.reply);
        const mcq = detectMCQ(resp.reply);
        console.log('MCQ detection result:', mcq);
        if (mcq) {
          console.log('Showing MCQ interface with:', mcq);
          showMCQInterface(document.getElementById(OVERLAY_ID), mcq);
        } else {
          // If MCQ detection fails, show the raw response
          console.log('MCQ detection failed, showing raw response');
          updateConversationUI();
        }
      } else {
        console.log('Non-quiz response, phase:', resp.phase);
        updateConversationUI();
      }
      
      // Ensure action bar remains visible under MCQ so user can choose to learn/quiz again after a correct answer
      const overlay = document.getElementById(OVERLAY_ID);
      if (overlay) {
        const actions = overlay.querySelector('#fw-actions');
        if (actions) actions.style.display = 'flex';
      }
    } else {
      console.error('Focus Warmup: MCQ request failed:', resp);
      setConversationPlaceholder(`Error: Could not reach AI service. Please ensure servers are running (3131, 3132).`);
    }
  }

  function updateConversationUI() {
    console.log('Focus Warmup: updateConversationUI called');
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    
    // Check if we're preserving context (after a quiz)
    const hasMCQQuestion = currentConversation.some(msg => detectMCQ(msg.content));
    const hasMCQFeedback = currentConversation.some(msg => msg.content.includes('Correct!') || msg.content.includes('Not quite'));
    const shouldPreserveContext = hasMCQQuestion && hasMCQFeedback;
    
    console.log('Focus Warmup: updateConversationUI context check:', {
      hasMCQQuestion,
      hasMCQFeedback,
      shouldPreserveContext,
      conversationLength: currentConversation.length
    });
    
    // If we're preserving context, we still need to render the conversation
    // but we'll handle it differently to ensure all messages are shown
    if (shouldPreserveContext) {
      console.log('Focus Warmup: updateConversationUI called with context preservation - rendering all messages');
    }

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

    // Detect MCQ only when explicitly requested for a quiz
    const lastMsg = currentConversation[currentConversation.length - 1];
    let mcq = null;
    if (awaitingMCQ && lastMsg && lastMsg.role === 'assistant') {
      mcq = detectMCQ(lastMsg.content);
    }
    
    // Don't treat teaching responses as MCQ even if they contain quiz-like content
    if (!awaitingMCQ && lastMsg && lastMsg.role === 'assistant') {
      mcq = null; // Force mcq to null for teaching responses
    }

    // Show recent conversation, preserving all messages when Learn More is clicked
    // When Learn More is clicked after a quiz, show all messages to preserve context
    
    console.log('Focus Warmup: Conversation state', {
      totalMessages: currentConversation.length,
      hasMCQQuestion,
      hasMCQFeedback,
      shouldPreserveContext,
      mcqActive,
      mcqCompleted
    });
    
    // When preserving context (after quiz), show all messages. Otherwise show recent ones
    const messagesToRender = shouldPreserveContext ? currentConversation : currentConversation.slice(-6);
    const finalMessages = mcq ? messagesToRender.slice(0, -1) : messagesToRender;
    
    console.log('Focus Warmup: Final message selection:', {
      shouldPreserveContext,
      messagesToRenderLength: messagesToRender.length,
      finalMessagesLength: finalMessages.length,
      mcq: !!mcq,
      mcqActive,
      mcqCompleted
    });
    
    console.log('Focus Warmup: Messages to render:', {
      shouldPreserveContext,
      totalMessages: currentConversation.length,
      messagesToRenderLength: messagesToRender.length,
      finalMessagesLength: finalMessages.length,
      mcq: !!mcq
    });
    
    // Only update conversation if we have messages to show
    if (finalMessages.length > 0) {
      console.log('Focus Warmup: Building conversation HTML with', finalMessages.length, 'messages');
      
      // Build the conversation HTML - show ALL messages when preserving context
      let conversationHTML = '';
      
      for (const msg of finalMessages) {
        const isMCQ = detectMCQ(msg.content);
        const messageClass = isMCQ ? 'conv-message assistant mcq-question' : `conv-message ${msg.role}`;
        
        console.log('Focus Warmup: Processing message:', {
          content: msg.content.substring(0, 50) + '...',
          isMCQ,
          messageClass,
          shouldPreserveContext,
          includesCorrect: msg.content.includes('Correct!'),
          includesNotQuite: msg.content.includes('Not quite')
        });
        
        // When preserving context, show ALL messages without any filtering
        if (shouldPreserveContext) {
          // Check if this is MCQ content and we should highlight the correct answer
          let contentToDisplay = sanitizeText(msg.content);
          if (isMCQ && hasAnsweredMCQCorrectly) {
            contentToDisplay = highlightCorrectAnswerInText(msg.content);
          }
          
          conversationHTML += `
            <div class="${messageClass}">
            <div class="conv-text">${contentToDisplay}</div>
          </div>
          `;
          console.log('Focus Warmup: Added message to conversation (preserving context)');
        } else {
          // For normal cases, only filter out the original MCQ question when it's actively being displayed in the grid
          const isOriginalMCQ = isMCQ && !msg.content.includes('Correct!') && !msg.content.includes('Not quite');
          // When preserving context, don't filter out any messages
          if (shouldPreserveContext || !(isOriginalMCQ && mcqActive && !mcqCompleted)) {
            // Check if this is MCQ content and we should highlight the correct answer
            let contentToDisplay = sanitizeText(msg.content);
            if (isMCQ && hasAnsweredMCQCorrectly) {
              contentToDisplay = highlightCorrectAnswerInText(msg.content);
            }
            
            conversationHTML += `
              <div class="${messageClass}">
            <div class="conv-text">${contentToDisplay}</div>
          </div>
          `;
            console.log('Focus Warmup: Added message to conversation (normal case)');
          } else {
            console.log('Focus Warmup: Filtered out message (normal case)');
          }
        }
      }
      
      console.log('Focus Warmup: Setting conversation HTML, length:', conversationHTML.length);
      
      // Set the conversation HTML
      conversationDiv.innerHTML = conversationHTML;
    }

    if (mcq) { 
      showMCQInterface(overlay, mcq); 
    } else { 
      // Keep MCQ interface visible if completed, only hide if not active and not completed
      if (!mcqActive && !mcqCompleted) {
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


  
  function highlightCorrectAnswerInText(text) {
    // First sanitize the text
    let processedText = sanitizeText(text);
    
    // Find the correct answer from the conversation history
    const correctAnswer = findCorrectAnswerFromHistory();
    console.log('Focus Warmup: highlightCorrectAnswerInText called with correctAnswer:', correctAnswer);
    
    if (!correctAnswer) {
      console.log('Focus Warmup: No correct answer found, returning original text');
      return processedText;
    }
    
    // Check if this text contains MCQ options
    if (!/[A-D][\)\.]\s*[^A-D]/.test(processedText)) {
      console.log('Focus Warmup: No MCQ options found in text');
      return processedText;
    }
    
    // Ensure proper formatting of MCQ options with line breaks
    processedText = formatMCQOptions(processedText);
    
    // Highlight the correct answer with green text
    const highlightedText = processedText.replace(
      new RegExp(`(${correctAnswer}[\)\.]\\s*.*?)(?=<br>|$)`, 'g'), // Capture up to next <br> or end of string
      `<span style="color: #28a745; font-weight: bold;">$1</span>`
    );
    
    // Add a note below the question
    const questionEndIndex = highlightedText.search(/[A-D][\)\.]/);
    if (questionEndIndex > 0) {
      const beforeOptions = highlightedText.substring(0, questionEndIndex);
      const options = highlightedText.substring(questionEndIndex);
      
      return `${beforeOptions}<br>${options}`;
    }
    
    return highlightedText;
  }
  
  function findCorrectAnswerFromHistory() {
    // First, check if we have the stored correct answer
    if (lastCorrectAnswer) {
      return lastCorrectAnswer;
    }
    
    // Look through the conversation history to find the correct answer
    for (let i = currentConversation.length - 1; i >= 0; i--) {
      const message = currentConversation[i];
      if (message.content.includes('Correct!') || message.content.includes('correct answer is')) {
        // Extract the correct answer letter (A, B, C, or D)
        const match = message.content.match(/correct answer is ([A-D])/i);
        if (match) {
          return match[1];
        }
      }
    }
    
    return null;
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
    console.log('Focus Warmup: detectMCQ called with text:', text.substring(0, 200) + '...');
    
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
    
    console.log('Focus Warmup: detectMCQ found options:', options);
    
    if (options.length >= 4) {
      // Extract the question (everything before the first option)
      const firstOptionIndex = text.search(/[A-D][\)\.]/);
      const question = firstOptionIndex > 0 ? text.substring(0, firstOptionIndex).trim() : text;
      
      const result = {
        question,
        options
      };
      
      console.log('Focus Warmup: detectMCQ returning result:', result);
      return result;
    }
    
    console.log('Focus Warmup: detectMCQ - not enough options found, returning null');
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
    if (!/[A-D][\)\.]/.test(text)) {
      return text;
    }
    
    // Clean up the text first - remove any existing HTML line breaks and normalize whitespace
    text = text.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
    
    // Split the text into question and options
    const firstOptionIndex = text.search(/[A-D][\)\.]/);
    if (firstOptionIndex === -1) {
      return text;
    }
    
    const question = text.substring(0, firstOptionIndex).trim();
    let optionsText = text.substring(firstOptionIndex);
    
    // Split options by the pattern "X)" or "X."
    // This regex captures the option letter and punctuation, and the text following it
    const optionRegex = /([A-D][\)\.])\s*(.*?)(?=\s*[A-D][\)\.]|$)/g;
    let match;
    const options = [];
    while ((match = optionRegex.exec(optionsText)) !== null) {
      options.push(`${match[1]} ${match[2].trim()}`);
    }
    
    // Join options with a single <br>
    const formattedOptions = options.join('<br>');
    
    // Return with one <br> between question and first option
    return `${question}<br>${formattedOptions}`;
  }



  function showMCQInterface(overlay, mcqData) {
    console.log('showMCQInterface called with:', mcqData);
    const mcqOptions = overlay.querySelector('#fw-mcq-options');
    const actions = overlay.querySelector('#fw-actions');
    
    // Hide action buttons when showing MCQ
    if (actions) actions.style.display = 'none';
    if (mcqOptions) {
      awaitingMCQ = false;
      mcqActive = true;
      
      // Show the MCQ question in the conversation
      const conversation = overlay.querySelector('#fw-conversation');
      console.log('Conversation div found:', !!conversation);
      if (conversation) {
        // Add the question with orange styling
        const qDiv = document.createElement('div');
        qDiv.className = 'conv-message assistant mcq-question';
        qDiv.innerHTML = `<div class="conv-text">${sanitizeText(mcqData.question)}</div>`;
        conversation.appendChild(qDiv);
        console.log('Question div added');
        
        conversation.scrollTop = conversation.scrollHeight;
      }
      
      // Populate and show the MCQ options grid
      mcqData.options.forEach((option, index) => {
        const choice = String.fromCharCode(65 + index); // A, B, C, D
        const optionElement = mcqOptions.querySelector(`#mcq-${choice.toLowerCase()}`);
        if (optionElement) {
          // Reset any previous state (correct/error/selected classes)
          optionElement.classList.remove('selected', 'error', 'correct');
          optionElement.style.pointerEvents = 'auto'; // Re-enable clicking
          
          optionElement.textContent = `${choice}) ${option.text}`;
          optionElement.setAttribute('data-choice', choice);
          optionElement.onclick = () => selectMCQOption(optionElement);
          optionElement.style.cursor = 'pointer';
        }
      });
      
      // Show the MCQ options grid
      mcqOptions.style.display = 'grid';
      console.log('MCQ options grid displayed');
    }
  }

  function hideMCQInterface(overlay) {
    const mcqOptions = overlay.querySelector('#fw-mcq-options');
    const actions = overlay.querySelector('#fw-actions');
    
    if (actions) actions.style.display = 'flex';
    if (mcqOptions) mcqOptions.style.display = 'none';
  }





  function selectMCQOption(selectedOption) {
    // Don't remove error/correct classes - keep wrong answers red and correct answers green
    document.querySelectorAll('.mcq-option').forEach(opt => {
      opt.classList.remove('selected'); // Only remove selected class
    });
    
    // Add selected class to the clicked option
    selectedOption.classList.add('selected');
    const choice = selectedOption.getAttribute('data-choice');
    setTimeout(() => handleMCQAnswer(choice), 300);
  }

  async function handleMCQAnswer(choice) {
    // Evaluate via backend for correctness
    const lastAssistant = currentConversation.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
    console.log('Focus Warmup: Evaluating MCQ answer', { choice, question: lastAssistant });
    
    const evalResp = await chrome.runtime.sendMessage({ type: 'FW_EVALUATE_MCQ', question: lastAssistant, answer: choice, conversationHistory: currentConversation });
    console.log('Focus Warmup: MCQ evaluation response:', evalResp);
    
    const overlay = document.getElementById(OVERLAY_ID);
    const mcqOptions = overlay?.querySelectorAll('.mcq-option');
    
    if (evalResp?.ok && evalResp.result) {
      const isCorrect = !!evalResp.result.correct;
      const feedback = evalResp.result.feedback || (isCorrect ? 'Correct!' : 'Not quite, try again.');
      
      console.log('Focus Warmup: MCQ evaluation result', { isCorrect, feedback, result: evalResp.result });
      
      // Visual feedback on option elements
      console.log('Focus Warmup: MCQ answer feedback', { choice, isCorrect });
      mcqOptions?.forEach(opt => {
        const letter = opt.getAttribute('data-choice');
        if (letter === choice) {
          const className = isCorrect ? 'correct' : 'error';
          opt.classList.add(className);
          console.log(`Focus Warmup: Added ${className} class to option ${letter}`);
          
          if (isCorrect) {
            // For correct answers, disable all options
            opt.style.pointerEvents = 'none';
          } else {
            // For wrong answers, keep this option red but allow clicking other options
            opt.style.pointerEvents = 'none'; // Disable this specific option
          }
        } else {
          // For other options, keep them clickable if the answer was wrong
          if (!isCorrect) {
            opt.style.pointerEvents = 'auto';
            opt.classList.remove('selected'); // Only remove selected class, preserve error/correct
          } else {
            opt.style.pointerEvents = 'none';
          }
        }
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
            // For incorrect answers, generate a hint automatically
            const hintPrompt = `The user selected "${choice}" for this question: "${lastAssistant}". This is incorrect. 

Provide a brief explanation of why this answer is wrong and give a helpful hint to guide them toward the correct answer. Keep it educational and encouraging. Do not mention specific answer options (A, B, C, D) or give away the answer. No markdown.`;
            
            console.log('Focus Warmup: Generating hint with prompt:', hintPrompt);
            
            const hintResp = await chrome.runtime.sendMessage({ 
              type: 'FW_CHAT', 
              conversationHistory: currentConversation,
              mode: 'hint',
              teachingPrompt: hintPrompt
            });
            
            console.log('Focus Warmup: Hint response:', hintResp);
            
            let hint = 'That answer is incorrect. Think about the fundamental concepts involved.';
            if (hintResp?.ok && hintResp.reply) {
              hint = hintResp.reply;
              console.log('Focus Warmup: Using AI-generated hint:', hint);
              // If the hint contains the answer (mentions A, B, C, D), replace it with a generic hint
              if (hint.match(/[A-D][\)\.]/) || hint.toLowerCase().includes('correct answer')) {
                console.log('Focus Warmup: Hint contains answer, using fallback');
                hint = 'That answer is incorrect. Think about the fundamental concepts involved.';
              }
            } else {
              console.log('Focus Warmup: AI hint generation failed, using fallback');
            }
            
            fbDiv.innerHTML = `<div class="conv-text">❌ Not quite. ${sanitizeText(hint)}</div>`;
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
        
        // Keep MCQ options visible if completed or if wrong answer (for retry)
        const mcqOptions = overlay.querySelector('#fw-mcq-options');
        if (mcqOptions) {
          if (isCorrect) {
            mcqOptions.style.display = 'grid'; // Keep visible for completed MCQ
            mcqCompleted = true;
          } else {
            mcqOptions.style.display = 'grid'; // Keep visible for wrong answers so user can retry
          }
        }
        mcqActive = false;
      }

      if (isCorrect) {
        // Show exit CTA and keep conversation below options
        const exitBtn = overlay?.querySelector('#fw-exit');
        hasAnsweredMCQCorrectly = true;
        lastCorrectAnswer = choice; // Store the correct answer
        quizCount++;
        
        // Only show exit button after answering correctly
        if (exitBtn) exitBtn.style.display = 'inline-block';
        
        // Save session when user completes a quiz correctly - ALWAYS save regardless of context preservation
        console.log('Focus Warmup: MCQ completed correctly, saving session...');
        await saveSession();
      } else {
        // Wrong answer - keep options visible for retry
        if (overlay) {
          const helpDiv = overlay.querySelector('#fw-help');
          if (helpDiv) helpDiv.textContent = 'Not quite—try again!';
          // Options are already enabled for retry in the visual feedback section above
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
        
        // Hide MCQ options on error
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
      
      if (!hasAssistant) {
        return;
      }
      
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
      
    } catch (err) {
      console.error('Focus Warmup: Error saving session:', err);
    }
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
      // Don't reset currentConversation here - let ensureTopic() load it from storage
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