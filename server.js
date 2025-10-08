// server.js — ESM version
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

// Trusted domain whitelist
const TRUSTED = new Set(['focusonthefamily.com','gotquestions.org','psychologytoday.com','biblegateway.com']);
function isTrusted(urlString){ try{ const {hostname}=new URL(urlString); return [...TRUSTED].some(d=>hostname===d||hostname.endsWith(`.${d}`)); }catch{ return false; } }
function sanitizeCitations(text){ const urlRegex=/\bhttps?:\/\/[^\s)]+/gi; return text.replace(urlRegex,(u)=> (isTrusted(u)?u:'[unapproved source removed]')); }

// System prompt
const systemPrompt = `You are "GARY", a Christian teen-support chatbot (God Always Remembers You).
When providing factual, biblical, or psychological guidance,
only use and reference FocusOnTheFamily.com, GotQuestions.org, PsychologyToday.com, BibleGateway.com.
Do not cite or summarize other sources. Keep all content age-appropriate and encouraging.
Respond once with: "Ready—what do you need?"`;

const app = express();
app.use(express.json({ limit: '1mb' }));

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!allowedOrigins.length || !origin) return cb(null, true);
    cb(null, allowedOrigins.includes(origin));
  }
}));
app.options('*', cors());

// Health & echo (sanity)
app.get('/', (_req,res)=>res.send('GARY chat API is running'));
app.get('/health', (_req,res)=>res.json({ ok:true, model: process.env.OPENAI_MODEL || 'gpt-4o', time: new Date().toISOString() }));
app.post('/echo', (req,res)=>{
  const text = String(req.body?.message||'').trim();
  if (!text) return res.status(400).json({ error: 'Missing "message" in body.' });
  res.json({ content: `ECHO: ${text}` });
});

// OpenAI
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

app.post('/chat', async (req,res)=>{
  const userMessage = String(req.body?.message||'').trim();
  if (!userMessage) return res.status(400).json({ error: 'Missing "message" in body.' });

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role:'system', content: systemPrompt },
        { role:'user', content: userMessage }
      ]
    });
    const raw = completion.choices?.[0]?.message?.content || '';
    res.json({ content: sanitizeCitations(raw) });
  } catch (err) {
    console.error('CHAT ERROR:', err?.status || '', err?.message || '', err?.response?.data || err);
    const safe = process.env.NODE_ENV === 'production'
      ? { error: 'Chat failed.' }
      : { error: 'Chat failed.', detail: err?.message, status: err?.status || 500, data: err?.response?.data || null };
    res.status(500).json(safe);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=>console.log(`GARY API listening on http://localhost:${PORT}`));
