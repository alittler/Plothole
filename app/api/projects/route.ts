import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { getAuthPayload } from '@/app/api/auth';

export async function GET(request: NextRequest) {
  try {
    const authPayload = await getAuthPayload(request);
    
    if (!authPayload) {
      console.warn('[API/projects] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authPayload.userId;
    const prefix = `projects/${userId}/`;
    const metadataPath = `${prefix}metadata.json`;

    // Try to get metadata.json first for speed
    try {
      const { blobs } = await list({ prefix: metadataPath });
      const metaBlob = blobs.find(b => b.pathname === metadataPath);
      
      if (metaBlob) {
        console.log(`[API/projects] Found metadata cache for ${userId}: ${metaBlob.url}`);
        const response = await fetch(metaBlob.url, { cache: 'no-store' });
        if (response.ok) {
          const text = await response.text();
          if (text && text.trim()) {
            try {
              const cachedMetadata = JSON.parse(text);
              console.log(`[API/projects] Successfully loaded ${cachedMetadata.length} projects from cache`);
              return NextResponse.json(cachedMetadata);
            } catch (parseErr) {
              console.error(`[API/projects] Metadata JSON parse error:`, parseErr);
            }
          }
        } else {
          console.warn(`[API/projects] Metadata cache fetch returned status: ${response.status}`);
        }
      }
    } catch (e) {
      console.warn(`[API/projects] Metadata cache fetch failed, falling back to full scan:`, e);
    }

    console.log(`[API/projects] Running full scan for user: ${userId}`);

    // Fallback: Full Scan (Slow)
    const { blobs } = await list({ prefix: prefix });
    const projects: any[] = [];

    for (const blob of blobs) {
      // Skip the metadata file itself and only process JSON files
      if (blob.pathname.endsWith('.json') && !blob.pathname.endsWith('metadata.json')) {
        try {
          const response = await fetch(blob.url, { cache: 'no-store' });
          if (response.ok) {
            const projectData = await response.json();
            // Map to minimal metadata to keep it fast
            projects.push({
              id: projectData.id,
              title: projectData.title,
              author: projectData.author || '',
              shortName: projectData.shortName || '',
              summary: projectData.summary || '',
              lastModified: projectData.lastModified || Date.now(),
              characterCount: projectData.entities?.filter((e: any) => e.type === 'Character').length || projectData.characters?.length || 0,
              locationCount: projectData.entities?.filter((e: any) => e.type === 'Location').length || projectData.locations?.length || 0,
              commitCount: projectData.commits?.length || 0,
              backupCount: projectData.backups?.length || 0,
              wordCount: projectData.wordCount || 0,
              origin: 'cloud'
            });
          }
        } catch (e) {
          console.warn(`[API/projects] Failed to read project blob ${blob.url}:`, e);
        }
      }
    }

    console.log(`[API/projects] Full scan complete. Found ${projects.length} projects.`);

    // Attempt to seed the cache for next time
    if (projects.length > 0) {
      try {
        console.log(`[API/projects] Seeding metadata cache for ${userId}...`);
        await put(metadataPath, JSON.stringify(projects), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false,
          allowOverwrite: true,
        });
        console.log(`[API/projects] Metadata cache seeded successfully.`);
      } catch (e) {
        console.error(`[API/projects] Failed to seed metadata cache:`, e);
      }
    }

    return NextResponse.json(projects);
  } catch (error) {
    console.error('[API/projects] FATAL ERROR in GET:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authPayload = await getAuthPayload(request);

    if (!authPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await request.json();
    const userId = authPayload.userId;
    
    if (!project.id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    console.log(`[API/projects] Saving project ${project.id} for user ${userId}`);

    // 1. Save the full project
    const pathname = `projects/${userId}/${project.id}.json`;
    await put(pathname, JSON.stringify(project), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // 2. Update metadata.json cache
    const metadataPath = `projects/${userId}/metadata.json`;
    let metadata: any[] = [];
    
    try {
      const { blobs } = await list({ prefix: metadataPath });
      const metaBlob = blobs.find(b => b.pathname === metadataPath);
      if (metaBlob) {
        const response = await fetch(metaBlob.url, { cache: 'no-store' });
        if (response.ok) {
          const text = await response.text();
          if (text && text.trim()) {
            metadata = JSON.parse(text);
          }
        }
      }
    } catch (e) {
      console.warn(`[API/projects] Could not load existing metadata during update:`, e);
    }

    // Update or add this project to metadata
    const projectMeta = {
      id: project.id,
      title: project.title,
      author: project.author || '',
      shortName: project.shortName || '',
      summary: project.summary || '',
      lastModified: Date.now(),
      characterCount: project.entities?.filter((e: any) => e.type === 'Character').length || project.characters?.length || 0,
      locationCount: project.entities?.filter((e: any) => e.type === 'Location').length || project.locations?.length || 0,
      commitCount: project.commits?.length || 0,
      backupCount: project.backups?.length || 0,
      wordCount: project.wordCount || 0,
      origin: 'cloud'
    };

    const index = metadata.findIndex(m => m.id === project.id);
    if (index >= 0) metadata[index] = projectMeta;
    else metadata.push(projectMeta);

    await put(metadataPath, JSON.stringify(metadata), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    
    console.log(`[API/projects] Successfully saved project and updated metadata for ${project.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/projects] FATAL ERROR in POST:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
