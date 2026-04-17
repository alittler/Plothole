import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = process.env.AWS_REGION || 'us-west-2';
const s3Bucket = process.env.AWS_S3_BUCKET || 'plothole-uploads';

// S3 Client Configuration
const s3Client = new S3Client({
  region: region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

console.log(`[Presigned URL API] Initialized S3 client for region: ${region}, bucket: ${s3Bucket}`);

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
    try {
      let url = await getSignedUrl(s3Client, command, { expiresIn });
      
      // Force region-agnostic format (remove .s3.[region]. from the URL)
      if (url.includes('.s3.') && url.includes('.amazonaws.com')) {
        url = url.replace(/\.s3\.[a-z0-9-]+\.amazonaws\.com/, '.s3.amazonaws.com');
      }

      return NextResponse.json({ url });
    } catch (signErr) {
      console.error('[Presigned URL API] Failed to sign URL, falling back to public format:', signErr);
      const publicUrl = `https://${s3Bucket}.s3.amazonaws.com/${key}`;
      return NextResponse.json({ url: publicUrl, presigned: false });
    }
  } catch (error) {
    console.error('[Presigned URL API] Error generating presigned URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Provide a helpful hint for the common "specified endpoint" error
    let hint = '';
    if (errorMessage.includes('must be addressed using the specified endpoint')) {
      hint = ` REGION MISMATCH: Your AWS_REGION ("${region}") does not match the bucket's actual region. Please check your .env file.`;
    }

    return NextResponse.json(
      { error: `Failed to generate presigned URL: ${errorMessage}${hint}` },
      { status: 500 }
    );
  }

}
