import { NextResponse } from 'next/server';
import { generatePRDescription } from '@/lib/gemini';
import { createOctokitWithPAT, getPRDiff } from '@/lib/github';
import { getMRDiff } from '@/lib/gitlab';
import { checkRateLimit, getClientIP, rateLimitHeaders } from '@/lib/rate-limiter';

/**
 * Feature A: AI-Generated PR Description & Changelog
 * POST /api/generate-description
 * Body: { prUrl: string } OR { diff: string, files: string[] }
 */
export async function POST(request) {
  const ip = getClientIP(request);
  const limit = await checkRateLimit(ip, 10);
  const headers = rateLimitHeaders(limit);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in 1 minute.' },
      { status: 429, headers }
    );
  }

  try {
    const body = await request.json();
    const { prUrl, diff: rawDiff, files: rawFiles } = body;

    let diff, files;

    if (rawDiff) {
      // Direct diff mode (for Sandbox code editor)
      diff = rawDiff;
      files = rawFiles || [];
    } else if (prUrl) {
      // Fetch from GitHub or GitLab URL
      if (prUrl.includes('github.com')) {
        const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
        if (!match) {
          return NextResponse.json({ error: 'Invalid GitHub PR URL' }, { status: 400, headers });
        }
        const [, owner, repo, pullNumberStr] = match;
        const octokit = createOctokitWithPAT();
        ({ diff, files } = await getPRDiff(octokit, owner, repo, parseInt(pullNumberStr, 10)));
      } else if (prUrl.includes('gitlab.com')) {
        const match = prUrl.match(/gitlab\.com\/([^/]+(?:\/[^/]+)*)\/\-\/merge_requests\/(\d+)/);
        if (!match) {
          return NextResponse.json({ error: 'Invalid GitLab MR URL' }, { status: 400, headers });
        }
        const [, projectPath, mrIidStr] = match;
        ({ diff, files } = await getMRDiff(projectPath, parseInt(mrIidStr, 10)));
      } else {
        return NextResponse.json(
          { error: 'Unsupported URL. Only GitHub PR and GitLab MR URLs are supported.' },
          { status: 400, headers }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Provide either "prUrl" or "diff" + "files" in the request body.' },
        { status: 400, headers }
      );
    }

    if (!diff || diff.trim().length === 0) {
      return NextResponse.json(
        { error: 'No code changes found in this PR/MR.' },
        { status: 400, headers }
      );
    }

    const result = await generatePRDescription(diff, files);

    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error('[Generate Description] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers });
  }
}
