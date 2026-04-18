import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getUserId } from '@/app/api/auth';
import { getPool } from '@/src/db';
import crypto from 'crypto';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
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
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256').update(JSON.stringify(projectData)).digest('hex');

    // Create a new backup entry
    const backup = {
      id: `backup-${Date.now()}`,
      timestamp,
      status: 'pending',
      wordCount: projectData.wordCount || 0,
      hash: hash.slice(0, 8)
    };

    // Add to backups array
    if (!projectData.backups) projectData.backups = [];
    projectData.backups.push(backup);

    // Update project with new backup
    await pool.query(
      'UPDATE projects SET data = $1, last_modified = $2 WHERE id = $3',
      [JSON.stringify(projectData), new Date(timestamp), projectId]
    );

    // Send the actual backup email
    if (resend) {
      const toEmail = 'alittler86@gmail.com';
      const backupFilename = `${projectData.title.replace(/\s+/g, '_')}_TEST_${new Date().toISOString().split('T')[0]}.json`;
      resend.emails.send({
        from: 'Plothole Backups <backups@resend.dev>',
        to: toEmail,
        subject: `[Test] Backup: ${projectData.title} [${backup.hash}] (${backup.wordCount} words)`,
        html: `
          <h2>Test Project Backup</h2>
          <p>This is a manually triggered test backup for: <strong>${projectData.title}</strong></p>
          <ul>
            <li><strong>Word Count:</strong> ${backup.wordCount}</li>
            <li><strong>Integrity Hash:</strong> <code>${backup.hash}</code></li>
          </ul>
        `,
        attachments: [
          {
            filename: backupFilename,
            content: Buffer.from(JSON.stringify(projectData, null, 2))
          }
        ]
      }).catch((err: any) => console.error('[Backup API] Test backup email failed:', err));
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test backup created successfully!',
      backup 
    });
  } catch (error) {
    console.error('[Backup API] Test backup error:', error);
    return NextResponse.json(
      { error: 'Failed to create test backup', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
