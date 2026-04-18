import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getUserId } from '@/app/api/auth';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!resend) {
      return NextResponse.json({ error: 'Resend not configured' }, { status: 503 });
    }

    const { projectTitle, wordCount, hash, backupData } = await request.json();

    const backupFilename = `${projectTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    
    // Ideally we'd get the user's email from the JWT payload
    // For now we'll use the primary account holder's email as the backup destination
    const toEmail = 'alittler86@gmail.com'; 
    
    const email = await resend.emails.send({
      from: 'Plothole Backups <backups@resend.dev>',
      to: toEmail,
      subject: `[Milestone] Backup: ${projectTitle} [${hash?.slice(0, 8)}] (${wordCount} words)`,
      html: `
        <h2>Automated Project Backup</h2>
        <p>A new milestone has been reached for project: <strong>${projectTitle}</strong></p>
        <ul>
          <li><strong>Word Count:</strong> ${wordCount}</li>
          <li><strong>Integrity Hash:</strong> <code>${hash}</code></li>
          <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>The project data is attached as a JSON file. You can import this file back into Plothole if needed.</p>
      `,
      attachments: [
        {
          filename: backupFilename,
          content: Buffer.from(JSON.stringify(backupData, null, 2))
        }
      ]
    });

    console.log(`[Backup] Email sent for ${projectTitle} (${wordCount} words). Resend ID: ${(email.data as any)?.id}`);
    return NextResponse.json({ success: true, resendId: (email.data as any)?.id });
  } catch (error) {
    console.error('[Backup API] Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send backup email' },
      { status: 500 }
    );
  }
}
