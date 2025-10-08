// server.js
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.set("trust proxy", 1); // ✅ Required for Render or any reverse proxy

// --- Core middleware ---
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

// --- CORS (lock to your site domain in production) ---
// Allow your site and localhost
app.use(
  cors({
    origin: [
      "https://www.functionalchristianity.com",   // ✅ Replace with your actual WordPress site
      "https://functionalchristianity.com",
      "http://localhost:3000"
    ],
  })
);

// --- Basic rate limit to protect your key ---
app.use(
  "/chat",
  rateLimit({
    windowMs: 60 * 1000,
    max: 60, // 60 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false
  })
);

// --- Health check for Render ---
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

// --- OpenAI client ---
if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY env var");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Chat endpoint ---
// Request body:
// {
//   "messages": [{role:"user",content:"hi"}],
//   "system": "optional system prompt override",
//   "model": "gpt-3.5-turbo",
//   "max_tokens": 400
// }
app.post("/chat", async (req, res) => {
  try {
    const {
      messages = [],
      system,
      model = "gpt-3.5-turbo",
      max_tokens = 400,
      temperature = 0.7
    } = req.body || {};

    // Default G.A.R.Y. system prompt
    const systemPrompt = `
You are G.A.R.Y., a warm, encouraging Christian teen support chatbot.
Your role is to offer age-appropriate emotional support, practical coping ideas, and faith-based encouragement.

When answering, draw your tone and ideas from these trusted sources:
• Focus on the Family (https://www.focusonthefamily.com/teen-resources/) — for biblical, family-centered, and Christian teen guidance.
• GotQuestions.org — for Bible-based answers to spiritual and moral questions.
• PsychologyToday.com — for calm, safe, evidence-informed self-soothing and emotional wellness practices.

Keep your language gentle, hopeful, and conversational.
Always stay consistent with biblical values and Focus on the Family’s worldview.
When you share psychological strategies, present them in a way that aligns with a Christian understanding of human worth and healing.

If a user shows signs of crisis or mentions self-harm, remind them immediately:
“Please contact the Suicide and Crisis Lifeline by calling or texting 988 right now.”

Never give medical or diagnostic advice.
Keep responses short and focused on comfort, prayer, reflection, and practical next steps.
`;

    // Ensure the conversation starts with system
    const apiMessages = [{ role: "system", content: systemPrompt }, ...messages];

    const completion = await openai.chat.completions.create({
      model,
      messages: apiMessages,
      max_tokens,
      temperature
    });

    const reply = completion.choices?.[0]?.message?.content ?? "";
    res.status(200).json({
      ok: true,
      model,
      reply
    });
  } catch (err) {
    // Map common errors
    const status =
      err?.status ||
      (String(err?.message || "").includes("rate limit") ? 429 : 500);

    res.status(status).json({
      ok: false,
      error: err?.message || "Unknown error",
      type: err?.type || "server_error"
    });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`G.A.R.Y. API listening on :${PORT}`);
});
