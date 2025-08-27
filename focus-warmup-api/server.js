import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'focus-warmup-api' });
});

// Pure chat endpoint: forwards conversationHistory directly
app.post('/chat', async (req, res) => {
  try {
    const { conversationHistory = [], topic = '', prompt = '' } = req.body || {};
    const messages = Array.isArray(conversationHistory) && conversationHistory.length
      ? conversationHistory.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }))
      : [{ role: 'user', content: prompt || (topic ? `Let's talk about ${topic}.` : 'Let\'s talk.') }];

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 200
    });
    const reply = chat.choices?.[0]?.message?.content?.trim() || '';
    res.json({ reply });
  } catch (err) {
    console.error('chat error', err);
    res.status(500).json({ error: String(err?.message || 'chat_failed') });
  }
});



const PORT = Number(process.env.PORT || 3131);
app.listen(PORT, () => {
  console.log(`focus-warmup-api listening on http://localhost:${PORT}`);
});


