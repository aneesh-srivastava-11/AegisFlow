import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function seed() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error('❌ DATABASE_URL is not set in your .env.local file.');
    process.exit(1);
  }

  const sql = neon(uri);

  try {
    console.log('Seeding Neon database with mock developer user...');

    await sql`
      INSERT INTO users (uid, email, gemini_api_key, github_owner, policy_severity_threshold, policy_auto_approve, policy_ignored_dirs, updated_at)
      VALUES (
        'mock-dev-admin', 
        'test1@test.com', 
        ${process.env.GEMINI_API_KEY || 'mock-gemini-key'}, 
        'test-owner', 
        'CRITICAL',
        true,
        '',
        NOW()
      )
      ON CONFLICT (uid) DO UPDATE
      SET email = EXCLUDED.email,
          gemini_api_key = EXCLUDED.gemini_api_key,
          github_owner = EXCLUDED.github_owner,
          updated_at = NOW()
    `;

    console.log(`✅ Successfully seeded Neon Postgres user table for test1@test.com (UID: mock-dev-admin)`);
    console.log(`👉 You can now log in locally using test1@test.com and password: test1234`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed database user:', error.message);
    process.exit(1);
  }
}

seed();
