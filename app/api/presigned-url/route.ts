import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
    if (!isS3Configured) {
      return NextResponse.json(
        { error: 'S3 is not configured. Set AWS credentials in .env' },
        { status: 400 }
      );
    }

    const { key } = await request.json();
    if (!key) {
      return NextResponse.json({ error: 'S3 key is required' }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: key,
    });

    const expiresIn = parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600', 10);
    const url = await getSignedUrl(s3Client, command, { expiresIn });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[API] Failed to generate presigned URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate presigned URL: ${errorMessage}` },
      { status: 500 }
    );
  }
}
