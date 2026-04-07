# Presigned URL Implementation Guide

## Overview
Your Plothole application now uses **Presigned URLs** for secure S3 object access. This means your S3 bucket can remain 100% private (with "Block All Public Access" enabled), and the application still displays images and files securely.

## How It Works

1. **User uploads a file** → Server stores it in private S3 bucket
2. **Server generates presigned URL** → A temporary, signed URL valid for 1 hour
3. **Frontend receives URL** → Displays the image using the presigned URL
4. **URL expires after 1 hour** → Link becomes invalid, preventing unauthorized access

## Configuration

Add to your `.env` file:

```env
# AWS Configuration (required)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="your-bucket-name"

# Presigned URL expiry time in seconds (optional, defaults to 3600 = 1 hour)
PRESIGNED_URL_EXPIRY="3600"
```

## Endpoints

### 1. File Upload (existing)
**POST** `/api/upload`
- Uploads images to S3
- Returns: `{ url: "presigned-url-or-local-path" }`

### 2. Source File Upload (existing)
**POST** `/api/source-upload`
- Uploads source files (documents, PDFs) to S3
- Returns: `{ url: "presigned-url", filename: "...", extractedText: "..." }`

### 3. Source Metadata (existing)
**POST** `/api/source-meta`
- Saves metadata and markdown files to S3
- Returns: `{ url: "presigned-url", mdUrl: "presigned-url" }`

### 4. Generate Presigned URL (NEW)
**POST** `/api/presigned-url`
- Generates a new presigned URL for any S3 object
- Request: `{ key: "s3-object-key" }`
- Response: `{ url: "presigned-url" }`

## Frontend Utilities

New file: `src/utils/s3Utils.ts`

```typescript
import { getPresignedUrl, ensurePresignedUrl } from '@/utils/s3Utils';

// Fetch a presigned URL for a specific S3 object
const url = await getPresignedUrl('source/project-123/document.pdf');

// Use the URL in an img tag or link
<img src={url} alt="Document" />
```

## S3 Bucket Security Setup

For maximum security, configure your S3 bucket:

1. **Block All Public Access** ✓ (enabled)
   - All public access settings should be ON
   - This is now safe because presigned URLs work independently

2. **Bucket Policy** (optional, can remain empty or restricted)
   - Presigned URLs bypass bucket policies
   - Your AWS credentials are the only requirement

3. **CORS** (if accessing from browser)
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET"],
       "AllowedOrigins": ["https://your-app-domain.com"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

## Security Features

✓ **Private Bucket**: Objects are never publicly accessible
✓ **Temporary URLs**: Links expire after configured time (default 1 hour)
✓ **Signed by Server**: Only your server can generate valid URLs
✓ **No Credentials Exposed**: AWS keys never leave the server
✓ **Configurable Expiry**: Adjust `PRESIGNED_URL_EXPIRY` as needed

## URL Expiry Times (Examples)

```env
# Short-lived (very secure)
PRESIGNED_URL_EXPIRY="300"      # 5 minutes

# Default (balanced)
PRESIGNED_URL_EXPIRY="3600"     # 1 hour

# Long-lived (convenient)
PRESIGNED_URL_EXPIRY="86400"    # 24 hours
```

## Troubleshooting

### "Failed to generate presigned URL"
- Verify AWS credentials in `.env`
- Ensure IAM user has `s3:GetObject` permission
- Check that bucket name is correct

### Images not loading
- Verify presigned URL was generated successfully
- Check if URL has expired (look for `X-Amz-Expires` in URL)
- Ensure browser CORS settings allow S3 access

### Local vs S3
- If S3 is not configured, app falls back to local `/uploads/` and `/source-files/` paths
- Both work transparently with the same code

## Implementation Details

All upload endpoints automatically:
1. Upload file to S3
2. Generate presigned URL
3. Return URL to frontend
4. Frontend displays image using presigned URL

No additional frontend code needed—just use the returned URLs as normal!

## Performance Notes

- Presigned URL generation is fast (~10ms)
- URLs are valid even if S3 object permissions change
- Consider caching URLs during their validity period
- If URL expires while in use, request a new one

## Migration from Public Bucket

If you had a public S3 bucket before:
1. Enable "Block All Public Access"
2. Deploy updated code
3. Everything continues working with presigned URLs
4. Old public URLs stop working (secure!)
