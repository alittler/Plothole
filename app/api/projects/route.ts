import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
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

console.log(`[API/projects] Initialized S3 client for region: ${region}, bucket: ${s3Bucket}`);

export async function GET(request: NextRequest) {
  try {
    const authPayload = await getAuthPayload(request);
    console.log(`[API/projects] GET userId:`, authPayload?.userId);

    if (!authPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authPayload.userId;
    const prefix = `projects/${userId}/`;

    // List all project files for this user
    const listCommand = new ListObjectsV2Command({
      Bucket: s3Bucket,
      Prefix: prefix,
    });

    const listResult = await s3Client.send(listCommand);
    const projects: any[] = [];

    if (listResult.Contents) {
      for (const item of listResult.Contents) {
        if (item.Key && item.Key.endsWith('.json')) {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: s3Bucket,
              Key: item.Key,
            });

            const getResult = await s3Client.send(getCommand);
            const bodyText = await getResult.Body?.transformToString();
            if (bodyText) {
              const projectData = JSON.parse(bodyText);
              projects.push(projectData);
            }
          } catch (e) {
            console.warn(`[API/projects] Failed to read project file ${item.Key}:`, e);
          }
        }
      }
    }

    console.log(`[API/projects] Found ${projects.length} projects for user: ${userId}`);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('[API/projects] ERROR fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authPayload = await getAuthPayload(request);
    console.log(`[API/projects] POST userId:`, authPayload?.userId, `email:`, authPayload?.email);

    if (!authPayload) {
      console.warn('[API/projects] No auth payload - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await request.json();
    console.log(`[API/projects] Saving project: ${project.id} (${project.title})`);
    console.log(`[API/projects] Project has ${project.catalogs?.length || 0} catalogs`);

    // Validate project data is JSON serializable
    try {
      JSON.stringify(project);
    } catch (parseErr) {
      console.error('[API/projects] Project data not JSON serializable:', parseErr);
      return NextResponse.json(
        { error: 'Invalid project data', details: 'Project data cannot be serialized to JSON' },
        { status: 400 }
      );
    }

    // Save to S3: projects/{userId}/{projectId}.json
    const key = `projects/${authPayload.userId}/${project.id}.json`;
    console.log(`[API/projects] Saving to S3 key: ${key}`);

    const putCommand = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: JSON.stringify(project),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);
    console.log(`[API/projects] Project ${project.id} saved to S3 successfully`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/projects] ERROR saving project:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : '';
    console.error('[API/projects] Error stack:', errStack);
    return NextResponse.json(
      { error: 'Failed to save project', details: errMsg },
      { status: 500 }
    );
  }
}
