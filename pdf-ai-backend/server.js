require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');

const { extractTextFromPDF, chunkText } = require('./pdfHandler');
const { generateEmbeddings, findRelevantChunks } = require('./embeddingUtils');

const app = express();
const port = 3132; // Different port from existing backend

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));
app.use(express.json());

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize OpenAI
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Global storage for PDF chunks (in-memory for MVP)
global.pdfChunks = [];
global.pdfMetadata = null;

/**
 * GET /health - Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    openai: openai ? 'configured' : 'not configured'
  });
});

/**
 * POST /upload - Upload and process PDF
 */
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    console.log(`📄 Processing PDF: ${req.file.originalname}`);

    // Extract text from PDF
    const text = await extractTextFromPDF(req.file.buffer);
    
    if (!text || text.length < 100) {
      return res.status(400).json({ error: 'PDF appears to be empty or unreadable' });
    }

    // Split into chunks
    const textChunks = chunkText(text);
    console.log(`📝 Created ${textChunks.length} text chunks`);

    // Generate embeddings if OpenAI is available
    let chunks = [];
    if (openai) {
      try {
        const embeddings = await generateEmbeddings(textChunks);
        chunks = textChunks.map((text, index) => ({
          text,
          embedding: embeddings[index]
        }));
        console.log(`🧠 Generated embeddings for ${chunks.length} chunks`);
      } catch (error) {
        console.error('Embedding generation failed, storing text only:', error);
        chunks = textChunks.map(text => ({ text, embedding: null }));
      }
    } else {
      chunks = textChunks.map(text => ({ text, embedding: null }));
    }

    // Store in global memory
    global.pdfChunks = chunks;
    global.pdfMetadata = {
      filename: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      totalChunks: chunks.length,
      hasEmbeddings: chunks[0]?.embedding !== null
    };

    res.json({
      success: true,
      metadata: global.pdfMetadata,
      preview: text.substring(0, 200) + '...'
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /prompt - Generate teaching prompts from PDF content
 */
app.post('/prompt', async (req, res) => {
  try {
    const { mode = 'teach', previousPrompt = '', topic = '', conversationHistory = [], quizPrompt = '' } = req.body;

    // For quiz requests, handle even without PDF content
    if (mode === 'quiz') {
      if (!openai) {
        return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
      }

      const systemPrompt = `You create concise MCQs for learning topics.

Rules:
- Output ONLY plain text (no markdown, no brackets)
- Exactly one question followed by options in the format: A) ..., B) ..., C) ..., D) ...
- Keep it brief and answerable quickly
- Do not add instructions like "Choose A, B, or C"
- IMPORTANT: Randomize the position of the correct answer - it should NOT always be A
- Make sure the correct answer appears in different positions (A, B, C, or D) randomly
- Create 3 plausible distractors and 1 correct answer`;

      const userPrompt = quizPrompt || `Create a multiple choice question about ${topic}. Ensure the correct answer is randomly positioned (A, B, C, or D) and not always in the same place.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const task = response.choices[0]?.message?.content || 'Unable to generate quiz question';

      res.json({
        task,
        source: 'openai',
        phase: 'quiz',
        metadata: {
          mode: 'quiz',
          topic,
          conversationLength: conversationHistory.length
        }
      });
      return;
    }

    // Handle hint requests (even without PDF content)
    if (mode === 'hint') {
      if (!openai) {
        return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
      }

      // Extract the teaching prompt which contains the hint request
      const teachingPrompt = req.body.teachingPrompt || '';
      
      const systemPrompt = `You are a helpful tutor providing hints for incorrect answers.

Rules:
- Provide a brief explanation of why the selected answer is wrong (1 sentence)
- Then give a helpful hint to guide toward the correct answer (1 sentence)
- Keep it educational and encouraging
- Do NOT mention specific answer options (A, B, C, D)
- Do NOT give away the correct answer
- Output ONLY plain text (no markdown, no brackets)
- Keep it concise and focused`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: teachingPrompt }
        ],
        max_tokens: 100,
        temperature: 0.7
      });

      const hint = response.choices[0]?.message?.content || 'That answer is incorrect. Think about the fundamental concepts involved.';

      res.json({
        task: hint,
        source: 'openai',
        phase: 'hint',
        metadata: {
          mode: 'hint',
          topic,
          conversationLength: conversationHistory.length
        }
      });
      return;
    }

    // Handle explanation requests (even without PDF content)
    if (mode === 'explain') {
      if (!openai) {
        return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
      }

      // Extract the teaching prompt which contains the explanation request
      const teachingPrompt = req.body.teachingPrompt || '';
      
      const systemPrompt = `You are a helpful tutor providing explanations for correct answers.

Rules:
- Provide a brief explanation of why the selected answer is correct (1-2 sentences)
- Focus on the educational value and key concepts
- Keep it concise and informative
- Do NOT repeat the answer text or say "The correct answer is..."
- Do NOT mention specific answer options (A, B, C, D)
- Output ONLY plain text (no markdown, no brackets)
- Keep it educational and engaging`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: teachingPrompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const explanation = response.choices[0]?.message?.content || 'Great job! That answer is correct.';

      res.json({
        task: explanation,
        source: 'openai',
        phase: 'explain',
        metadata: {
          mode: 'explain',
          topic,
          conversationLength: conversationHistory.length
        }
      });
      return;
    }

    // For non-quiz requests, require PDF content
    if (!global.pdfChunks || global.pdfChunks.length === 0) {
      return res.status(400).json({ error: 'No PDF content available. Please upload a PDF first.' });
    }

    // Check if the requested topic is relevant to the loaded PDF content
    // If the topic doesn't match the PDF content, return an error to trigger fallback
    const pdfContent = global.pdfChunks.map(chunk => chunk.text).join(' ').toLowerCase();
    const topicLower = topic.toLowerCase();
    
    // Define topic keywords that should match the PDF content
    const topicKeywords = {
      'javascript': ['javascript', 'js', 'programming', 'code', 'web', 'frontend'],
      'python': ['python', 'programming', 'code', 'backend', 'scripting'],
      'machine learning': ['machine learning', 'ml', 'ai', 'artificial intelligence', 'neural', 'algorithm'],
      'spanish': ['spanish', 'español', 'language', 'vocabulary', 'grammar'],
      'history': ['history', 'historical', 'past', 'ancient', 'medieval', 'modern'],
      'philosophy': ['philosophy', 'philosophical', 'ethics', 'moral', 'aristotle', 'plato', 'socrates']
    };
    
    // Check if the topic is relevant to the PDF content
    const relevantKeywords = topicKeywords[topicLower] || [topicLower];
    const isRelevant = relevantKeywords.some(keyword => 
      pdfContent.includes(keyword) || keyword.includes(topicLower)
    );
    
    // If the topic is not relevant to the PDF content, return an error to trigger fallback
    if (!isRelevant && topic && topic !== 'General') {
      return res.status(400).json({ 
        error: 'Topic not relevant to PDF content. Please use regular chat API.',
        fallback: true 
      });
    }

    // Determine query based on mode and conversation state
    let query;
    const hasTeaching = conversationHistory.some(msg => msg.role === 'assistant' && msg.content.length > 50);

    query = `explain a concept from ${topic}`;

    // Find relevant chunks
    const relevantChunks = await findRelevantChunks(query, global.pdfChunks, 3);
    console.log(`🔍 Found ${relevantChunks.length} relevant chunks for: ${query}`);

    // Generate response using OpenAI
    if (!openai) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    let systemPrompt, userPrompt;

        // TEACH PHASE
      systemPrompt = `You are an enthusiastic teaching assistant helping with quick brain activation.

RULES:
- Explain 1 interesting concept from the PDF (1-2 sentences max, <= 30 words)
- Be engaging, conversational, and encouraging 
- Use active language: "Let's explore...", "Here's a fascinating point...", "Notice how..."
- If user asks clarifying questions, answer them enthusiastically and DO NOT reply with a new question
- Do NOT use markdown emphasis like **bold**
- Stay focused on the PDF content
- Don't ask questions back - just teach/clarify
- CRITICAL: Keep responses SHORT - maximum 30 words`;

      // Use teachingPrompt if provided, otherwise fall back to conversation-based approach
      if (req.body.teachingPrompt) {
        userPrompt = `PDF Content: ${relevantChunks.join('\n\n')}

${req.body.teachingPrompt}`;
      } else {
        const lastUserMsg = conversationHistory.filter(msg => msg.role === 'user').slice(-1)[0]?.content || '';
        
        if (lastUserMsg && conversationHistory.length > 0) {
          userPrompt = `PDF Content: ${relevantChunks.join('\n\n')}

Previous conversation: ${conversationHistory.slice(-2).map(m => `${m.role}: ${m.content}`).join('\n')}

User just asked: "${lastUserMsg}"

Respond directly to their question using the PDF content. Be helpful and clarifying. Keep your response to 1-2 sentences, maximum 30 words.`;
        } else {
          userPrompt = `PDF Content: ${relevantChunks.join('\n\n')}

Pick one fascinating concept from this material and explain it in an engaging way. Make it come alive for the user! Keep your response to 1-2 sentences, maximum 30 words.`;
        }
      }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 80,
      temperature: 0.7
    });

    const task = response.choices[0]?.message?.content || 'Unable to generate prompt';

    res.json({
      task,
      source: 'openai',
      phase: 'teach',
      metadata: {
        chunksUsed: relevantChunks.length,
        mode,
        query,
        conversationLength: conversationHistory.length
      }
    });

  } catch (error) {
    console.error('Prompt generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /evaluate - Evaluate MCQ answers and determine if user should be released
 */
app.post('/evaluate', async (req, res) => {
  try {
    const { question, answer, conversationHistory = [], source = 'pdf' } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    // Simple MCQ evaluation - check if answer is A, B, C, or D
    const answerLetter = answer.trim().toUpperCase();
    const isValidMCQ = ['A', 'B', 'C', 'D'].includes(answerLetter);

    if (!isValidMCQ) {
      return res.json({
        correct: false,
        feedback: "Please choose A, B, C, or D",
        shouldContinue: true
      });
    }

    // Use OpenAI to evaluate the correctness for PDF questions
    if (!openai) {
      // Fallback: accept any valid letter choice
      return res.json({
        correct: true,
        feedback: "Nice! You've completed this check.",
        shouldContinue: false
      });
    }

    // Extract the MCQ question and options from the question text
    const mcqMatch = question.match(/(.*?)\s*A\)\s*(.*?)\s*B\)\s*(.*?)\s*C\)\s*(.*?)\s*D\)\s*(.*)/s);
    if (!mcqMatch) {
      return res.json({
        correct: false,
        feedback: "Invalid question format",
        shouldContinue: true
      });
    }

    const [_, questionText, optionA, optionB, optionC, optionD] = mcqMatch;
    const options = { A: optionA.trim(), B: optionB.trim(), C: optionC.trim(), D: optionD.trim() };
    const selectedOption = options[answerLetter];

    // Get recent teaching context from conversation history
    const recentTeaching = conversationHistory
      .filter(msg => msg.role === 'assistant' && !msg.content.includes('A)') && !msg.content.includes('B)'))
      .slice(-2)
      .map(msg => msg.content)
      .join(' ');

    const evaluationPrompt = `Context from recent teaching: "${recentTeaching}"

Question: ${questionText}

Options:
A) ${optionA}
B) ${optionB}
C) ${optionC}
D) ${optionD}

User selected: ${answerLetter}) ${selectedOption}

Based ONLY on the context provided and the question, evaluate if the selected answer is correct.

Respond with exactly:
- "CORRECT" if the answer matches the context
- "INCORRECT" if the answer contradicts the context

Then provide a brief 1-sentence explanation focusing on the specific concept from the context.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are evaluating a multiple choice answer based on specific teaching context. Be precise, consistent with the context provided, and brief. Do not contradict the teaching context you were given.' },
        { role: 'user', content: evaluationPrompt }
      ],
      max_tokens: 150,
      temperature: 0.1
    });

    const evaluation = response.choices[0]?.message?.content || '';
    const isCorrect = evaluation.toUpperCase().includes('CORRECT') && !evaluation.toUpperCase().includes('INCORRECT');
    
    let feedback;
    if (isCorrect) {
      feedback = evaluation.replace(/CORRECT/i, '').trim() || "Excellent! You've mastered this concept.";
    } else {
      feedback = evaluation.replace(/INCORRECT/i, '').trim() || "Not quite right. Think about it differently.";
    }

    // Determine the correct answer by analyzing the question and context
    let correctAnswer = null;
    if (isCorrect) {
      correctAnswer = answerLetter; // User got it right, so their answer is correct
    } else {
      // Try to determine the correct answer from the context
      // This is a simplified approach - in a real implementation, you might want more sophisticated logic
      const contextLower = recentTeaching.toLowerCase();
      const optionsLower = {
        A: optionA.toLowerCase(),
        B: optionB.toLowerCase(),
        C: optionC.toLowerCase(),
        D: optionD.toLowerCase()
      };
      
      // Find which option best matches the teaching context
      for (const [letter, optionText] of Object.entries(optionsLower)) {
        if (contextLower.includes(optionText) || optionText.includes(contextLower.split(' ').slice(0, 3).join(' '))) {
          correctAnswer = letter;
          break;
        }
      }
    }

    res.json({
      correct: isCorrect,
      feedback: feedback,
      correctAnswer: correctAnswer,
      shouldContinue: !isCorrect // Continue if wrong, stop if correct
    });

  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /status - Check PDF status
 */
app.get('/status', (req, res) => {
  res.json({
    hasPDF: global.pdfChunks?.length > 0,
    metadata: global.pdfMetadata,
    openaiConfigured: !!openai
  });
});

app.listen(port, () => {
  console.log(`📚 PDF AI Backend running on http://localhost:${port}`);
  console.log(`🔑 OpenAI configured: ${!!openai}`);
  console.log('\nEndpoints:');
  console.log('  POST /upload - Upload PDF');
  console.log('  POST /prompt - Generate teaching prompts');
  console.log('  GET /status - Check PDF status');
});

module.exports = app;
