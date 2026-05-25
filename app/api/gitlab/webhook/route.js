import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { verifyGitlabWebhookSignature } from '@/lib/gitlab';
import { handleMergeRequestEvent } from '@/lib/webhook-handler';

/**
 * GitLab Webhook Handler
 * Receives and processes GitLab webhook events for merge requests
 * 
 * POST /api/gitlab/webhook
 */
export async function POST(request) {
  const startTime = Date.now();

  try {
    // Read raw body for signature verification
    const rawBody = await request.text();
    const tokenHeader = request.headers.get('x-gitlab-token');
    const event = request.headers.get('x-gitlab-event');

    console.log(`[GitLab Webhook] Received event: ${event}`);

    // Verify webhook signature
    const isValid = verifyGitlabWebhookSignature(tokenHeader);
    if (!isValid) {
      console.warn('[GitLab Webhook] Invalid token');
      return NextResponse.json(
        { error: 'Invalid webhook secret token' },
        { status: 401 }
      );
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Handle Merge Request events
    if (event === 'Merge Request Hook') {
      // Bug #2 fix: Use next/server after() to guarantee the 202 response fires
      // before the long-running Gemini scan and GitLab comment posting begins.
      after(async () => {
        try {
          const result = await handleMergeRequestEvent(payload);
          console.log(`[GitLab Webhook] Background processing complete. Status: ${result.status}, Recommendation: ${result.recommendation || 'N/A'}`);
        } catch (err) {
          console.error('[GitLab Webhook] Background processing failed:', err);
        }
      });

      return NextResponse.json({
        status: 'accepted',
        message: 'Analysis started in background',
      }, { status: 202 });
    }

    // Unhandled event
    console.log(`[GitLab Webhook] Unhandled event: ${event}`);
    return NextResponse.json({
      status: 'ignored',
      message: `Event '${event}' not processed`,
    });
  } catch (error) {
    console.error('[GitLab Webhook] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
        processingTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'AegisFlow GitLab Webhook',
    timestamp: new Date().toISOString(),
    events_handled: ['Merge Request Hook'],
  });
}
