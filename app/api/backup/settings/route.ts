import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/app/api/auth';
import { getPool } from '@/src/db';

export const runtime = 'nodejs';

/**
 * GET: Retrieve backup settings for a project
 * POST: Update backup settings for a project
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const pool = getPool();
    if (!pool) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const result = await pool.query(
      'SELECT data FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (!result.rows.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = result.rows[0].data;
    const backupSettings = projectData.backupSettings || {};
    const backups = projectData.backups || [];

    return NextResponse.json({
      backupSettings,
      backupHistory: backups.slice(-10).reverse(), // Last 10 backups
      totalBackups: backups.length,
    });
  } catch (error) {
    console.error('[Backup Settings API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, recipientEmail, frequency, enabled, autoIncludeAttachment } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // Validate email if provided
    if (recipientEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    const pool = getPool();
    if (!pool) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const result = await pool.query(
      'SELECT data FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (!result.rows.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = result.rows[0].data;

    // Update backup settings
    projectData.backupSettings = {
      ...(projectData.backupSettings || {}),
      ...(recipientEmail && { recipientEmail }),
      ...(frequency && { frequency }),
      ...(typeof enabled === 'boolean' && { enabled }),
      ...(typeof autoIncludeAttachment === 'boolean' && { autoIncludeAttachment }),
      updatedAt: Date.now(),
    };

    // Update project
    await pool.query(
      'UPDATE projects SET data = $1 WHERE id = $2',
      [JSON.stringify(projectData), projectId]
    );

    return NextResponse.json({
      success: true,
      backupSettings: projectData.backupSettings,
    });
  } catch (error) {
    console.error('[Backup Settings API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
