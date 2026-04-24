/**
 * NEXUS AI — Production Backend
 * ==============================
 * Supports 5 AI providers in priority order:
 *   1. Your trained model on Hugging Face (best — domain-specific)
 *   2. Groq (free, fast, llama3/mixtral)
 *   3. Together AI ($5 free credit)
 *   4. Ollama (local, completely free)
 *   5. Rule engine (always works, zero cost)
 *
 * One .env file switches between ALL providers.
 * Zero code changes needed.
 */

import 'dotenv/config';
import express        from 'express';
import cors           from 'cors';
import helmet         from 'helmet';
import morgan         from 'morgan';
import rateLimit      from 'express-rate-limit';
import { createServer } from 'http';
import fetch          from 'node-fetch';

const app    = express();
const server = createServer(app);
const PORT   = process.env.PORT || 4000;

// ── AI PROVIDER ROUTER ────────────────────────────────────────
class AIRouter {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'auto';
    this.calls    = { total: 0, byProvider: {}, errors: 0 };
  }

  async chat(messages, system, maxTokens = 1200) {
    const providers = this._getProviderChain();
    for (const p of providers) {
      try {
        const result = await this._call(p, messages, system, maxTokens);
        this.calls.total++;
        this.calls.byProvider[p] = (this.calls.byProvider[p] || 0) + 1;
        return { text: result, provider: p };
      } catch (err) {
        console.warn(`[AI] ${p} failed: ${err.message.slice(0,60)}`);
        this.calls.errors++;
      }
    }
    // Final fallback — rule engine
    this.calls.byProvider['rule_engine'] = (this.calls.byProvider['rule_engine'] || 0) + 1;
    return { text: this._ruleEngine(messages), provider: 'rule_engine' };
  }

  _getProviderChain() {
    if (this.provider !== 'auto') return [this.provider];
    const chain = [];
    if (process.env.HF_API_KEY && process.env.HF_MODEL_ID)  chain.push('huggingface');
    if (process.env.GROQ_API_KEY)                            chain.push('groq');
    if (process.env.TOGETHER_API_KEY)                        chain.push('together');
    if (process.env.OPENAI_API_KEY)                          chain.push('openai');
    chain.push('ollama');      // Try local Ollama
    chain.push('lmstudio');   // Try local LM Studio
    return chain;
  }

  async _call(provider, messages, system, maxTokens) {
    const allMessages = [{ role: 'system', content: system }, ...messages];

    switch (provider) {

      // ── Your trained NEXUS model on Hugging Face ─────────────
      case 'huggingface': {
        const modelId = process.env.HF_MODEL_ID;
        const apiKey  = process.env.HF_API_KEY;
        const res = await fetch(`https://api-inference.huggingface.co/models/${modelId}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId, messages: allMessages,
            max_tokens: maxTokens, temperature: 0.72, stream: false,
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error(`HF ${res.status}: ${await res.text()}`);
        return (await res.json()).choices?.[0]?.message?.content || '';
      }

      // ── Groq (free, 14K tokens/min, llama3/mixtral/gemma) ────
      case 'groq': {
        const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: allMessages, max_tokens: maxTokens, temperature: 0.72 }),
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) throw new Error(`Groq ${res.status}`);
        return (await res.json()).choices?.[0]?.message?.content || '';
      }

      // ── Together AI ($5 free credit, very cheap after) ───────
      case 'together': {
        const model = process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.2-3B-Instruct-Turbo';
        const res = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: allMessages, max_tokens: maxTokens, temperature: 0.72 }),
          signal: AbortSignal.timeout(25000),
        });
        if (!res.ok) throw new Error(`Together ${res.status}`);
        return (await res.json()).choices?.[0]?.message?.content || '';
      }

      // ── OpenAI (gpt-4o-mini is cheap) ─────────────────────────
      case 'openai': {
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: allMessages, max_tokens: maxTokens, temperature: 0.72 }),
          signal: AbortSignal.timeout(25000),
        });
        if (!res.ok) throw new Error(`OpenAI ${res.status}`);
        return (await res.json()).choices?.[0]?.message?.content || '';
      }

      // ── Ollama (local, completely free) ───────────────────────
      case 'ollama': {
        const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
        const port  = process.env.OLLAMA_PORT  || 11434;
        const res   = await fetch(`http://localhost:${port}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: allMessages, stream: false,
            options: { num_predict: maxTokens, temperature: 0.72 } }),
          signal: AbortSignal.timeout(60000),
        });
        if (!res.ok) throw new Error(`Ollama ${res.status}`);
        return (await res.json()).message?.content || '';
      }

      // ── LM Studio (local GUI-based) ───────────────────────────
      case 'lmstudio': {
        const port = process.env.LMSTUDIO_PORT || 1234;
        const res  = await fetch(`http://localhost:${port}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer not-needed' },
          body: JSON.stringify({ model: 'local', messages: allMessages, max_tokens: maxTokens }),
          signal: AbortSignal.timeout(60000),
        });
        if (!res.ok) throw new Error(`LMStudio ${res.status}`);
        return (await res.json()).choices?.[0]?.message?.content || '';
      }

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /** Rule-based fallback — always works, zero cost */
  _ruleEngine(messages) {
    const q = messages[messages.length-1]?.content || '';
    return JSON.stringify({
      explanation: `Let's explore this concept together.\n\n**${q}** is an important topic that connects to fundamental principles. Understanding it requires careful thought and good examples.\n\nThe key insight is that most concepts make intuitive sense once you find the right analogy. Think of it in terms of things you already know — how does this concept relate to your existing knowledge?\n\nAs you explore further, you'll find that this topic connects to many other ideas in fascinating ways.`,
      visual: `<div style="padding:12px;background:#0d1b2a;border-radius:8px;color:#e2e8f0;text-align:center;font-size:11px"><div style="color:#00f5d4;font-weight:700">Concept Explorer</div><div style="color:#8da0c2;margin-top:5px">Ask follow-up questions to go deeper</div></div>`,
      keyNote: 'Every complex concept becomes clear once you find the right entry point.',
      followUp: 'What aspect of this topic would you like to explore deeper?',
      topic: q.slice(0, 40),
      difficulty: 5,
    });
  }

  getStatus() {
    return {
      provider:    this.provider,
      activeChain: this._getProviderChain(),
      stats:       this.calls,
    };
  }
}

// ── PROMPT BUILDER ────────────────────────────────────────────
const CHARACTERS = {
  sage: { name:'Professor Sage', voice:'wise, Socratic, illuminates deeper meaning' },
  aria: { name:'Aria',           voice:'enthusiastic, curious, wow-moments'         },
  kai:  { name:'Kai',            voice:'sharp, strategic, analytical'               },
  luna: { name:'Luna',           voice:'creative storyteller, narratives, empathy'  },
  nova: { name:'Nova',           voice:'tech-forward, systems-thinking, patterns'   },
};

const LANG_INSTRUCTION = {
  es:'Respond ENTIRELY in Spanish.',  fr:'Respond ENTIRELY in French.',
  de:'Respond ENTIRELY in German.',   hi:'Respond ENTIRELY in Hindi.',
  ar:'Respond ENTIRELY in Arabic.',   zh:'Respond ENTIRELY in Chinese.',
  ja:'Respond ENTIRELY in Japanese.', pt:'Respond ENTIRELY in Portuguese.',
  ru:'Respond ENTIRELY in Russian.',  ko:'Respond ENTIRELY in Korean.',
  ta:'Respond ENTIRELY in Tamil.',
};

function buildPrompt({ name, subject, level, characterId, language, teachingMode }) {
  const char = CHARACTERS[characterId] || CHARACTERS.sage;
  const lang = language && language !== 'en' ? `\nCRITICAL: ${LANG_INSTRUCTION[language] || ''} All JSON fields in that language.` : '';

  const levelInstr = {
    beginner:     'Simple analogies. Define every term. Short sentences. One concept per paragraph.',
    intermediate: 'Balance depth with examples. Show cause-effect. Connect to prior knowledge.',
    advanced:     'Technical precision. Nuance. Formal definitions. Edge cases. Open questions.',
  }[level] || 'Balance depth with clarity.';

  return `You are ${char.name} — ${char.voice}. You are part of NEXUS AI, a premium educational platform.

Student: ${name} | Subject: ${subject} | Level: ${level}
${levelInstr}

Address ${name} by name once naturally. Use **bold** for key terms, *italic* for emphasis.
Explanation arc: hook → concept → example → insight → follow-up.
${lang}

Respond ONLY with this exact JSON (no markdown fences):
{"explanation":"2-4 rich paragraphs with **bold** and *italic*","visual":"self-contained HTML inline CSS diagram/table max 500 chars","keyNote":"single most important sentence","followUp":"one Socratic question","topic":"3-5 word name","difficulty":5}`;
}

// ── SERVER SETUP ──────────────────────────────────────────────
const ai = new AIRouter();

// In-memory session store
const sessions = new Map();

function getSession(id, init = {}) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      id, name: init.name || 'Student', subject: init.subject || 'all',
      level: init.level || 'intermediate', characterId: init.characterId || 'sage',
      language: init.language || 'en', createdAt: new Date().toISOString(),
      history: [], recentTopics: [], weakAreas: [], strongAreas: [],
      xp: 0, interactions: 0, quizzes: 0, focusSessions: 0,
    });
  }
  return sessions.get(id);
}

function updateSession(id, { topic, difficulty = 5 }) {
  const s = getSession(id);
  s.interactions++;
  s.xp += 25;
  if (topic) { s.recentTopics.unshift(topic); if (s.recentTopics.length > 20) s.recentTopics.pop(); }
  sessions.set(id, s);
}

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',');
app.use(cors({
  origin: (o, cb) => (!o || origins.includes(o)) ? cb(null, true) : cb(new Error('CORS')),
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
}));

app.use(express.json({ limit: '4mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Rate limiting
app.use(rateLimit({
  windowMs: 60000, max: 200, skip: req => req.path === '/api/health',
  message: { success: false, error: 'Rate limit exceeded.' },
}));

const aiLimit = rateLimit({
  windowMs: 60000, max: parseInt(process.env.AI_RATE_LIMIT || '60'),
  message: { success: false, error: 'AI rate limit. Max 60 requests/minute.' },
});

const safeJson = r => { try { return JSON.parse(r.replace(/```json|```/g,'').trim()); } catch { return null; } };
const strip    = t => t.replace(/\*\*/g,'').replace(/\*/g,'').replace(/<[^>]+>/g,'').trim();

// ── ROUTES ───────────────────────────────────────────────────

// Health
app.get('/api/health', (req, res) => {
  res.json({
    success: true, status: 'ok', version: '3.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    ai: ai.getStatus(),
    sessions: sessions.size,
  });
});

// Session  — FIXED: removed invalid await inside non-async handler
app.post('/api/session', (req, res) => {
  const id      = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const session = getSession(id, req.body);
  res.json({ success: true, data: { sessionId: id, ...session } });
});

// Chat — main AI endpoint
app.post('/api/chat', aiLimit, async (req, res, next) => {
  try {
    const {
      messages, subject = 'all', level = 'intermediate', name = 'Student',
      sessionId = 'anon', characterId = 'sage', language = 'en', teachingMode = 'explain',
    } = req.body;

    if (!messages?.length) return res.status(400).json({ success: false, error: 'messages required' });

    const session = getSession(sessionId, { name, subject, level, characterId, language });
    const system  = buildPrompt({ name, subject, level, characterId, language, teachingMode });
    const clean   = messages.map(m => ({ role: m.role, content: strip(m.content) }));

    const { text, provider } = await ai.chat(clean, system, 1300);
    const parsed = safeJson(text);

    if (parsed?.topic) updateSession(sessionId, { topic: parsed.topic, difficulty: parsed.difficulty });

    res.json({
      success: true,
      data:    parsed || { explanation: text, visual: null, keyNote: null, followUp: null, topic: 'Lesson', difficulty: 5 },
      meta:    { provider, sessionId, xp: session.xp + 25 },
    });
  } catch (err) { next(err); }
});

// Quiz
app.post('/api/quiz', aiLimit, async (req, res, next) => {
  try {
    const { topic, level = 'intermediate', questionCount = 4, characterId = 'sage', language = 'en', sessionId = 'anon' } = req.body;
    if (!topic) return res.status(400).json({ success: false, error: 'topic required' });

    const char  = CHARACTERS[characterId] || CHARACTERS.sage;
    const lang  = language !== 'en' ? `All questions and answers in ${LANG_INSTRUCTION[language]?.split(' ').pop() || language}.` : '';
    const count = Math.min(Math.max(parseInt(questionCount) || 4, 2), 8);

    const system = `You are ${char.name} generating educational quiz questions. ${lang}
Create ${count} questions on "${topic}" at ${level} level.
Q1: recall → Q2: comprehension → Q3: application → Q4: analysis
All distractors must be plausible. Explanations must teach.
JSON only: {"topic":"${topic}","questions":[{"question":"...","options":["A","B","C","D"],"answer":0,"explanation":"...","conceptTested":"..."}]}`;

    const { text, provider } = await ai.chat([{ role: 'user', content: `Quiz on: ${topic}` }], system, 1400);
    const parsed = safeJson(text);

    if (!parsed?.questions?.length) return res.status(502).json({ success: false, error: 'Quiz generation failed. Try again.' });
    const valid = parsed.questions.filter(q => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.answer === 'number' && q.explanation);

    const session = getSession(sessionId);
    session.quizzes++;
    sessions.set(sessionId, session);

    res.json({ success: true, data: { topic: parsed.topic || topic, level, questions: valid }, meta: { provider } });
  } catch (err) { next(err); }
});

// Flashcards
app.post('/api/flashcards', aiLimit, async (req, res, next) => {
  try {
    const { history, cardCount = 8, characterId = 'sage', language = 'en', sessionId = 'anon' } = req.body;
    if (!history?.length) return res.status(400).json({ success: false, error: 'history required' });

    const char    = CHARACTERS[characterId] || CHARACTERS.sage;
    const lang    = language !== 'en' ? `All cards in ${language} language.` : '';
    const count   = Math.min(Math.max(parseInt(cardCount) || 8, 4), 20);
    const content = history.slice(-8).map(h => `[${h.topic}] ${h.a?.slice(0,200) || h.q}`).join('\n---\n');

    const system = `You are ${char.name} creating spaced-repetition flashcards. ${lang}
Mix: 25% definition, 25% conceptual, 25% application, 25% synthesis.
One concept per card. Vary difficulty.
JSON only: {"cards":[{"question":"...","answer":"...","type":"definition|conceptual|application|synthesis","topic":"...","difficulty":1}]}

Content: ${content}`;

    const { text, provider } = await ai.chat([{ role: 'user', content: `Create ${count} flashcards.` }], system, 1600);
    const parsed = safeJson(text);

    if (!parsed?.cards?.length) return res.status(502).json({ success: false, error: 'Flashcard generation failed.' });
    const valid = parsed.cards.filter(c => c.question?.trim() && c.answer?.trim());

    res.json({ success: true, data: { cards: valid, count: valid.length }, meta: { provider } });
  } catch (err) { next(err); }
});

// Summary
app.post('/api/summary', aiLimit, async (req, res, next) => {
  try {
    const { history, name = 'Student', characterId = 'sage', language = 'en' } = req.body;
    if (!history?.length) return res.status(400).json({ success: false, error: 'history required' });

    const char     = CHARACTERS[characterId] || CHARACTERS.sage;
    const lang     = language !== 'en' ? `Write entirely in ${language} language.` : '';
    const topics   = [...new Set(history.map(h => h.topic))].join(', ');
    const content  = history.slice(-10).map((h,i) => `Q${i+1}[${h.topic}]: ${h.q}\nA: ${h.a?.slice(0,280)}`).join('\n\n');

    const system = `You are ${char.name} writing a personalized study summary for ${name}. ${lang}
Topics: ${topics}

Sections (exact headers):
KEY CONCEPTS | DEFINITIONS | TAKEAWAYS | CONNECTIONS | NEXT STEPS | ENCOURAGEMENT

400-500 words. Plain text. Reference actual topics studied. Address ${name} warmly.

Session:
${content}`;

    const { text, provider } = await ai.chat([{ role: 'user', content: `Summarize for ${name}.` }], system, 1000);
    const session = getSession('anon');

    res.json({ success: true, data: { summary: text.trim(), topics: [...new Set(history.map(h => h.topic))] }, meta: { provider } });
  } catch (err) { next(err); }
});

// Session profile
app.get('/api/session/:id', (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ success: false, error: 'Session not found' });
  res.json({ success: true, data: s });
});

// Config (characters, languages for frontend)
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      characters: [
        { id:'sage', name:'Professor Sage', title:'The Wise Scholar',        colors:{ primary:'#00f5d4',secondary:'#7b61ff',glow:'rgba(0,245,212,0.35)',skin:'#f0c896',hair:'#4a3520',robe:'#1a1040',eyes:'#2a5f8f' }, voice:{ rate:0.87,pitch:1.00,hints:['Google UK English Male','Daniel'] } },
        { id:'aria', name:'Aria',           title:'The Enthusiastic Explorer',colors:{ primary:'#ff6b9d',secondary:'#ffbe0b',glow:'rgba(255,107,157,0.35)',skin:'#ffe0bd',hair:'#1a1a2e',robe:'#1e3a5f',eyes:'#16213e' }, voice:{ rate:0.95,pitch:1.18,hints:['Google US English Female','Samantha'] } },
        { id:'kai',  name:'Kai',            title:'The Cool Strategist',       colors:{ primary:'#48cae4',secondary:'#0077b6',glow:'rgba(72,202,228,0.35)',skin:'#8d5524',hair:'#1a0a00',robe:'#023e8a',eyes:'#023e8a' }, voice:{ rate:0.85,pitch:0.92,hints:['Google UK English Male','Alex'] } },
        { id:'luna', name:'Luna',           title:'The Creative Storyteller',  colors:{ primary:'#c77dff',secondary:'#e040fb',glow:'rgba(199,125,255,0.35)',skin:'#ffd6a5',hair:'#6a0572',robe:'#240046',eyes:'#7b2d8b' }, voice:{ rate:0.90,pitch:1.10,hints:['Google US English Female','Karen'] } },
        { id:'nova', name:'Nova',           title:'The Tech Innovator',        colors:{ primary:'#10d9a0',secondary:'#00f5d4',glow:'rgba(16,217,160,0.35)',skin:'#e8c39e',hair:'#0a2342',robe:'#0d2137',eyes:'#00b4d8' }, voice:{ rate:0.92,pitch:1.02,hints:['Google US English Female','Zira'] } },
      ],
      languages: [
        { code:'en',flag:'🇬🇧',name:'English',native:'English',rtl:false },
        { code:'es',flag:'🇪🇸',name:'Spanish',native:'Español',rtl:false },
        { code:'fr',flag:'🇫🇷',name:'French',native:'Français',rtl:false },
        { code:'de',flag:'🇩🇪',name:'German',native:'Deutsch',rtl:false },
        { code:'hi',flag:'🇮🇳',name:'Hindi',native:'हिन्दी',rtl:false },
        { code:'ar',flag:'🇸🇦',name:'Arabic',native:'العربية',rtl:true },
        { code:'zh',flag:'🇨🇳',name:'Chinese',native:'中文',rtl:false },
        { code:'ja',flag:'🇯🇵',name:'Japanese',native:'日本語',rtl:false },
        { code:'pt',flag:'🇧🇷',name:'Portuguese',native:'Português',rtl:false },
        { code:'ru',flag:'🇷🇺',name:'Russian',native:'Русский',rtl:false },
        { code:'ko',flag:'🇰🇷',name:'Korean',native:'한국어',rtl:false },
        { code:'ta',flag:'🇮🇳',name:'Tamil',native:'தமிழ்',rtl:false },
      ],
      aiStatus: ai.getStatus(),
    }
  });
});

// Training data generation
app.get('/api/training/topics', (req, res) => {
  res.json({ success: true, data: {
    topics: ['pythagorean theorem','derivatives','photosynthesis','DNA','neural networks','World War I','supply and demand','quantum mechanics'],
    message: 'Run python3 ml/training/train.py generate for full dataset'
  }});
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const totalSessions = sessions.size;
  const totalInteractions = [...sessions.values()].reduce((sum, s) => sum + s.interactions, 0);
  res.json({ success: true, data: { totalSessions, totalInteractions, aiStats: ai.getStatus().stats, uptime: Math.floor(process.uptime()) }});
});

// 404
app.use((req, res) => res.status(404).json({ success: false, error: `${req.method} ${req.path} not found` }));

// Error handler
app.use((err, req, res, next) => {
  console.error(`[ERR] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Server error' });
});

// Start
server.listen(PORT, () => {
  const status = ai.getStatus();
  console.log('\n' + '═'.repeat(64));
  console.log('  NEXUS AI — Backend');
  console.log('═'.repeat(64));
  console.log(`  URL      : http://localhost:${PORT}`);
  console.log(`  AI chain : ${status.activeChain.join(' → ')}`);
  console.log(`  Provider : ${status.provider}`);
  console.log('');
  console.log('  Quick AI Setup:');
  console.log('    Free (Groq)   : Add GROQ_API_KEY to .env');
  console.log('    Trained model : Add HF_API_KEY + HF_MODEL_ID to .env');
  console.log('    Local free    : Install Ollama: ollama pull llama3.2:3b');
  console.log('    No setup      : Rule engine always active as fallback');
  console.log('═'.repeat(64) + '\n');
});

export default app;