import { NextResponse } from 'next/server';
import { query } from '@/lib/neon';
import { verifyServerSession } from '@/lib/auth-middleware';

export async function POST(request) {
  const session = await verifyServerSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { 
      geminiApiKey, 
      githubOwner, 
      policySeverityThreshold, 
      policyAutoApprove, 
      policyIgnoredDirs 
    } = await request.json();

    await query(
      `INSERT INTO users (
        uid, email, gemini_api_key, github_owner, 
        policy_severity_threshold, policy_auto_approve, policy_ignored_dirs, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (uid) DO UPDATE
      SET email = COALESCE(NULLIF(EXCLUDED.email, ''), users.email),
          gemini_api_key = CASE 
            WHEN EXCLUDED.gemini_api_key IS NOT NULL AND EXCLUDED.gemini_api_key != '' 
            THEN EXCLUDED.gemini_api_key 
            ELSE users.gemini_api_key 
          END,
          github_owner = COALESCE(EXCLUDED.github_owner, users.github_owner),
          policy_severity_threshold = COALESCE(EXCLUDED.policy_severity_threshold, users.policy_severity_threshold),
          policy_auto_approve = COALESCE(EXCLUDED.policy_auto_approve, users.policy_auto_approve),
          policy_ignored_dirs = COALESCE(EXCLUDED.policy_ignored_dirs, users.policy_ignored_dirs),
          updated_at = NOW()`,
      [
        session.uid, 
        session.email || '', 
        geminiApiKey || null, 
        githubOwner || null,
        policySeverityThreshold || 'CRITICAL',
        policyAutoApprove !== undefined ? policyAutoApprove : true,
        policyIgnoredDirs || ''
      ]
    );

    return NextResponse.json({ status: 'ok', message: 'Settings saved successfully' });
  } catch (error) {
    console.error('[User Settings] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const session = await verifyServerSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userRes = await query('SELECT * FROM users WHERE uid = $1', [session.uid]);
    const user = userRes[0];
    
    return NextResponse.json({ 
      hasApiKey: !!(user && user.gemini_api_key),
      maskedKey: user && user.gemini_api_key ? `...${user.gemini_api_key.slice(-4)}` : null,
      githubOwner: user?.github_owner || '',
      policySeverityThreshold: user?.policy_severity_threshold || 'CRITICAL',
      policyAutoApprove: user?.policy_auto_approve !== undefined ? user.policy_auto_approve : true,
      policyIgnoredDirs: user?.policy_ignored_dirs || ''
    });
  } catch (error) {
    console.error('[User Settings] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
