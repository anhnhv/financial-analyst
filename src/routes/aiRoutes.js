const express = require('express');
const router = express.Router();
const ai = require('../services/googleAiService');

/**
 * POST /api/ai/generate
 * Single-turn text generation.
 * Body: { prompt: string, systemInstruction?: string }
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { prompt, systemInstruction } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: '`prompt` is required and must be a non-empty string.' });
    }
    const text = await ai.generate(prompt.trim(), systemInstruction);
    res.json({ model: ai.MODEL, text });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
