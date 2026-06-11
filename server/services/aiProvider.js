const { getDb } = require('../db');

const PROVIDERS = {
  groq:     { name: 'Groq',     defaultModel: 'llama-3.3-70b-versatile',     baseURL: 'https://api.groq.com/openai/v1',     sdk: 'openai',   freeTier: true },
  gemini:   { name: 'Gemini',   defaultModel: 'gemini-2.0-flash',             baseURL: null,                                sdk: 'gemini',   freeTier: true },
  deepseek: { name: 'DeepSeek', defaultModel: 'deepseek-chat',                baseURL: 'https://api.deepseek.com',           sdk: 'openai',   freeTier: false },
  kimi:     { name: 'Kimi',     defaultModel: 'moonshot-v1-8k',               baseURL: 'https://api.moonshot.cn/v1',         sdk: 'openai',   freeTier: false },
  openrouter:{ name: 'OpenRouter',defaultModel: 'gpt-3.5-turbo',                baseURL: 'https://openrouter.ai/api/v1',     sdk: 'openai',   freeTier: true },
  openai:   { name: 'OpenAI',   defaultModel: 'gpt-4o-mini',                  baseURL: 'https://api.openai.com/v1',           sdk: 'openai',   freeTier: false },
  anthropic:{ name: 'Anthropic',defaultModel: 'claude-3-haiku-20240307',      baseURL: null,                                sdk: 'anthropic',freeTier: false },
  custom:   { name: 'Custom API',defaultModel: '',                            baseURL: null,                                sdk: 'openai',   freeTier: false },
};

const TASK_PRIORITY = {
  chat: ['groq', 'gemini', 'openrouter', 'openai', 'deepseek', 'kimi', 'anthropic', 'custom'],
  seo:  ['gemini', 'openrouter', 'openai', 'groq', 'deepseek', 'kimi', 'anthropic', 'custom'],
  page: ['anthropic', 'openai', 'gemini', 'openrouter', 'groq', 'deepseek', 'kimi', 'custom'],
};

const DEFAULT_TASK = 'chat';

function getSetting(db, key, fallback) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : (fallback || '');
}

function getProviderKey(db, providerKey) {
  const key = getSetting(db, `ai_key_${providerKey}`)
    || getSetting(db, 'ai_api_key')
    || (providerKey === 'anthropic' ? getSetting(db, 'anthropic_api_key') : '')
    || process.env.ANTHROPIC_API_KEY
    || '';
  return key === 'your_key_here' ? '' : key;
}

function getProviderModel(db, providerKey) {
  return getSetting(db, `ai_model_${providerKey}`)
    || getSetting(db, 'ai_model')
    || PROVIDERS[providerKey]?.defaultModel
    || '';
}

function getProviderUrl(db, providerKey) {
  if (providerKey === 'custom') return getSetting(db, 'ai_url_custom');
  return PROVIDERS[providerKey]?.baseURL || undefined;
}

function getAvailableProviders(db) {
  const available = [];
  for (const key of Object.keys(PROVIDERS)) {
    if (getProviderKey(db, key)) {
      available.push(key);
    }
  }
  return available;
}

async function callProvider(providerKey, { system, messages, maxTokens }) {
  const db = getDb();
  const provider = PROVIDERS[providerKey];
  const apiKey = getProviderKey(db, providerKey);
  const model = getProviderModel(db, providerKey);
  const apiUrl = getProviderUrl(db, providerKey);

  if (!apiKey) throw new Error('NO_KEY');

  const TIMEOUT_MS = 5000;
  if (provider.sdk === 'openai') {
    const { default: OpenAI } = require('openai');
    const client = new OpenAI({ apiKey, baseURL: apiUrl, timeout: TIMEOUT_MS, maxRetries: 0 });
    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages,
      ],
    });
    return response.choices[0].message.content;
  }

  if (provider.sdk === 'gemini') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const result = await geminiModel.generateContent({
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      requestOptions: { timeout: TIMEOUT_MS },
    });
    return result.response.text();
  }

  if (provider.sdk === 'anthropic') {
    const { Anthropic } = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: system || undefined,
      messages,
    });
    return response.content[0].text;
  }

  throw new Error('UNSUPPORTED_SDK');
}

async function callProviderWithImages(providerKey, { system, messages, images, maxTokens }) {
  const db = getDb();
  const provider = PROVIDERS[providerKey];
  const apiKey = getProviderKey(db, providerKey);
  const model = getProviderModel(db, providerKey);
  const apiUrl = getProviderUrl(db, providerKey);

  if (!apiKey) throw new Error('NO_KEY');

  // Build message parts with images
  const imgParts = images.map(img => {
    if (img.startsWith('data:image')) {
      const parts = img.split(';base64,');
      const mime = parts[0].replace('data:', '');
      const b64 = parts[1];
      return { mime, data: b64 };
    }
    return null
  }).filter(Boolean)

  const lastMsg = messages[messages.length - 1]

  if (provider.sdk === 'openai') {
    const { default: OpenAI } = require('openai');
    const client = new OpenAI({ apiKey, baseURL: apiUrl });
    const content = [
      { type: 'text', text: lastMsg.content },
      ...imgParts.map(img => ({
        type: 'image_url',
        image_url: { url: `data:${img.mime};base64,${img.data}`, detail: 'high' },
      })),
    ]
    const msgs = [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages.slice(0, -1),
      { role: 'user', content },
    ]
    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: msgs,
    })
    return response.choices[0].message.content
  }

  if (provider.sdk === 'gemini') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });
    const parts = [{ text: lastMsg.content }]
    for (const img of imgParts) {
      parts.push({
        inlineData: {
          mimeType: img.mime,
          data: img.data,
        },
      })
    }
    const contents = [
      ...messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts },
    ]
    const result = await geminiModel.generateContent({
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    })
    return result.response.text()
  }

  if (provider.sdk === 'anthropic') {
    const { Anthropic } = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const content = [
      { type: 'text', text: lastMsg.content },
      ...imgParts.map(img => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mime,
          data: img.data,
        },
      })),
    ]
    const msgs = [
      ...messages.slice(0, -1),
      { role: 'user', content },
    ]
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: system || undefined,
      messages: msgs,
    })
    return response.content[0].text
  }

  throw new Error('UNSUPPORTED_SDK');
}

async function generateText({ system, messages, maxTokens = 1000, task }) {
  const db = getDb();
  const taskType = task && TASK_PRIORITY[task] ? task : DEFAULT_TASK;
  const priority = TASK_PRIORITY[taskType];

  const configured = getAvailableProviders(db);
  if (configured.length === 0) throw new Error('AI_NOT_CONFIGURED');

  const ordered = priority.filter(p => configured.includes(p));

  let lastError = null;
  for (const providerKey of ordered) {
    try {
      return await callProvider(providerKey, { system, messages, maxTokens });
    } catch (e) {
      lastError = e;
      if (e.message !== 'NO_KEY') {
        console.error(`[aiProvider] ${PROVIDERS[providerKey].name} failed:`, e.message);
      }
    }
  }

  const names = ordered.map(k => PROVIDERS[k].name).join(', ');
  throw new Error(`All AI providers failed (tried: ${names}). Last error: ${lastError?.message}`);
}

async function generateTextWithImages({ system, messages, images, maxTokens = 1000, task }) {
  const db = getDb();
  const taskType = task && TASK_PRIORITY[task] ? task : DEFAULT_TASK;
  const priority = TASK_PRIORITY[taskType];

  const configured = getAvailableProviders(db);
  if (configured.length === 0) throw new Error('AI_NOT_CONFIGURED');

  const ordered = priority.filter(p => configured.includes(p));

  let lastError = null;
  for (const providerKey of ordered) {
    try {
      return await callProviderWithImages(providerKey, { system, messages, images, maxTokens });
    } catch (e) {
      lastError = e;
      if (e.message !== 'NO_KEY') {
        console.error(`[aiProvider] ${PROVIDERS[providerKey].name} vision failed:`, e.message);
      }
    }
  }

  const names = ordered.map(k => PROVIDERS[k].name).join(', ');
  throw new Error(`All AI providers failed (tried: ${names}). Last error: ${lastError?.message}`);
}

module.exports = { generateText, generateTextWithImages, PROVIDERS, getAvailableProviders, TASK_PRIORITY, getProviderKey, getProviderModel, getProviderUrl };
