import { NextResponse } from 'next/server';
import { initializeDatabase, query } from '@/lib/neon';
import { verifyServerSession } from '@/lib/auth-middleware';
import breaches from '@/data/famous-breaches.json';
import patterns from '@/data/cve-patterns.json';

/**
 * Setup Endpoint for Neon PostgreSQL
 * Initializes database schemas, indexes, and seeds initial data
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

    // Initialize tables and indexes in Neon
    await initializeDatabase();

    // Seed famous breaches if table is empty
    const countRes = await query('SELECT COUNT(*) AS count FROM breach_database');
    const count = parseInt(countRes[0].count, 10);
    
    let seededBreaches = 0;
    if (count === 0) {
      for (const b of breaches) {
        await query(
          `INSERT INTO breach_database (
            slug, name, category, year, description, affected_users, financial_impact,
            severity, vulnerable_code, language, detection_points, cve, lessons, what_happened, our_detection
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13::jsonb, $14, $15)`,
          [
            b.slug, b.name, b.category, b.year, b.description, b.affected_users, b.financial_impact,
            b.severity, b.vulnerable_code, b.language, JSON.stringify(b.detection_points || []),
            b.cve, JSON.stringify(b.lessons || []), b.what_happened || '', b.our_detection || ''
          ]
        );
      }
      seededBreaches = breaches.length;
      console.log(`[Neon DB] Seeded ${seededBreaches} famous breaches`);
    }

    // Seed CVE patterns if table is empty
    const patternCountRes = await query('SELECT COUNT(*) AS count FROM cve_patterns');
    const patternCount = parseInt(patternCountRes[0].count, 10);
    
    let seededPatterns = 0;
    if (patternCount === 0) {
      for (const p of patterns) {
        await query(
          `INSERT INTO cve_patterns (
            id, name, severity, description, languages, examples, cwe
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
          [
            p.id, p.name, p.severity, p.description, JSON.stringify(p.languages || []),
            JSON.stringify(p.examples || []), p.cwe || ''
          ]
        );
      }
      seededPatterns = patterns.length;
      console.log(`[Neon DB] Seeded ${seededPatterns} CVE patterns`);
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Neon database initialized and seeded successfully',
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
    description: 'AI-powered security code review using Gemini. Automatically detects vulnerabilities, secrets, and security issues in pull requests.',
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
