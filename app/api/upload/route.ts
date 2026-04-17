import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { getUserId } from '@/app/api/auth';

// S3 Client Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const s3Bucket = process.env.AWS_S3_BUCKET || '';
const isS3Configured = !!(
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.AWS_S3_BUCKET &&
  process.env.AWS_REGION
);

export async function POST(request: NextRequest) {
  try {
    // Optional: check authentication
    // const userId = await getUserId(request);
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      console.error('[Upload] No file in request');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(filename);
    const key = `uploads/image-${uniqueSuffix}${fileExt}`;

    if (isS3Configured) {
      try {
        const putCommand = new PutObjectCommand({
          Bucket: s3Bucket,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        });

        await s3Client.send(putCommand);

        const getCommand = new GetObjectCommand({
          Bucket: s3Bucket,
          Key: key,
        });
        
        const expiresIn = parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600', 10);
        const url = await getSignedUrl(s3Client, getCommand, { expiresIn });
        
        console.log('[Upload] File uploaded to S3. Presigned URL generated:', key);
        return NextResponse.json({ url });
      } catch (s3Err) {
        console.error('[Upload] S3 Upload failed:', s3Err);
        // Fallback to direct URL if signing fails
        const fallbackUrl = `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-west-2'}.amazonaws.com/${key}`;
        return NextResponse.json({ url: fallbackUrl, presigned: false });
      }
    }

    // Fallback to local storage if S3 not configured
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const localFilename = `image-${uniqueSuffix}${fileExt}`;
    const filePath = path.join(uploadDir, localFilename);
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${localFilename}`;
    console.log('[Upload] File uploaded to local storage:', url);
    return NextResponse.json({ url });

  } catch (error) {
    console.error('[Upload] Error in upload endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Upload processing failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
