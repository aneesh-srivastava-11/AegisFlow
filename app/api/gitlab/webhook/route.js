import { NextResponse } from 'next/server';
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
      const processPromise = handleMergeRequestEvent(payload)
        .then(result => {
          console.log(`[GitLab Webhook] Async processing complete. Status: ${result.status}, Recommendation: ${result.recommendation || 'N/A'}`);
        })
        .catch(err => {
          console.error(`[GitLab Webhook] Async processing failed:`, err);
        });

      // Keep the execution alive after responding
      try {
        const { waitUntil } = await import('next/server');
        if (typeof waitUntil === 'function') {
          waitUntil(processPromise);
          console.log(`[GitLab Webhook] Registered async processing with next/server.waitUntil`);
        } else {
          console.warn('[GitLab Webhook] next/server.waitUntil is not a function, falling back to sync await');
          await processPromise;
        }
      } catch (err) {
        console.warn('[GitLab Webhook] next/server.waitUntil import failed, falling back to sync await:', err.message);
        await processPromise;
      }

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
    service: 'Code Review AI GitLab Webhook',
    timestamp: new Date().toISOString(),
    events_handled: ['Merge Request Hook'],
  });
}
