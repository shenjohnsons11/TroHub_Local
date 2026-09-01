require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_LANDLORD_API_KEY || process.env.GEMINI_API_KEY || process.env.GEMINI_TENANT_API_KEY;
console.log('Using API key:', apiKey ? `${apiKey.slice(0, 6)}...` : 'NONE');

const client = new GoogleGenAI({ apiKey });

async function listAllModels() {
  try {
    const list = await client.models.list();
    console.log('Available models:');
    for await (const m of list) {
      console.log('-', m.name);
    }
  } catch (err) {
    console.error('List models error:', err);
  }
}

listAllModels();
