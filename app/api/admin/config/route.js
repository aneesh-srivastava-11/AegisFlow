import { NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth-middleware';

export async function GET(request) {
  // Verify user session
  const session = await verifyServerSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check required env vars status (exist check, don't return actual values for security)
  const envStatus = {
    MONGODB_URI: !!process.env.MONGODB_URI,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    GITHUB_APP_ID: !!process.env.GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY: !!process.env.GITHUB_APP_PRIVATE_KEY,
    WEBHOOK_SECRET: !!process.env.WEBHOOK_SECRET,
    NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_GITHUB_APP_SLUG: !!process.env.NEXT_PUBLIC_GITHUB_APP_SLUG,
  };

  const isConfigured = Object.values(envStatus).every(v => v);

  return NextResponse.json({
    status: 'ok',
    isConfigured,
    config: envStatus,
    adminUser: {
      uid: session.uid,
      email: session.email,
    }
  });
}
