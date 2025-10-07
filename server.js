// server.js — Teen Support Chatbot API
import express from "express";
import cors from "cors";
import { z } from "zod";
import dotenv from "dotenv";
import pg from "pg";
dotenv.config();

const app = express();
app.use(express.json());

// --- Allow your WordPress domain ---
app.use(cors({
  origin: ["https://functionalchristianity.com"], // <-- change to your actual site
  methods: ["POST", "GET"],
  allowedHeaders: ["Content-Type"]
}));

// --- Database (optional) ---
const pool = new pg.Pool({
  connectionString: process.env.PG_DSN || ""
});

// Temporary embedding placeholder (replace later)
async function embedText(text) {
  return Array.from({ length: 1536 }, () => Math.random());
}

// Retrieve from DB (RAG)
async function retrievePassages(query) {
  const qvec = await embedText(query);
  try {
    const { rows } = await pool.query(
      "SELECT source_title AS title, text FROM kb_chunks ORDER BY embedding <=> $1 LIMIT 5",
      [qvec]
    );
    return rows || [];
  } catch {
    return [];
  }
}

// --- Age and Safety Helpers ---
const currentYear = new Date().getUTCFullYear();
const birthYearSchema = z.object({
  birthYear: z.number().int().gte(currentYear - 120).lte(currentYear)
});

function isTeen(by) {
  const age = currentYear - by;
  return age >= 13 && age <= 19;
}

function crisisDetected(text) {
  const redFlags = [
    "kill myself", "suicide", "end my life",
    "hurt myself", "can't stay safe",
    "i want to die", "self-harm"
  ];
  return redFlags.some(p => text.toLowerCase().includes(p));
}

// --- Routes ---

// 👋 Root page (fixes “Cannot GET /”)
app.get("/", (req, res) => {
  res.send(`
    <h2>Teen Support Chatbot API</h2>
    <p>✅ The server is running!</p>
    <p>Try these endpoints:</p>
    <ul>
      <li><code>POST /start</code></li>
      <li><code>POST /age-check</code></li>
      <li><code>POST /chat</code></li>
    </ul>
  `);
});

// Optional GET for quick browser test
app.get("/start", (req, res) => {
  res.json({ message: "Hi! Before we start, what’s your birth year? (YYYY)" });
});

app.post("/start", (req, res) => {
  res.json({ message: "Hi! Before we start, what’s your birth year? (YYYY)" });
});

app.post("/age-check", (req, res) => {
  try {
    const parsed = birthYearSchema.parse({ birthYear: Number(req.body.birthYear) });
    if (!isTeen(parsed.birthYear)) {
      return res.json({
        eligible: false,
        message: "This space is for ages 13–19. If you’re in danger or need urgent help, reach out to a trusted adult or local emergency services."
      });
    }
    res.json({
      eligible: true,
      message: "Thanks. What’s weighing on you most today—anxiety, friend stuff, or something else?"
    });
  } catch {
    res.json({ eligible: false, message: "Please enter a 4-digit birth year like 2009." });
  }
});

app.post("/chat", async (req, res) => {
  const { birthYear, text } = req.body || {};
  if (!isTeen(Number(birthYear))) {
    return res.json({ message: "This space is for teens ages 13–19." });
  }

  if (crisisDetected(String(text || ""))) {
    return res.json({
      message: "I’m really glad you told me. I can’t share anything that could put you in danger. Your safety matters. If you might act on these feelings, please contact emergency services or the 988 Suicide & Crisis Lifeline (US). You can call or text 988, or use their chat online. If you can, tell a trusted adult nearby. I can stay with you and share coping steps."
    });
  }

  const passages = await retrievePassages(String(text || ""));
  const response = passages.length
    ? `It makes sense this feels heavy. We can try a 30-second grounding, practice a short “no thanks” script, or look at what’s in your control. (Source: ${passages[0].title})`
    : `It makes sense this feels heavy. We can try a 30-second grounding, practice a short “no thanks” script, or look at what’s in your control. I don’t have that in the approved materials yet—feel free to upload a resource you trust.`;

  res.json({ message: response, citations: passages.map(p => p.title) });
});

// --- Start Server ---
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Teen bot running on port ${port}`));
