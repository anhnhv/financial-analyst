const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// gemini-3.1-flash-lite is free on the free tier (as of 2025/2026)
const MODEL = 'gemini-2.5-flash';

function getModel(systemInstruction) {
  return genAI.getGenerativeModel({
    model: MODEL,
    ...(systemInstruction ? { systemInstruction } : {}),
  });
}

/**
 * Single-turn text generation.
 * @param {string} prompt
 * @param {string} [systemInstruction]
 * @returns {Promise<string>}
 */
async function generate(prompt, systemInstruction) {
  const model = getModel(systemInstruction);
  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { generate, MODEL };
