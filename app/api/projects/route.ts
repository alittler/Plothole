import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { getAuthPayload } from '@/app/api/auth';

export async function GET(request: NextRequest) {
  try {
    const authPayload = await getAuthPayload(request);
    
    if (!authPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authPayload.userId;
    // Prefix for organization: projects/{userId}/
    const prefix = `projects/${userId}/`;

    console.log(`[API/projects] Fetching blobs for user: ${userId} with prefix: ${prefix}`);

    // List all blobs for this user
    const { blobs } = await list({
      prefix: prefix,
    });

    const projects: any[] = [];

    for (const blob of blobs) {
      if (blob.pathname.endsWith('.json')) {
        try {
          const response = await fetch(blob.url);
          if (response.ok) {
            const projectData = await response.json();
            projects.push(projectData);
          }
        } catch (e) {
          console.warn(`[API/projects] Failed to read project blob ${blob.url}:`, e);
        }
      }
    }

    console.log(`[API/projects] Found ${projects.length} projects for user: ${userId}`);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('[API/projects] ERROR fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authPayload = await getAuthPayload(request);

    if (!authPayload) {
      console.warn('[API/projects] No auth payload - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await request.json();
    
    if (!project.id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    console.log(`[API/projects] Saving project: ${project.id} (${project.title}) to Vercel Blob`);

    // Path in Blob Storage: projects/{userId}/{projectId}.json
    const pathname = `projects/${authPayload.userId}/${project.id}.json`;

    const blob = await put(pathname, JSON.stringify(project), {
      access: 'public', // Blobs are publicly accessible via URL, but pathnames are obfuscated/protected by userId
      contentType: 'application/json',
      addRandomSuffix: false, // Maintain stable path for overwriting
    });

    console.log(`[API/projects] Project ${project.id} saved to Vercel Blob: ${blob.url}`);
    
    return NextResponse.json({ 
      success: true, 
      url: blob.url 
    });
  } catch (error) {
    console.error('[API/projects] ERROR saving project:', error);
    return NextResponse.json(
      { error: 'Failed to save project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
