import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getAuthPayload } from '@/app/api/auth';

const region = process.env.AWS_REGION || 'us-west-2';
const s3Bucket = process.env.AWS_S3_BUCKET || 'plothole-manuscripts';

const s3Client = new S3Client({
  region: region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authPayload = await getAuthPayload(request);

    console.log(`[API/projects/[id]] DELETE project ${id} for user:`, authPayload?.userId);

    if (!authPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete from S3: projects/{userId}/{projectId}.json
    const key = `projects/${authPayload.userId}/${id}.json`;
    
    const deleteCommand = new DeleteObjectCommand({
      Bucket: s3Bucket,
      Key: key,
    });

    await s3Client.send(deleteCommand);
    console.log(`[API/projects/[id]] Project ${id} deleted from S3 successfully`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/projects/[id]] ERROR deleting project:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to delete project', details: errMsg },
      { status: 500 }
    );
  }
}
