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
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

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
// 1) OPTIONS handler: fixes CORS preflight for /chat
app.options('/chat', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return res.sendStatus(204);
});

// 2) Echo (no OpenAI required): proves front-end → server works
app.post('/echo', (req, res) => {
  const text = String(req.body?.message || '').trim();
  if (!text) return res.status(400).json({ error: 'Missing "message" in body.' });
  return res.json({ content: `ECHO: ${text}` });
});

// 3) OpenAI ping: proves key+model are valid in Render
app.get('/check-key', async (_req, res) => {
  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: 'ping' }],
      temperature: 0
    });
    const ok = Boolean(completion?.choices?.[0]?.message?.content);
    return res.json({ ok, model: process.env.OPENAI_MODEL || 'gpt-4o' });
  } catch (err) {
    console.error('CHECK-KEY ERROR:', err?.status, err?.message, err?.response?.data);
    return res.status(500).json({
      ok: false,
      error: err?.message || 'OpenAI call failed',
      status: err?.status || 500,
      data: err?.response?.data || null
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=>console.log(`GARY API listening on http://localhost:${PORT}`));
