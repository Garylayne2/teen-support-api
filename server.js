// server.js
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

// --- Core middleware ---
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

// --- CORS (lock to your site domain in production) ---
const allowedOrigins = [
  process.env.CORS_ORIGIN || "http://localhost:3000"
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow server-to-server / curl
      return allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("Not allowed by CORS"));
    },
    credentials: false
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
    const systemPrompt =
      system ||
      "You are G.A.R.Y., a warm, encouraging Christian teen support chatbot. Be brief, practical, and kind. Where appropriate, reference Focus on the Family and offer self-soothing tips inspired by psychologytoday.com. Avoid medical/diagnostic claims; encourage reaching out to trusted adults and emergency help if at risk.";

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
