/**
 * API Connection Test Script
 * Run: node test-apis.js
 * 
 * Tests all external service connections before starting development.
 * Make sure .env.local is populated before running.
 */

require('dotenv').config({ path: '.env.local' });

async function testAPIs() {
  console.log('\n🧪 Testing API connections...\n');
  let allPassed = true;

  // ─── Test Gemini API ───────────────────────────────────────
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set in .env.local');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent("Respond with only: API works!");
    const text = result.response.text().trim();
    console.log('✅ Gemini API:', text);
  } catch (err) {
    console.log('❌ Gemini API failed:', err.message);
    allPassed = false;
  }

  // ─── Test MongoDB ──────────────────────────────────────────
  try {
    const { MongoClient } = require('mongodb');
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set in .env.local');
    const client = new MongoClient(process.env.MONGODB_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    await client.db().admin().ping();
    console.log('✅ MongoDB connected');
    await client.close();
  } catch (err) {
    console.log('❌ MongoDB failed:', err.message);
    if (err.message.includes('ENOTFOUND') || err.message.includes('timeout')) {
      console.log('   → Check your MONGODB_URI and IP whitelist (0.0.0.0/0)');
    }
    allPassed = false;
  }

  // ─── Test GitHub API ───────────────────────────────────────
  try {
    if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set in .env.local');
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Code-Review-AI-Test',
      },
    });
    if (response.ok) {
      const user = await response.json();
      console.log('✅ GitHub API: authenticated as', user.login);
    } else if (response.status === 401) {
      throw new Error('Invalid token (401 Unauthorized)');
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    console.log('❌ GitHub API failed:', err.message);
    allPassed = false;
  }

  // ─── Test GitLab API ───────────────────────────────────────
  try {
    if (!process.env.GITLAB_TOKEN) throw new Error('GITLAB_TOKEN not set in .env.local');
    const apiUrl = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';
    const response = await fetch(`${apiUrl}/user`, {
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_TOKEN,
      },
    });
    if (response.ok) {
      const user = await response.json();
      console.log('✅ GitLab API: authenticated as', user.username);
    } else if (response.status === 401) {
      throw new Error('Invalid token (401 Unauthorized)');
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    console.log('❌ GitLab API failed:', err.message);
    allPassed = false;
  }

  // ─── Summary ───────────────────────────────────────────────
  console.log('');
  if (allPassed) {
    console.log('✨ All APIs connected successfully! You\'re ready to build.\n');
  } else {
    console.log('⚠️  Some APIs failed. Fix the issues above before continuing.\n');
    console.log('   Make sure .env.local has all values filled in.');
    console.log('   See PREREQUISITES.md for setup instructions.\n');
  }

  process.exit(allPassed ? 0 : 1);
}

testAPIs();
