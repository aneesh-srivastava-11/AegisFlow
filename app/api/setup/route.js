import { NextResponse } from 'next/server';
import { initializeIndexes } from '@/lib/mongodb';
import { verifyServerSession } from '@/lib/auth-middleware';
import breaches from '@/data/famous-breaches.json';
import patterns from '@/data/cve-patterns.json';

/**
 * Setup Endpoint
 * Initializes database indexes and returns GitHub App configuration
 * 
 * POST /api/setup - Initialize database (Admin only)
 * GET /api/setup - Get GitHub App manifest for installation
 */
export async function POST(request) {
  try {
    // Verify admin session
    const session = await verifyServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    await initializeIndexes();

    // Seed famous breaches if they don't exist
    const { getCollection } = await import('@/lib/mongodb');
    const breachDb = await getCollection('breach_database');
    const count = await breachDb.countDocuments();
    
    let seededBreaches = 0;
    if (count === 0) {
      await breachDb.insertMany(breaches);
      seededBreaches = breaches.length;
      console.log(`[MongoDB] Seeded ${seededBreaches} famous breaches`);
    }

    // Seed CVE patterns
    const patternsDb = await getCollection('cve_patterns');
    const patternCount = await patternsDb.countDocuments();
    let seededPatterns = 0;
    if (patternCount === 0) {
      await patternsDb.insertMany(patterns);
      seededPatterns = patterns.length;
      console.log(`[MongoDB] Seeded ${seededPatterns} CVE patterns`);
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Database initialized successfully',
      seeded: {
        breaches: seededBreaches,
        patterns: seededPatterns
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Setup] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://code-review-ai.vercel.app';

  // GitHub App manifest for one-click installation
  const manifest = {
    name: 'AI Code Review',
    description: 'AI-powered security code review using Gemini 2.0 Flash. Automatically detects vulnerabilities, secrets, and security issues in pull requests.',
    url: appUrl,
    hook_attributes: {
      url: `${appUrl}/api/github/webhook`,
      active: true,
    },
    redirect_url: `${appUrl}/install?success=true`,
    setup_url: `${appUrl}/install?setup=true`,
    callback_urls: [`${appUrl}/api/github/callback`],
    public: true,
    default_events: [
      'pull_request',
      'pull_request_review',
    ],
    default_permissions: {
      pull_requests: 'write',
      contents: 'read',
      metadata: 'read',
      checks: 'write',
    },
  };

  return NextResponse.json({
    manifest,
    installUrl: `https://github.com/settings/apps/new?manifest=${encodeURIComponent(JSON.stringify(manifest))}`,
    instructions: {
      step1: 'Click the install URL to create your GitHub App',
      step2: 'Install the app on your repositories',
      step3: 'Open a PR - the AI will automatically review it',
    },
  });
}
