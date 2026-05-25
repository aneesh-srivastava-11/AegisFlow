import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/code-review-ai';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');

    const testUser = {
      uid: 'mock-dev-admin',
      email: 'test1@test.com',
      geminiApiKey: process.env.GEMINI_API_KEY || 'mock-gemini-key',
      githubOwner: 'test-owner',
      gitlabOwner: 'test-group',
      updatedAt: new Date()
    };

    await users.updateOne(
      { uid: 'mock-dev-admin' },
      { $set: testUser },
      { upsert: true }
    );

    console.log(`Successfully seeded MongoDB for test1@test.com (UID: mock-dev-admin)`);
    console.log(`You can now log in locally using test1@test.com and password: test1234`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed MongoDB user:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
