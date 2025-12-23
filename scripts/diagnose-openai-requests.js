/**
 * Comprehensive diagnostic tool to identify where OpenAI requests are going
 * 
 * This script:
 * 1. Checks if .env.local exists and contains VITE_OPENAI_API_KEY
 * 2. Shows which API key is being used (preview only)
 * 3. Makes a test API call to verify the key works
 * 4. Provides instructions on where to find requests in OpenAI dashboard
 * 
 * Usage: node scripts/diagnose-openai-requests.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 OpenAI Request Diagnostic Tool\n');
console.log('=' .repeat(60));
console.log('');

// Step 1: Check for .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
let apiKey = null;
let envFileExists = false;

console.log('📁 Step 1: Checking for .env.local file...');
if (fs.existsSync(envPath)) {
  envFileExists = true;
  console.log('  ✅ .env.local file found');
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/VITE_OPENAI_API_KEY=(.+)/);
    if (match) {
      apiKey = match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
      console.log('  ✅ VITE_OPENAI_API_KEY found in file');
    } else {
      console.log('  ⚠️  VITE_OPENAI_API_KEY not found in .env.local');
      console.log('  💡 Add: VITE_OPENAI_API_KEY=sk-your-key-here');
    }
  } catch (err) {
    console.log('  ❌ Error reading .env.local:', err.message);
  }
} else {
  console.log('  ❌ .env.local file NOT found');
  console.log('  💡 Create .env.local in project root with:');
  console.log('     VITE_OPENAI_API_KEY=sk-your-key-here');
}

console.log('');

// Step 2: Check environment variable
if (!apiKey) {
  apiKey = process.env.VITE_OPENAI_API_KEY;
  if (apiKey) {
    console.log('📝 Step 2: Checking environment variable...');
    console.log('  ✅ VITE_OPENAI_API_KEY found in environment');
    console.log('');
  }
}

// Step 3: Show API key information
if (apiKey) {
  const keyPreview = `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`;
  console.log('🔑 Step 3: API Key Information');
  console.log('  - Key Preview:', keyPreview);
  console.log('  - Key Length:', apiKey.length, 'characters');
  console.log('  - Key Format:', apiKey.startsWith('sk-') ? '✅ Valid format' : '⚠️  Unexpected format');
  console.log('');
  
  // Step 4: Test API call
  console.log('🚀 Step 4: Testing OpenAI API Connection...');
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
      console.log('  ❌ API Call Failed');
      console.log('  - Status:', response.status, response.statusText);
      console.log('  - Error:', JSON.stringify(data, null, 2));
      console.log('');
      
      if (response.status === 401) {
        console.log('  💡 DIAGNOSIS: Invalid API key');
        console.log('     - The API key is incorrect or expired');
        console.log('     - Requests will NOT appear in your OpenAI account');
        console.log('     - Solution: Get a new API key from https://platform.openai.com/api-keys');
      } else if (response.status === 429) {
        console.log('  💡 DIAGNOSIS: Rate limit exceeded');
        console.log('     - Too many requests. Wait a moment and try again.');
      } else if (data.error?.code === 'insufficient_quota') {
        console.log('  💡 DIAGNOSIS: Insufficient quota');
        console.log('     - The OpenAI account has no credits');
        console.log('     - Requests may be logged but will fail');
        console.log('     - Solution: Add credits to the OpenAI account');
      }
      process.exit(1);
    }

    console.log('  ✅ API Call Successful!');
    console.log('  - Response ID:', data.id);
    console.log('  - Model Used:', data.model);
    console.log('  - Tokens Used:', data.usage?.total_tokens || 'unknown');
    console.log('  - Response:', data.choices[0]?.message?.content || 'No content');
    console.log('');
    
    // Step 5: Where to find requests
    console.log('📊 Step 5: Where to Find This Request in OpenAI Dashboard');
    console.log('=' .repeat(60));
    console.log('');
    console.log('🔍 IMPORTANT: Requests appear in the account that OWNS the API key');
    console.log('');
    console.log('To find your requests:');
    console.log('  1. Go to https://platform.openai.com/usage');
    console.log('  2. Filter by date/time when you tested');
    console.log('  3. Look for requests to "gpt-4o-mini" model');
    console.log('  4. Search for Response ID:', data.id);
    console.log('');
    console.log('To identify which account owns this API key:');
    console.log('  1. Go to https://platform.openai.com/api-keys');
    console.log('  2. Look for a key starting with:', apiKey.substring(0, 7));
    console.log('  3. The account shown there is where requests will appear');
    console.log('');
    console.log('⚠️  If you don\'t see the key in your account:');
    console.log('   - The API key belongs to a DIFFERENT OpenAI account');
    console.log('   - You need to use YOUR OWN API key from your account');
    console.log('   - Replace VITE_OPENAI_API_KEY in .env.local with your key');
    console.log('');
    console.log('✅ SUMMARY:');
    console.log('  - API Key Preview:', keyPreview);
    console.log('  - Requests are going to: The account that owns this API key');
    console.log('  - Check that account\'s usage dashboard to see requests');
    console.log('');
    
  } catch (error) {
    console.log('  ❌ Network Error:', error.message);
    console.log('  💡 Check your internet connection and try again.');
    process.exit(1);
  }
} else {
  console.log('❌ No API key found');
  console.log('');
  console.log('💡 To fix this:');
  console.log('  1. Create .env.local file in project root');
  console.log('  2. Add: VITE_OPENAI_API_KEY=sk-your-actual-key-here');
  console.log('  3. Get your key from: https://platform.openai.com/api-keys');
  console.log('  4. Restart your dev server after adding the key');
  console.log('');
  process.exit(1);
}

