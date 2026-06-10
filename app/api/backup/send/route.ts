import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/app/api/auth';
import { getPool } from '@/src/db';
import { sendBackupEmail, validateBackupMetadata } from '@/src/lib/backupService';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, recipientEmail, includeAttachment } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Missing recipientEmail' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const pool = getPool();
    if (!pool) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Fetch the project
    const result = await pool.query(
      'SELECT data FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (!result.rows.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = result.rows[0].data;
    const wordCount = projectData.wordCount || 0;
    const hash = projectData.integrityHash || 'unknown';
    const title = projectData.title || 'Untitled Project';

    // Create backup metadata
    const backupMetadata = {
      projectId,
      projectTitle: title,
      wordCount,
      hash,
      timestamp: Date.now(),
      backupData: projectData,
      version: '1.0',
    };

    // Validate metadata
    if (!validateBackupMetadata(backupMetadata)) {
      return NextResponse.json({ error: 'Invalid backup metadata' }, { status: 400 });
    }

    // Send backup email
    const result_backup = await sendBackupEmail(backupMetadata, recipientEmail, {
      includeAttachment: includeAttachment !== false,
      notificationType: 'manual',
    });

    if (!result_backup.success) {
      return NextResponse.json(
        { error: result_backup.error || 'Failed to send backup' },
        { status: 500 }
      );
    }

    // Store backup record in project
    if (!projectData.backups) {
      projectData.backups = [];
    }

    const backup = {
      id: `backup-${Date.now()}`,
      timestamp: Date.now(),
      wordCount,
      hash,
      status: 'delivered',
      recipientEmail,
      resendId: result_backup.resendId,
      notificationType: 'manual',
    };

    projectData.backups.push(backup);
    projectData.lastBackupTime = Date.now();

    // Update project with new backup record
    await pool.query(
      'UPDATE projects SET data = $1 WHERE id = $2',
      [JSON.stringify(projectData), projectId]
    );

    return NextResponse.json({
      success: true,
      message: 'Backup sent successfully',
      backup,
      resendId: result_backup.resendId,
    });
  } catch (error) {
    console.error('[Backup Manual API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
