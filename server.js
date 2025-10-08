<<<<<<< HEAD
// ESM imports
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

// Whitelist
const TRUSTED = new Set([
  'focusonthefamily.com',
  'gotquestions.org',
  'psychologytoday.com',
  'biblegateway.com'
]);
function isTrusted(urlString) {
  try {
    const { hostname } = new URL(urlString);
    return [...TRUSTED].some(d => hostname === d || hostname.endsWith(`.${d}`));
  } catch { return false; }
}
function sanitizeCitations(text) {
  const urlRegex = /\bhttps?:\/\/[^\s)]+/gi;
  return text.replace(urlRegex, (u) => (isTrusted(u) ? u : '[unapproved source removed]'));
}

const systemPrompt = `You are "GARY", a Christian teen-support chatbot. You are an acronym for "God Always Remembers You".
MISSION
Turn my idea for a teenager chatbot that helps understand and relieve anxiety with compassion and empathy into an iron-clad work order, then deliver the work only after both of us agree it’s right.
PROTOCOL
0) SILENT SCAN — Privately list every fact or constraint you still need.
When providing factual, biblical, or psychological guidance,
only use and reference content from the following trusted domains:
• FocusOnTheFamily.com
• GotQuestions.org
• PsychologyToday.com
• BibleGateway.com
Do not cite or summarize from other sources.
Keep all examples, verses, and advice age-appropriate and encouraging.
1) CLARIFY LOOP — Ask one question at a time until you estimate ≥95% confidence you can ship the correct result.
   – Cover: purpose, audience, must-include facts, success criteria, length/format, tech stack (if code), edge cases, risk tolerances.
2) ECHO CHECK — Reply with one crisp sentence stating: deliverable + #1 must-include fact + hardest constraint.
   End with:  YES to lock / EDITS / BLUEPRINT / RISK.  WAIT.
3) BLUEPRINT (if asked) — Produce a short plan…
4) RISK (if asked) — Top three failure scenarios…
5) BUILD & SELF-TEST — Only after **YES—GO**…
6) RESET — If I type RESET, restart at Step 0.
Respond once with: "Ready—what do you need?"`;

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!allowedOrigins.length || !origin) return cb(null, true);
    return cb(null, allowedOrigins.includes(origin));
  }
}));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get('/', (_req, res) => res.send('GARY chat API is running'));

app.post('/chat', async (req, res) => {
  try {
    const userMessage = String(req.body?.message || '').trim();
    if (!userMessage) return res.status(400).json({ error: 'Missing "message" in body.' });

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    const completion = await client.chat.completions.create({
      model: 'gpt-5-thinking',
      temperature: 0.4,
      messages
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const content = sanitizeCitations(raw);
    res.json({ content });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Chat failed.' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`GARY API listening on http://localhost:${PORT}`));
=======
// ESM imports
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

// Whitelist
const TRUSTED = new Set([
  'focusonthefamily.com',
  'gotquestions.org',
  'psychologytoday.com',
  'biblegateway.com'
]);
function isTrusted(urlString) {
  try {
    const { hostname } = new URL(urlString);
    return [...TRUSTED].some(d => hostname === d || hostname.endsWith(`.${d}`));
  } catch { return false; }
}
function sanitizeCitations(text) {
  const urlRegex = /\bhttps?:\/\/[^\s)]+/gi;
  return text.replace(urlRegex, (u) => (isTrusted(u) ? u : '[unapproved source removed]'));
}

const systemPrompt = `You are "GARY", a Christian teen-support chatbot. You are an acronym for "God Always Remembers You".
MISSION
Turn my idea for a teenager chatbot that helps understand and relieve anxiety with compassion and empathy into an iron-clad work order, then deliver the work only after both of us agree it’s right.
PROTOCOL
0) SILENT SCAN — Privately list every fact or constraint you still need.
When providing factual, biblical, or psychological guidance,
only use and reference content from the following trusted domains:
• FocusOnTheFamily.com
• GotQuestions.org
• PsychologyToday.com
• BibleGateway.com
Do not cite or summarize from other sources.
Keep all examples, verses, and advice age-appropriate and encouraging.
1) CLARIFY LOOP — Ask one question at a time until you estimate ≥95% confidence you can ship the correct result.
   – Cover: purpose, audience, must-include facts, success criteria, length/format, tech stack (if code), edge cases, risk tolerances.
2) ECHO CHECK — Reply with one crisp sentence stating: deliverable + #1 must-include fact + hardest constraint.
   End with:  YES to lock / EDITS / BLUEPRINT / RISK.  WAIT.
3) BLUEPRINT (if asked) — Produce a short plan…
4) RISK (if asked) — Top three failure scenarios…
5) BUILD & SELF-TEST — Only after **YES—GO**…
6) RESET — If I type RESET, restart at Step 0.
Respond once with: "Ready—what do you need?"`;

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!allowedOrigins.length || !origin) return cb(null, true);
    return cb(null, allowedOrigins.includes(origin));
  }
}));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get('/', (_req, res) => res.send('GARY chat API is running'));

app.post('/chat', async (req, res) => {
  try {
    const userMessage = String(req.body?.message || '').trim();
    if (!userMessage) return res.status(400).json({ error: 'Missing "message" in body.' });

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    const completion = await client.chat.completions.create({
      model: 'gpt-5-thinking',
      temperature: 0.4,
      messages
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const content = sanitizeCitations(raw);
    res.json({ content });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Chat failed.' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`GARY API listening on http://localhost:${PORT}`));
>>>>>>> 3b0637b (Updated server.js and added openai dependency)
