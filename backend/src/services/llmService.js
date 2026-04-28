// Provider-agnostic LLM layer.
//
// One function: `complete({ system, user })` returns a string.
// The provider is selected once via `LLM_PROVIDER` and the rest of the app
// never knows which one is in use. Adding a new provider = adding one branch.

const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const config = require('../config');
const logger = require('../utils/logger');
const { retry } = require('../utils/retry');
const { AppError } = require('../utils/errors');

let _anthropic;
let _openai;
let _gemini;

const getAnthropic = () => {
  if (!_anthropic) {
    if (!config.llm.anthropic.apiKey) {
      throw new AppError('ANTHROPIC_API_KEY is not set', 500, 'LLM_CONFIG');
    }
    _anthropic = new Anthropic({
      apiKey: config.llm.anthropic.apiKey,
      timeout: config.llm.timeoutMs,
    });
  }
  return _anthropic;
};

const getOpenAI = () => {
  if (!_openai) {
    if (!config.llm.openai.apiKey) {
      throw new AppError('OPENAI_API_KEY is not set', 500, 'LLM_CONFIG');
    }
    _openai = new OpenAI({
      apiKey: config.llm.openai.apiKey,
      timeout: config.llm.timeoutMs,
    });
  }
  return _openai;
};

const getGemini = () => {
  if (!_gemini) {
    if (!config.llm.gemini.apiKey) {
      throw new AppError('GEMINI_API_KEY is not set', 500, 'LLM_CONFIG');
    }
    _gemini = new GoogleGenerativeAI(config.llm.gemini.apiKey);
  }
  return _gemini;
};

async function callAnthropic({ system, user, maxTokens }) {
  const res = await getAnthropic().messages.create({
    model: config.llm.anthropic.model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  // Concatenate text blocks — Anthropic returns an array.
  return (res.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

async function callOpenAI({ system, user, maxTokens }) {
  const res = await getOpenAI().chat.completions.create({
    model: config.llm.openai.model,
    max_tokens: maxTokens,
    // Strict JSON mode — every prompt in this app expects JSON back.
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return (res.choices?.[0]?.message?.content || '').trim();
}

async function callGemini({ system, user, maxTokens }) {
  // Gemini uses `systemInstruction` rather than a system message, and may
  // refuse to return text if the prompt-feedback flags it. Surface that as
  // a usable error rather than an empty string.
  // Gemini 2.5 enables "thinking" by default, which silently consumes the
  // maxOutputTokens budget before any visible text is produced — leaving the
  // response empty and downstream JSON parsing dead. Pin thinkingBudget to 0
  // so the model behaves like 2.0-flash (cheap, deterministic JSON output).
  // The legacy @google/generative-ai SDK forwards generationConfig as-is, so
  // unknown keys like thinkingConfig pass through to the v1beta REST API.
  const model = getGemini().getGenerativeModel({
    model: config.llm.gemini.model,
    systemInstruction: system,
    generationConfig: {
      maxOutputTokens: maxTokens,
      thinkingConfig: { thinkingBudget: 0 },
      // Strict JSON mode — Gemini will only emit valid application/json.
      // Eliminates trailing commas, prose preambles, and unescaped quotes
      // inside string fields (the LLM_BAD_JSON we kept hitting).
      responseMimeType: 'application/json',
    },
  });

  let res;
  try {
    res = await model.generateContent(user);
  } catch (err) {
    const msg = err.message || '';

    // Invalid / expired API key (400 API_KEY_INVALID). Don't retry — no
    // amount of waiting fixes a bad credential.
    if (err.status === 400 && /API_KEY_INVALID|API key expired|API key not valid/i.test(msg)) {
      const appErr = new AppError(
        'Gemini API key is invalid or expired. Generate a new one at https://aistudio.google.com/app/apikey and update GEMINI_API_KEY.',
        401,
        'LLM_AUTH'
      );
      appErr.noRetry = true;
      throw appErr;
    }

    // Quota exceeded (429). Surface as a clean, actionable error.
    if (err.status === 429 || /429|quota|rate.?limit/i.test(msg)) {
      const retryMatch = /retry in ([\d.]+)s/i.exec(msg);
      const retryHint = retryMatch ? ` Retry in ~${Math.ceil(Number(retryMatch[1]))}s.` : '';
      const appErr = new AppError(
        `Gemini quota exceeded for ${config.llm.gemini.model}.${retryHint} ` +
          `Try a higher-quota model (e.g. gemini-2.0-flash-lite) or wait for the daily reset.`,
        429,
        'LLM_QUOTA',
        { model: config.llm.gemini.model, retryAfterSeconds: retryMatch ? Number(retryMatch[1]) : null }
      );
      appErr.noRetry = true; // Don't burn the rest of the daily quota retrying.
      throw appErr;
    }

    throw err;
  }

  const blockReason = res.response?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new AppError(`Gemini blocked the prompt: ${blockReason}`, 502, 'LLM_BLOCKED');
  }
  let text = '';
  try {
    text = res.response?.text() || '';
  } catch (err) {
    throw new AppError(`Gemini returned no text: ${err.message}`, 502, 'LLM_NO_TEXT');
  }
  return text.trim();
}

const PROVIDERS = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  gemini: callGemini,
};

async function complete({ system, user, maxTokens = 2000, label = 'llm' }) {
  const fn = PROVIDERS[config.llm.provider];
  if (!fn) {
    throw new AppError(`Unknown LLM provider: ${config.llm.provider}`, 500, 'LLM_CONFIG');
  }
  return retry(
    async () => {
      logger.debug(`${label}: calling ${config.llm.provider}`);
      const text = await fn({ system, user, maxTokens });
      if (!text) throw new Error('Empty completion');
      return text;
    },
    { retries: config.llm.maxRetries, label }
  );
}

module.exports = { complete };
