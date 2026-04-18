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

    const { projectId, userEmail } = await request.json();
    if (!projectId || !userEmail) {
      return NextResponse.json({ error: 'Missing projectId or userEmail' }, { status: 400 });
    }

    if (!resend) {
      return NextResponse.json({ error: 'Resend not configured' }, { status: 503 });
    }

    const email = await resend.emails.send({
      from: 'Plothole Backups <backups@resend.dev>',
      to: userEmail,
      subject: '[Plothole] Test Email - Backup Configuration',
      html: '<p>This is a test email from Plothole to verify your backup notification configuration is working correctly.</p><p>If you receive this email, your backup notifications are properly configured!</p>'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully!',
      resendId: (email.data as any)?.id 
    });
  } catch (error) {
    console.error('[Backup API] Test email error:', error);
    return NextResponse.json(
      { error: 'Failed to send test email', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
