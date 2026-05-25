import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { verifyServerSession } from '@/lib/auth-middleware';

export async function POST(request) {
  const session = await verifyServerSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { geminiApiKey, githubOwner, gitlabOwner } = await request.json();
    const usersCollection = await getCollection('users');

    const updateData = { uid: session.uid, updatedAt: new Date() };
    if (geminiApiKey) updateData.geminiApiKey = geminiApiKey;
    if (githubOwner !== undefined) updateData.githubOwner = githubOwner;
    if (gitlabOwner !== undefined) updateData.gitlabOwner = gitlabOwner;

    await usersCollection.updateOne(
      { uid: session.uid },
      { $set: updateData },
      { upsert: true }
    );

    return NextResponse.json({ status: 'ok', message: 'API key saved successfully' });
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
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ uid: session.uid });
    
    return NextResponse.json({ 
      hasApiKey: !!(user && user.geminiApiKey),
      maskedKey: user && user.geminiApiKey ? `...${user.geminiApiKey.slice(-4)}` : null,
      githubOwner: user?.githubOwner || '',
      gitlabOwner: user?.gitlabOwner || '',
    });
  } catch (error) {
    console.error('[User Settings] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
