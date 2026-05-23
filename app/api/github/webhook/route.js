import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/github';
import { handlePullRequestEvent } from '@/lib/webhook-handler';

/**
 * GitHub Webhook Handler
 * Receives and processes GitHub webhook events for pull requests
 * 
 * POST /api/github/webhook
 */
export async function POST(request) {
  const startTime = Date.now();

  try {
    // Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');

    console.log(`[Webhook] Received event: ${event}, delivery: ${deliveryId}`);

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('[Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
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

    // Handle ping event (sent when webhook is first configured)
    if (event === 'ping') {
      console.log('[Webhook] Ping received, webhook configured successfully');
      return NextResponse.json({
        status: 'ok',
        message: 'Webhook configured successfully',
        zen: payload.zen,
      });
    }

    // Handle installation events
    if (event === 'installation') {
      console.log(`[Webhook] Installation event: ${payload.action}`);
      return NextResponse.json({
        status: 'ok',
        message: `Installation ${payload.action}`,
      });
    }

    // Handle pull request events
    if (event === 'pull_request') {
      const processPromise = handlePullRequestEvent(payload)
        .then(result => {
          console.log(`[Webhook] Async processing complete. Status: ${result.status}, Recommendation: ${result.recommendation || 'N/A'}`);
        })
        .catch(err => {
          console.error(`[Webhook] Async processing failed:`, err);
        });

      // Keep the execution alive after responding
      try {
        const { waitUntil } = await import('next/server');
        if (typeof waitUntil === 'function') {
          waitUntil(processPromise);
          console.log(`[Webhook] Registered async processing with next/server.waitUntil`);
        } else {
          console.warn('[Webhook] next/server.waitUntil is not a function, falling back to sync await');
          await processPromise;
        }
      } catch (err) {
        console.warn('[Webhook] next/server.waitUntil import failed, falling back to sync await:', err.message);
        await processPromise;
      }

      return NextResponse.json({
        status: 'accepted',
        message: 'Analysis started in background',
        deliveryId,
      }, { status: 202 });
    }

    // Unhandled event
    console.log(`[Webhook] Unhandled event: ${event}`);
    return NextResponse.json({
      status: 'ignored',
      message: `Event '${event}' not processed`,
    });
  } catch (error) {
    console.error('[Webhook] Error:', error);
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
    service: 'Code Review AI Webhook',
    timestamp: new Date().toISOString(),
    events_handled: ['ping', 'pull_request', 'installation'],
  });
}
