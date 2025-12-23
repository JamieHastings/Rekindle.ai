/**
 * Test script to verify OpenAI API key and track where requests are going
 * 
 * This script helps identify:
 * 1. Which OpenAI account the API key belongs to
 * 2. Whether requests are being made successfully
 * 3. Where the requests appear in OpenAI dashboard
 * 
 * Usage: 
 *   Windows: set VITE_OPENAI_API_KEY=sk-... && node scripts/test-openai-request-tracking.js
 *   Mac/Linux: VITE_OPENAI_API_KEY=sk-... node scripts/test-openai-request-tracking.js
 * 
 * Or manually edit this file and set apiKey variable below.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to read from .env.local file
let apiKey = process.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/VITE_OPENAI_API_KEY=(.+)/);
      if (match) {
        apiKey = match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
      }
    }
  } catch (err) {
    // Ignore file read errors
  }
}

if (!apiKey) {
  console.error('❌ VITE_OPENAI_API_KEY not found in .env.local');
  console.error('   Please add: VITE_OPENAI_API_KEY=sk-your-key-here');
  process.exit(1);
}

// Show API key preview (first 7 + last 4 chars)
const keyPreview = `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`;
console.log('🔍 OpenAI API Key Information:');
console.log('  - Key Preview:', keyPreview);
console.log('  - Key Length:', apiKey.length, 'characters');
console.log('  - Key Format:', apiKey.startsWith('sk-') ? 'Valid format (starts with sk-)' : '⚠️  Unexpected format');
console.log('');

// Test API call
async function testOpenAICall() {
  console.log('🚀 Making test OpenAI API call...');
  console.log('  - Endpoint: https://api.openai.com/v1/chat/completions');
  console.log('  - Model: gpt-4o-mini');
  console.log('');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a test assistant. Respond briefly.',
          },
          {
            role: 'user',
            content: 'Say "Test successful" if you receive this message.',
          },
        ],
        max_tokens: 50,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Call Failed:');
      console.error('  - Status:', response.status, response.statusText);
      console.error('  - Error:', JSON.stringify(data, null, 2));
      
      if (response.status === 401) {
        console.error('');
        console.error('💡 This means the API key is invalid or expired.');
        console.error('   The requests will NOT appear in your OpenAI account.');
      } else if (response.status === 429) {
        console.error('');
        console.error('💡 Rate limit exceeded. Try again later.');
      } else if (data.error?.code === 'insufficient_quota') {
        console.error('');
        console.error('💡 The OpenAI account has no credits.');
        console.error('   Requests may be logged but will fail.');
      }
      process.exit(1);
    }

    console.log('✅ API Call Successful!');
    console.log('  - Response ID:', data.id);
    console.log('  - Model Used:', data.model);
    console.log('  - Tokens Used:', data.usage?.total_tokens || 'unknown');
    console.log('  - Response:', data.choices[0]?.message?.content || 'No content');
    console.log('');
    console.log('📊 IMPORTANT: Where to find this request in OpenAI Dashboard:');
    console.log('  1. Go to https://platform.openai.com/usage');
    console.log('  2. Look for requests with API key:', keyPreview);
    console.log('  3. The request should appear under the account that owns this API key');
    console.log('  4. If you don\'t see it, the API key belongs to a different account');
    console.log('');
    console.log('🔑 To see which account owns this key:');
    console.log('  1. Go to https://platform.openai.com/api-keys');
    console.log('  2. Check if a key starting with', apiKey.substring(0, 7), 'exists');
    console.log('  3. The account shown there is where requests will appear');
    console.log('');

  } catch (error) {
    console.error('❌ Network Error:', error.message);
    console.error('   Check your internet connection and try again.');
    process.exit(1);
  }
}

testOpenAICall();

