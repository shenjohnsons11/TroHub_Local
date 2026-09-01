require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_LANDLORD_API_KEY || process.env.GEMINI_API_KEY;
const client = new GoogleGenAI({ apiKey });

async function testGeneration() {
  const models = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
  for (const m of models) {
    try {
      const start = Date.now();
      const res = await client.models.generateContent({
        model: m,
        contents: 'Xin chào, hãy trả về chữ "OK"',
      });
      console.log(`✅ Model ${m} SUCCESS (${Date.now() - start}ms):`, res.text?.trim());
    } catch (e) {
      console.log(`❌ Model ${m} FAILED:`, e.message);
    }
  }
}

testGeneration();
