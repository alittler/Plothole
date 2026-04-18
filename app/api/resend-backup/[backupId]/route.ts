import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getUserId } from '@/app/api/auth';
import { getPool } from '@/src/db';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ backupId: string }> }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { backupId } = await params;
    const { projectId } = await request.json();

    if (!projectId || !backupId) {
      return NextResponse.json({ error: 'Missing projectId or backupId' }, { status: 400 });
    }

    const pool = getPool();
    if (!pool) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Fetch the project
    const result = await pool.query('SELECT data FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = result.rows[0].data;
    const backup = projectData.backups?.find((b: any) => b.id === backupId);
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    // Update backup status to pending
    backup.status = 'pending';
    await pool.query(
      'UPDATE projects SET data = $1 WHERE id = $2',
      [JSON.stringify(projectData), projectId]
    );

    // Send the backup email
    if (resend) {
      const toEmail = 'alittler86@gmail.com';
      resend.emails.send({
        from: 'Plothole Backups <backups@resend.dev>',
        to: toEmail,
        subject: `[Resend] Backup: ${projectData.title} [${backup.hash}] (${backup.wordCount} words)`,
        html: `<p>Resending backup for project: <strong>${projectData.title}</strong></p><p>Hash: <code>${backup.hash}</code></p><p>Word count: ${backup.wordCount}</p>`
      }).then(async () => {
        // Mark as delivered after successful send
        const freshResult = await pool.query('SELECT data FROM projects WHERE id = $1', [projectId]);
        if (freshResult.rows.length) {
          const freshData = freshResult.rows[0].data;
          const b = freshData.backups?.find((b: any) => b.id === backupId);
          if (b) {
            b.status = 'delivered';
            await pool.query('UPDATE projects SET data = $1 WHERE id = $2', [JSON.stringify(freshData), projectId]);
          }
        }
      }).catch((err: any) => console.error('[Backup API] Resend email failed:', err));
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Backup resend initiated!'
    });
  } catch (error) {
    console.error('[Backup API] Resend backup error:', error);
    return NextResponse.json(
      { error: 'Failed to resend backup', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
