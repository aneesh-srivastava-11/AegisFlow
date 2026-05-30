/**
 * Neon Postgres Database Connection Test Script
 * Run: node scripts/test-db.js
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function testConnection() {
  console.log('\n🧪 Testing Neon Postgres Connection...\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in your .env.local file.');
    process.exit(1);
  }

  try {
    const sql = neon(connectionString);
    console.log('🔗 Connecting to Neon Database...');
    const result = await sql`SELECT NOW() AS current_time`;
    console.log('✅ Connection Successful!');
    console.log(`🕒 Server Time: ${result[0].current_time}`);

    console.log('\n📋 Checking for database tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    if (tables.length > 0) {
      console.log(`✅ Found tables: ${tables.map(t => t.table_name).join(', ')}`);
    } else {
      console.log('ℹ️ No tables found. Run the /api/setup route or call the setup script to initialize the schemas.');
    }

    console.log('\n✨ Database is ready to use!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
