import { MongoClient } from 'mongodb';

const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 10000,
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  retryReads: true,
};

/**
 * Get the MongoDB client promise (lazy initialization)
 * @returns {Promise<import('mongodb').MongoClient>}
 */
function getClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export default getClientPromise;

/**
 * Get the database instance
 * @param {string} dbName - Database name (default: code-review-ai)
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDatabase(dbName = 'code-review-ai') {
  const client = await getClientPromise();
  return client.db(dbName);
}

/**
 * Get a specific collection with type safety
 * @param {string} collectionName 
 * @returns {Promise<import('mongodb').Collection>}
 */
export async function getCollection(collectionName) {
  const db = await getDatabase();
  return db.collection(collectionName);
}

/**
 * Initialize database indexes for optimal performance
 * Called once on first deployment
 */
export async function initializeIndexes() {
  const db = await getDatabase();

  // Analyses collection indexes
  await db.collection('analyses').createIndexes([
    { key: { repositoryId: 1, createdAt: -1 }, name: 'repo_date_idx' },
    { key: { 'pullRequest.number': 1, repositoryId: 1 }, name: 'pr_repo_idx' },
    { key: { status: 1 }, name: 'status_idx' },
    { key: { createdAt: -1 }, name: 'date_idx' },
    { key: { 'results.recommendation': 1 }, name: 'recommendation_idx' },
  ]);

  // Repositories collection indexes
  await db.collection('repositories').createIndexes([
    { key: { fullName: 1 }, name: 'fullname_idx', unique: true },
    { key: { installationId: 1 }, name: 'installation_idx' },
    { key: { owner: 1 }, name: 'owner_idx' },
  ]);

  // Vulnerabilities collection indexes
  await db.collection('vulnerabilities').createIndexes([
    { key: { type: 1, severity: 1 }, name: 'type_severity_idx' },
    { key: { language: 1 }, name: 'language_idx' },
    { key: { repositoryId: 1 }, name: 'vuln_repo_idx' },
    { key: { detectedAt: -1 }, name: 'vuln_date_idx' },
  ]);

  // Breach database indexes
  await db.collection('breach_database').createIndexes([
    { key: { slug: 1 }, name: 'breach_slug_idx', unique: true },
    { key: { year: -1 }, name: 'breach_year_idx' },
  ]);

  // Rate limits collection indexes with TTL to expire entries after 5 minutes
  await db.collection('rate_limits').createIndexes([
    { key: { updatedAt: 1 }, name: 'rate_limit_ttl_idx', expireAfterSeconds: 300 },
  ]);

  // Feature C: Webhook logs collection indexes
  // TTL of 30 days — logs are diagnostic; they don't need to be kept forever
  await db.collection('webhook_logs').createIndexes([
    { key: { receivedAt: -1 }, name: 'wlog_date_idx' },
    { key: { source: 1, status: 1 }, name: 'wlog_source_status_idx' },
    { key: { repositoryId: 1 }, name: 'wlog_repo_idx' },
    { key: { receivedAt: 1 }, name: 'wlog_ttl_idx', expireAfterSeconds: 60 * 60 * 24 * 30 },
  ]);

  console.log('[MongoDB] Indexes initialized successfully');
}
