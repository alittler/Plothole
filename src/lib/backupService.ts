import { Resend } from 'resend';

export interface BackupMetadata {
  projectId: string;
  projectTitle: string;
  wordCount: number;
  hash: string;
  timestamp: number;
  backupData: Record<string, any>;
  version: string;
}

export interface BackupResult {
  success: boolean;
  resendId?: string;
  error?: string;
  timestamp: number;
}

/**
 * Initialize Resend client
 */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[BackupService] RESEND_API_KEY not configured');
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Send backup via email
 */
export async function sendBackupEmail(
  metadata: BackupMetadata,
  recipientEmail: string,
  options?: {
    includeAttachment?: boolean;
    notificationType?: 'milestone' | 'manual' | 'scheduled';
  }
): Promise<BackupResult> {
  const resend = getResendClient();
  if (!resend) {
    return {
      success: false,
      error: 'Resend API not configured',
      timestamp: Date.now(),
    };
  }

  try {
    const backupFilename = `${metadata.projectTitle.replace(/\s+/g, '_')}_${new Date(metadata.timestamp).toISOString().split('T')[0]}.json`;
    const notificationType = options?.notificationType || 'milestone';
    const includeAttachment = options?.includeAttachment !== false;

    const subjectPrefix = {
      milestone: '[Milestone]',
      manual: '[Manual]',
      scheduled: '[Scheduled]',
    }[notificationType];

    const email = await resend.emails.send({
      from: 'Plothole Backups <backups@resend.dev>',
      to: recipientEmail,
      subject: `${subjectPrefix} Backup: ${metadata.projectTitle} [${metadata.hash?.slice(0, 8)}] (${metadata.wordCount} words)`,
      html: generateBackupEmailHTML(metadata, notificationType),
      ...(includeAttachment && {
        attachments: [
          {
            filename: backupFilename,
            content: Buffer.from(JSON.stringify(metadata.backupData, null, 2)),
          },
        ],
      }),
    });

    const resendId = (email.data as any)?.id;
    if (!resendId) {
      return {
        success: false,
        error: 'Failed to send email: no response ID',
        timestamp: Date.now(),
      };
    }

    console.log(`[BackupService] Email sent for ${metadata.projectTitle} (${metadata.wordCount} words). Resend ID: ${resendId}`);
    return {
      success: true,
      resendId,
      timestamp: Date.now(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[BackupService] Failed to send backup email:', errorMessage);
    return {
      success: false,
      error: errorMessage,
      timestamp: Date.now(),
    };
  }
}

/**
 * Generate HTML for backup email
 */
function generateBackupEmailHTML(metadata: BackupMetadata, notificationType: 'milestone' | 'manual' | 'scheduled'): string {
  const notificationMessages = {
    milestone: 'A new milestone has been reached for your project',
    manual: 'You manually requested a backup of your project',
    scheduled: 'Scheduled backup completed for your project',
  };

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        {/* Header */}
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Plothole Backup</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">${notificationMessages[notificationType]}</p>
        </div>

        {/* Content */}
        <div style="padding: 32px;">
          <h2 style="margin-top: 0; margin-bottom: 24px; font-size: 20px; font-weight: 600; color: #1f2937;">
            <strong>${escapeHtml(metadata.projectTitle)}</strong>
          </h2>

          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; padding-right: 16px; font-weight: 600; color: #6b7280;">Word Count:</td>
                <td style="padding: 12px 0; color: #1f2937;"><strong>${metadata.wordCount.toLocaleString()}</strong></td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; padding-right: 16px; font-weight: 600; color: #6b7280;">Hash:</td>
                <td style="padding: 12px 0; color: #1f2937; font-family: 'Monaco', 'Courier New', monospace; font-size: 12px;">${escapeHtml(metadata.hash)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; padding-right: 16px; font-weight: 600; color: #6b7280;">Date:</td>
                <td style="padding: 12px 0; color: #1f2937;">${new Date(metadata.timestamp).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
            The project data is attached as a JSON file. You can import this backup back into Plothole if needed.
          </p>

          <a href="https://plothole.ai" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Go to Plothole
          </a>
        </div>

        {/* Footer */}
        <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
          <p style="margin: 0;">This is an automated backup notification from Plothole. Do not reply to this email.</p>
          <p style="margin: 8px 0 0 0;">© 2024 Plothole. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Validate backup metadata
 */
export function validateBackupMetadata(metadata: any): metadata is BackupMetadata {
  return (
    typeof metadata === 'object' &&
    typeof metadata.projectId === 'string' &&
    typeof metadata.projectTitle === 'string' &&
    typeof metadata.wordCount === 'number' &&
    typeof metadata.hash === 'string' &&
    typeof metadata.timestamp === 'number' &&
    typeof metadata.backupData === 'object' &&
    typeof metadata.version === 'string'
  );
}
