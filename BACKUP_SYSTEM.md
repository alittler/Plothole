# Backup System with Resend Email Integration

## Overview

This document describes the new comprehensive backup system integrated with Resend for email-based backup delivery and recovery.

## Features

### 1. **Send Backup Now**
- Manually send project backups via email on demand
- Choose any email address as the recipient
- Optional attachment inclusion of full project data
- Real-time success/error feedback

### 2. **Dynamic Backup Recipient Email**
- Set and save a default backup recipient email
- Configurable per project
- Persistent across sessions
- Email validation on input

### 3. **Backup History & Recovery**
- View the last 10 backups for each project
- Track backup status (delivered, pending, failed)
- See timestamp, word count, and notification type
- One-click resend for failed backups

### 4. **Automatic Scheduling** (existing)
- Configure backup frequency: manual, hourly, daily, weekly, monthly
- Enable/disable automatic backups
- View next scheduled backup time

### 5. **Backup Settings Management**
- Persistent backup recipient configuration
- Auto-attachment toggle for scheduled backups
- Settings saved per project

## API Endpoints

### Send Backup (Manual)
```
POST /api/backup/send
Content-Type: application/json

{
  "projectId": "project-123",
  "recipientEmail": "user@example.com",
  "includeAttachment": true
}

Response:
{
  "success": true,
  "message": "Backup sent successfully",
  "backup": {
    "id": "backup-1718000000000",
    "timestamp": 1718000000000,
    "wordCount": 5000,
    "hash": "abc123...",
    "status": "delivered",
    "recipientEmail": "user@example.com",
    "resendId": "re_xxx",
    "notificationType": "manual"
  },
  "resendId": "re_xxx"
}
```

### Get/Update Backup Settings
```
GET /api/backup/settings?projectId=project-123

Response:
{
  "backupSettings": {
    "recipientEmail": "user@example.com",
    "frequency": "daily",
    "enabled": true,
    "autoIncludeAttachment": true,
    "updatedAt": 1718000000000
  },
  "backupHistory": [ ... ], // Last 10 backups
  "totalBackups": 42
}

POST /api/backup/settings
Content-Type: application/json

{
  "projectId": "project-123",
  "recipientEmail": "user@example.com",
  "frequency": "daily",
  "enabled": true,
  "autoIncludeAttachment": true
}

Response:
{
  "success": true,
  "backupSettings": { ... }
}
```

## UI Components

### BackupControl Component
Located: `src/components/BackupControl.tsx`

A reusable, self-contained component for managing backups in the settings view.

**Props:**
- `projectId` (string): Project identifier
- `projectTitle` (string): Display name for the project
- `backupHistory` (BackupRecord[]): Array of recent backups
- `backupSettings` (object): Current backup configuration
- `onSendBackup` (function): Callback after sending backup
- `onSettingsChange` (function): Callback after settings updated
- `isLoading` (boolean): Loading state
- `fetchWithAuth` (function): Authenticated fetch function

**Features:**
- Send backup form with email input
- Include/exclude attachment toggle
- Settings modal for default configuration
- Backup history display with status indicators
- Collapsible history section
- Error handling and user feedback

## Services

### BackupService
Located: `src/lib/backupService.ts`

Utility functions for backup operations:

- `getResendClient()`: Initialize Resend API client
- `sendBackupEmail()`: Send backup via email with metadata
- `generateBackupEmailHTML()`: Create formatted email content
- `validateBackupMetadata()`: Type-safe metadata validation

**Backup Notification Types:**
- `milestone`: Automatic backup on milestones (existing)
- `manual`: User-initiated backup
- `scheduled`: Automatic scheduled backup

## Environment Configuration

Required environment variables in `.env.local`:

```
# Resend API Configuration
RESEND_API_KEY="re_xxxxxxxxxxxxx"
```

## Data Model

### BackupStatus (ProjectData.backups[])
```typescript
interface BackupStatus {
  id: string;                    // Unique backup identifier
  timestamp: number;             // Unix timestamp
  status: 'pending' | 'delivered' | 'failed';
  wordCount?: number;            // Project word count at backup
  hash?: string;                 // Integrity hash
  resendId?: string;             // Resend API response ID
  recipientEmail?: string;       // Email recipient (new)
  notificationType?: string;     // Type of notification (new)
}
```

### BackupSettings (ProjectData.backupSettings)
```typescript
interface BackupSettings {
  enabled: boolean;              // Auto backups enabled
  frequency: BackupFrequency;    // Frequency setting
  recipientEmail?: string;       // Default recipient (new)
  autoIncludeAttachment?: boolean; // Include data by default (new)
  lastBackupTime?: number;       // Last backup timestamp
  nextBackupTime?: number;       // Next scheduled backup
  updatedAt?: number;            // Settings last updated (new)
}

type BackupFrequency = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly';
```

## Email Templates

### Backup Notification Email

**Subject:** `[Manual] Backup: Project Title [hash] (5000 words)`

**Body:** Includes:
- Project title and metadata
- Word count and integrity hash
- Backup timestamp
- Link to Plothole
- Attached JSON file (if requested)

Notification type prefixes:
- `[Manual]` - User-initiated
- `[Scheduled]` - Automatic scheduled
- `[Milestone]` - Milestone-based

## Integration in Settings

The backup system is integrated into the **Settings > Storage Archive** tab:

1. **Backup Management Section** (top)
   - Send Backup Now form
   - Settings button
   - Recent backups history

2. **Email Settings** (below)
   - Test email functionality
   - Email configuration verification

3. **Storage Archive** (bottom)
   - File listing and preview

## Usage Flow

### Sending a Manual Backup
1. Navigate to Settings → Storage Archive
2. Scroll to "Backup Management"
3. Enter recipient email
4. (Optional) Toggle "Include Project Data Attachment"
5. Click "Send Backup"
6. Receive confirmation message

### Setting Default Backup Email
1. Click the ⚙️ (Settings) button
2. Enter default recipient email
3. Toggle "Always Include Attachment by Default" if desired
4. Click "Save Settings"
5. Settings are now persistent for this project

### Viewing Backup History
1. Click "Show (N)" in recent backups section
2. View up to 10 most recent backups
3. See status, timestamp, and recipient for each
4. Click "Hide" to collapse

## Error Handling

- **Missing RESEND_API_KEY**: Returns 503 with "Resend API not configured"
- **Invalid email format**: Returns 400 with validation error
- **Project not found**: Returns 404
- **Email send failure**: Returns 500 with error details
- **Database unavailable**: Returns 503

## Security Considerations

1. **Authentication**: All endpoints require valid user ID from JWT
2. **Authorization**: Users can only backup their own projects
3. **Email Validation**: Regex validation of email addresses
4. **Data Encryption**: Backup data sent over HTTPS
5. **API Key Protection**: RESEND_API_KEY stored as environment variable

## Testing

### Send Test Email
1. Settings → Storage Archive → Email Settings
2. Click "Send Test Email"
3. Check inbox for test message

### Create Test Backup
1. Settings → Storage Archive → Backup Management
2. Enter your email
3. Click "Send Backup"
4. Verify email received

## Future Enhancements

- [ ] Multiple recipient emails
- [ ] Scheduled email delivery
- [ ] Backup encryption
- [ ] Cloud storage integration (AWS S3, Google Drive)
- [ ] Backup restore from email link
- [ ] Backup retention policies
- [ ] Backup size limits
- [ ] Bandwidth throttling
- [ ] Backup compression
