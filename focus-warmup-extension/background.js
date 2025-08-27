// Focus Warmup - Background Service Worker

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

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const existing = await chrome.storage.sync.get(["fwSettings"]);
    if (!existing?.fwSettings) {
      await chrome.storage.sync.set({ fwSettings: DEFAULT_SETTINGS });
    }
    const metaExisting = await chrome.storage.sync.get(["fwMeta"]);
    if (!metaExisting?.fwMeta) {
      await chrome.storage.sync.set({ fwMeta: { firstRun: true } });
    }
  } catch (err) {
    console.error("Focus Warmup: Failed to init settings", err);
  }

  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/index.html') });
  }
});

function normalizeHost(hostname) {
  const parts = String(hostname || "").toLowerCase().split(".");
  return parts.length <= 2 ? parts.join(".") : parts.slice(-2).join(".");
}

async function getSettings() {
  const { fwSettings } = await chrome.storage.sync.get(["fwSettings"]);
  return fwSettings || DEFAULT_SETTINGS;
}

async function getState() {
  const { fwState } = await chrome.storage.local.get(["fwState"]);
  return fwState || { 
    perHostBreakMinutes: {}, 
    pendingPopups: {}, 
    siteVisits: {},
    topicConversations: {},
    currentTopicIndex: 0
  };
}

async function setState(next) {
  await chrome.storage.local.set({ fwState: next });
}

async function saveLearningEntry(entry) {
  try {
    const { fwHistory } = await chrome.storage.local.get(['fwHistory']);
    const history = fwHistory || [];

    // Merge with existing entry for same topic/site if present
    const existingIndex = history.findIndex(h => h.topic === entry.topic && h.site === entry.site);
    if (existingIndex >= 0) {
      const existing = history[existingIndex];
      const merged = {
        ...existing,
        // Move timestamp to now to bubble to top
        timestamp: Date.now(),
        // Merge conversations
        conversation: Array.isArray(existing.conversation)
          ? existing.conversation.concat(entry.conversation || [])
          : (entry.conversation || []),
        // Keep lightweight fields for quick search/back-compat
        prompt: (entry.conversation && entry.conversation.find(m => m.role === 'assistant')?.content) || existing.prompt || '',
        answer: (entry.conversation && [...entry.conversation].reverse().find(m => m.role === 'user')?.content) || existing.answer || ''
      };
      // Remove old position and place merged at front
      history.splice(existingIndex, 1);
      history.unshift(merged);
    } else {
      history.unshift(entry);
    }
    await chrome.storage.local.set({ fwHistory: history.slice(0, 100) });
  } catch (err) {
    console.error('Failed to save learning entry', err);
  }
}

async function getLearningHistory() {
  try {
    const { fwHistory } = await chrome.storage.local.get(['fwHistory']);
    const history = fwHistory || [];
    return history;
  } catch (err) {
    console.error('Error getting learning history:', err);
    return [];
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || !message.type) return;

    if (message.type === "FW_GET_SETTINGS") {
      const settings = await getSettings();
      sendResponse({ ok: true, settings });
      return;
    }

    if (message.type === "FW_GET_BREAK") {
      const host = normalizeHost(message.host);
      const settings = await getSettings();
      const state = await getState();
      const current = state.perHostBreakMinutes[host];
      const result = current ?? settings.timers.startingBreakMinutes;
      sendResponse({ ok: true, minutes: result });
      return;
    }

    if (message.type === "FW_GET_NEXT_TOPIC") {
      try {
        const { fwSettings } = await chrome.storage.sync.get(["fwSettings"]);
        const topics = Array.isArray(fwSettings?.topics) && fwSettings.topics.length > 0 ? fwSettings.topics : ["General"];
        const state = await getState();
        
        // Rotate to next topic
        const nextIndex = (state.currentTopicIndex + 1) % topics.length;
        const topic = topics[nextIndex];
        
        // Update state with new topic index
        const nextState = { 
          ...state, 
          currentTopicIndex: nextIndex 
        };
        await setState(nextState);
        
        // Get existing conversation for this topic
        const topicConversation = state.topicConversations[topic] || [];
        
        sendResponse({ 
          ok: true, 
          topic,
          conversation: topicConversation,
          topicIndex: nextIndex
        });
      } catch (e) {
        // If background fails, try to get topics directly and use the first one
        try {
          const { fwSettings } = await chrome.storage.sync.get(["fwSettings"]);
          const topics = Array.isArray(fwSettings?.topics) && fwSettings.topics.length > 0 ? fwSettings.topics : ["General"];
          sendResponse({ 
            ok: true, 
            topic: topics[0],
            conversation: [],
            topicIndex: 0
          });
        } catch (fallbackError) {
          sendResponse({ ok: false });
        }
      }
      return;
    }

    if (message.type === "FW_SAVE_TOPIC_CONVERSATION") {
      try {
        const { topic, conversation } = message;
        const state = await getState();
        const nextState = {
          ...state,
          topicConversations: {
            ...state.topicConversations,
            [topic]: conversation
          }
        };
        await setState(nextState);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false });
      }
      return;
    }

    if (message.type === "FW_GET_TOPIC_CONVERSATION") {
      try {
        const { topic } = message;
        const state = await getState();
        const conversation = state.topicConversations[topic] || [];
        sendResponse({ ok: true, conversation });
      } catch (e) {
        sendResponse({ ok: false });
      }
      return;
    }

    if (message.type === "FW_COMPLETE_TASK") {
      const host = normalizeHost(message.host);
      
      const settings = await getSettings();
      const state = await getState();
      const current = state.perHostBreakMinutes[host] ?? settings.timers.startingBreakMinutes;
      const dec = Math.max(0, Number(settings.timers.decrementMinutes) || 1);
      const next = Math.max(0, current - dec);
      const nextState = { ...state, perHostBreakMinutes: { ...state.perHostBreakMinutes, [host]: next } };
      await setState(nextState);
      
      // Save learning entry to history
      if (message.conversation) {
        const entry = {
          timestamp: Date.now(),
          site: host,
          topic: message.topic || 'General',
          conversation: message.conversation,
          prompt: message.conversation.find(m => m.role === 'assistant')?.content || '',
          answer: message.conversation.find(m => m.role === 'user')?.content || ''
        };
        await saveLearningEntry(entry);
      }
      
      sendResponse({ ok: true, minutes: next });
      return;
    }

    if (message.type === "FW_GET_LEARNING_HISTORY") {
      const history = await getLearningHistory();
      sendResponse({ ok: true, history });
      return;
    }

    if (message.type === "FW_RESET_BREAK") {
      const host = normalizeHost(message.host);
      const settings = await getSettings();
      const state = await getState();
      const nextState = { ...state, perHostBreakMinutes: { ...state.perHostBreakMinutes, [host]: settings.timers.startingBreakMinutes } };
      await setState(nextState);
      sendResponse({ ok: true, minutes: settings.timers.startingBreakMinutes });
      return;
    }

    if (message.type === "FW_POPUP_SHOWN") {
      const host = normalizeHost(message.host);
      const state = await getState();
      const nextState = { 
        ...state, 
        pendingPopups: { 
          ...state.pendingPopups, 
          [host]: { 
            timestamp: Date.now(),
            topic: message.topic || 'General'
          } 
        } 
      };
      await setState(nextState);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "FW_POPUP_COMPLETED") {
      const host = normalizeHost(message.host);
      const state = await getState();
      const nextState = { 
        ...state, 
        pendingPopups: { 
          ...state.pendingPopups 
        } 
      };
      delete nextState.pendingPopups[host];
      await setState(nextState);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "FW_CHECK_PENDING_POPUP") {
      const host = normalizeHost(message.host);
      const state = await getState();
      const pending = state.pendingPopups?.[host];
      sendResponse({ ok: true, hasPending: !!pending, pendingData: pending });
      return;
    }

    if (message.type === "FW_SITE_VISIT_START") {
      const host = normalizeHost(message.host);
      const state = await getState();
      const nextState = { 
        ...state, 
        siteVisits: { 
          ...state.siteVisits, 
          [host]: { 
            ...state.siteVisits[host],
            currentVisit: {
              startTime: Date.now(),
              timestamp: Date.now()
            }
          } 
        } 
      };
      await setState(nextState);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "FW_SITE_VISIT_END") {
      const host = normalizeHost(message.host);
      const state = await getState();
      const currentVisit = state.siteVisits?.[host]?.currentVisit;
      
      if (currentVisit) {
        const duration = Date.now() - currentVisit.startTime;
        const nextState = { 
          ...state, 
          siteVisits: { 
            ...state.siteVisits, 
            [host]: { 
              ...state.siteVisits[host],
              visits: [
                ...(state.siteVisits[host]?.visits || []),
                {
                  startTime: currentVisit.startTime,
                  endTime: Date.now(),
                  duration: duration,
                  timestamp: currentVisit.timestamp
                }
              ],
              currentVisit: null
            } 
          } 
        };
        await setState(nextState);
      }
      
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "FW_GET_SITE_VISITS") {
      const state = await getState();
      sendResponse({ ok: true, siteVisits: state.siteVisits || {} });
      return;
    }



    if (message.type === "FW_CHAT") {
      try {
        const { fwSettings } = await chrome.storage.sync.get(["fwSettings"]);
        const topics = fwSettings?.topics || [];
        const topic = topics[0] || '';
        
        // Check if we have PDF content available
        const hasPDF = fwSettings?.documents && fwSettings.documents.length > 0;
        
        let resp;
        
        // For quiz, hint, and explain requests, always try PDF backend first (even without PDF content)
        // as it has better quiz handling
        if (message.mode === 'quiz' || message.mode === 'hint' || message.mode === 'explain' || hasPDF) {
          // Try PDF backend first
          try {
            resp = await fetch("http://localhost:3132/prompt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                conversationHistory: message.conversationHistory || [], 
                topic,
                mode: message.mode || 'teach',
                teachingPrompt: message.teachingPrompt,
                quizPrompt: message.quizPrompt
              })
            });
            
            const data = await resp.json();
            
            // Check if PDF backend returned a fallback error
            if (resp.status === 400 && data.fallback) {
              console.log('PDF backend requested fallback to regular chat API');
              // Fall back to regular chat API
              resp = await fetch("http://localhost:3131/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationHistory: message.conversationHistory || [], topic })
              });
              const chatData = await resp.json();
              sendResponse({ ok: true, reply: chatData?.reply || '' });
              return;
            }
            
            sendResponse({ ok: true, 
              reply: data?.task || '', 
              phase: data?.phase || 'teach',
              source: data?.source || 'pdf'
            });
            return;
          } catch (pdfError) {
            console.log('PDF backend failed, falling back to regular chat API:', pdfError);
            // Fall back to regular chat API
            resp = await fetch("http://localhost:3131/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversationHistory: message.conversationHistory || [], topic })
            });
            const chatData = await resp.json();
            sendResponse({ ok: true, reply: chatData?.reply || '' });
            return;
          }
        } else {
          // Use regular chat API with proper prompt engineering
          const promptToUse = message.teachingPrompt || message.quizPrompt || `Let's talk about ${topic}.`;
          
          // For continuation prompts, don't send conversation history to avoid repetition
          const conversationHistory = (message.teachingPrompt && message.teachingPrompt.includes('already learned')) 
            ? [] 
            : (message.conversationHistory || []);
          
          resp = await fetch("http://localhost:3131/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              conversationHistory: conversationHistory, 
              topic,
              prompt: promptToUse
            })
          });
          const data = await resp.json();
          sendResponse({ ok: true, 
            reply: data?.reply || '',
            phase: message.mode || 'teach'
          });
        }
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
      return;
    }

    if (message.type === "FW_CHECK_PDF_STATUS") {
      try {
        const { fwSettings } = await chrome.storage.sync.get(["fwSettings"]);
        const hasPDF = fwSettings?.documents && fwSettings.documents.length > 0;
        
        console.log('Focus Warmup: PDF Status Check', {
          hasPDF,
          documents: fwSettings?.documents || []
        });
        
        sendResponse({ ok: true, 
          hasPDF, 
          documents: fwSettings?.documents || []
        });
      } catch (e) {
        console.error('Focus Warmup: PDF Status Check Error', e);
        sendResponse({ ok: false, error: String(e) });
      }
      return;
    }

    if (message.type === "FW_EVALUATE_MCQ") {
      try {
        const { fwSettings } = await chrome.storage.sync.get(["fwSettings"]);
        const hasPDF = fwSettings?.documents && fwSettings.documents.length > 0;
        
        let resp;
        if (hasPDF) {
          // Try PDF backend first
          try {
            resp = await fetch("http://localhost:3132/evaluate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question: message.question, answer: message.answer, conversationHistory: message.conversationHistory || [] })
            });
            if (resp.ok) {
              const data = await resp.json();
              sendResponse({ ok: true, result: data });
              return;
            }
          } catch (pdfError) {
            console.log('PDF backend evaluation failed, falling back to chat API');
          }
        }
        
        // Fallback to regular chat API for MCQ evaluation
        const evaluationPrompt = `I asked this multiple choice question: "${message.question}"

The user answered: "${message.answer}"

Please evaluate if this answer is correct. Respond with a JSON object like this:
{
  "correct": true/false,
  "feedback": "brief feedback explaining why correct or incorrect",
  "correctAnswer": "A" (the letter of the correct answer)
}

Only respond with the JSON object, no other text.`;

        resp = await fetch("http://localhost:3131/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            conversationHistory: [...(message.conversationHistory || []), { role: 'user', content: evaluationPrompt }], 
            topic: 'evaluation'
          })
        });
        
        if (resp.ok) {
          const data = await resp.json();
          console.log('Focus Warmup: Raw evaluation response:', data);
          
          try {
            // Try to parse the response as JSON
            const responseText = data.reply || data.prompt || '';
            console.log('Focus Warmup: Attempting to parse evaluation response:', responseText);
            
            // Clean the response text to extract JSON
            let jsonText = responseText.trim();
            
            // Try to find JSON in the response
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonText = jsonMatch[0];
            }
            
            const evaluation = JSON.parse(jsonText);
            console.log('Focus Warmup: Parsed evaluation:', evaluation);
            
            // Validate the evaluation object
            if (typeof evaluation.correct === 'boolean' && evaluation.feedback) {
              sendResponse({ ok: true, result: evaluation });
            } else {
              throw new Error('Invalid evaluation format');
            }
          } catch (parseError) {
            console.error('Focus Warmup: Failed to parse evaluation response:', parseError);
            
            // Provide a more intelligent fallback based on the response text
            const responseText = (data.reply || data.prompt || '').toLowerCase();
            let isCorrect = false;
            let feedback = "Evaluation service unavailable. Please try again.";
            
            // Try to infer correctness from the response text
            if (responseText.includes('correct') || responseText.includes('right') || responseText.includes('yes')) {
              isCorrect = true;
              feedback = "Correct! Good job.";
            } else if (responseText.includes('incorrect') || responseText.includes('wrong') || responseText.includes('no')) {
              isCorrect = false;
              feedback = "That's not quite right. Try again.";
            }
            
            sendResponse({ ok: true, 
              result: { 
                correct: isCorrect, 
                feedback: feedback, 
                correctAnswer: "A" 
              } 
            });
          }
        } else {
          console.error('Focus Warmup: Evaluation service returned error:', resp.status);
          sendResponse({ ok: false, error: 'Evaluation service unavailable' });
        }
      } catch (e) {
        console.error('Focus Warmup: Evaluation error:', e);
        sendResponse({ ok: false, error: String(e) });
      }
      return;
    }

  })();
  return true;
});




