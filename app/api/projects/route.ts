import { NextRequest, NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';
import { getAuthPayload } from '@/app/api/auth';
import fs from 'fs/promises';
import path from 'path';

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

    let projects: any[] = [];
    let loadedFromCloud = false;

    // 1. Try Vercel Blob first for cache
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
              projects = JSON.parse(text);
              loadedFromCloud = true;
              console.log(`[API/projects] Successfully loaded ${projects.length} projects from cloud cache`);
            } catch (parseErr) {
              console.error(`[API/projects] Metadata JSON parse error:`, parseErr);
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[API/projects] Vercel Blob metadata cache fetch failed:`, e);
    }

    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const localDir = path.join(process.cwd(), 'data', 'projects', sanitizedUserId);
    const localMetadataPath = path.join(localDir, 'metadata.json');

    // 2. If cloud load failed, try local metadata cache fallback
    if (!loadedFromCloud) {
      try {
        const text = await fs.readFile(localMetadataPath, 'utf-8');
        if (text && text.trim()) {
          projects = JSON.parse(text);
          console.log(`[API/projects] Successfully loaded ${projects.length} projects from local filesystem cache`);
        }
      } catch (e: any) {
        if (e.code !== 'ENOENT') {
          console.warn(`[API/projects] Failed to read local metadata cache:`, e);
        }
      }
    }

    // 3. If both metadata caches failed/empty, we run full scans
    if (projects.length === 0) {
      try {
        console.log(`[API/projects] Running full cloud scan for user: ${userId}`);
        const { blobs } = await list({ prefix: prefix });
        
        for (const blob of blobs) {
          if (blob.pathname.endsWith('.json') && !blob.pathname.endsWith('metadata.json')) {
            try {
              const response = await fetch(blob.url, { cache: 'no-store' });
              if (response.ok) {
                const projectData = await response.json();
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

        // Seed cloud metadata cache
        if (projects.length > 0) {
          try {
            await put(metadataPath, JSON.stringify(projects), {
              access: 'public',
              contentType: 'application/json',
              addRandomSuffix: false,
              allowOverwrite: true,
            });
          } catch (e) {
            console.error(`[API/projects] Failed to seed cloud metadata cache:`, e);
          }
        }
      } catch (blobError) {
        console.warn(`[API/projects] Vercel Blob full scan failed, trying local filesystem full scan:`, blobError);
      }

      // If we still have 0 projects and cloud failed (or was empty), try local filesystem scan
      if (projects.length === 0) {
        try {
          await fs.mkdir(localDir, { recursive: true });
          const files = await fs.readdir(localDir);
          
          for (const filename of files) {
            if (filename.endsWith('.json') && filename !== 'metadata.json') {
              try {
                const content = await fs.readFile(path.join(localDir, filename), 'utf-8');
                const projectData = JSON.parse(content);
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
              } catch (e) {
                console.warn(`[API/projects] Failed to read local project file ${filename}:`, e);
              }
            }
          }

          // Seed local metadata cache
          if (projects.length > 0) {
            try {
              await fs.writeFile(localMetadataPath, JSON.stringify(projects, null, 2), 'utf-8');
            } catch (e) {
              console.error(`[API/projects] Failed to seed local metadata cache:`, e);
            }
          }
        } catch (fsError) {
          console.warn(`[API/projects] Local filesystem full scan failed:`, fsError);
        }
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

    let savedToCloud = false;

    // 1. Try saving project to Vercel Blob
    const pathname = `projects/${userId}/${project.id}.json`;
    try {
      await put(pathname, JSON.stringify(project), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      savedToCloud = true;
      console.log(`[API/projects] Saved project ${project.id} to Vercel Blob`);
    } catch (blobError) {
      console.warn(`[API/projects] Vercel Blob save failed, falling back to local:`, blobError);
    }

    // 2. Save project to local filesystem
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const localDir = path.join(process.cwd(), 'data', 'projects', sanitizedUserId);
    const localFilePath = path.join(localDir, `${project.id}.json`);
    
    let savedToLocal = false;
    try {
      await fs.mkdir(localDir, { recursive: true });
      await fs.writeFile(localFilePath, JSON.stringify(project, null, 2), 'utf-8');
      savedToLocal = true;
      console.log(`[API/projects] Saved project ${project.id} to local filesystem`);
    } catch (fsError) {
      console.error(`[API/projects] Local filesystem save failed:`, fsError);
    }

    if (!savedToCloud && !savedToLocal) {
      throw new Error("Failed to save project to either cloud or local storage");
    }

    // 3. Update Vercel Blob metadata.json cache
    if (savedToCloud) {
      const metadataPath = `projects/${userId}/metadata.json`;
      let cloudMetadata: any[] = [];
      try {
        const { blobs } = await list({ prefix: metadataPath });
        const metaBlob = blobs.find(b => b.pathname === metadataPath);
        if (metaBlob) {
          const response = await fetch(metaBlob.url, { cache: 'no-store' });
          if (response.ok) {
            const text = await response.text();
            if (text && text.trim()) {
              cloudMetadata = JSON.parse(text);
            }
          }
        }
      } catch (e) {
        console.warn(`[API/projects] Could not load cloud metadata cache:`, e);
      }

      const cloudIdx = cloudMetadata.findIndex(m => m.id === project.id);
      if (cloudIdx >= 0) cloudMetadata[cloudIdx] = projectMeta;
      else cloudMetadata.push(projectMeta);

      try {
        await put(metadataPath, JSON.stringify(cloudMetadata), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false,
          allowOverwrite: true,
        });
        console.log(`[API/projects] Updated Vercel Blob metadata cache`);
      } catch (e) {
        console.error(`[API/projects] Failed to save cloud metadata cache:`, e);
      }
    }

    // 4. Update local metadata.json cache
    const localMetadataPath = path.join(localDir, 'metadata.json');
    let localMetadata: any[] = [];
    try {
      const text = await fs.readFile(localMetadataPath, 'utf-8');
      if (text && text.trim()) {
        localMetadata = JSON.parse(text);
      }
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        console.warn(`[API/projects] Could not load local metadata cache:`, e);
      }
    }

    const localIdx = localMetadata.findIndex(m => m.id === project.id);
    if (localIdx >= 0) localMetadata[localIdx] = projectMeta;
    else localMetadata.push(projectMeta);

    try {
      await fs.writeFile(localMetadataPath, JSON.stringify(localMetadata, null, 2), 'utf-8');
      console.log(`[API/projects] Updated local metadata cache`);
    } catch (e) {
      console.error(`[API/projects] Failed to save local metadata cache:`, e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/projects] FATAL ERROR in POST:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authPayload = await getAuthPayload(request);
    
    if (!authPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authPayload.userId;
    const prefix = `projects/${userId}/`;

    console.log(`[API/projects] Wiping all data for user: ${userId}`);

    let cloudDeletedCount = 0;
    let cloudFailed = false;

    // 1. Try cloud wipe
    try {
      const { blobs } = await list({ prefix: prefix });
      if (blobs.length > 0) {
        const urls = blobs.map(b => b.url);
        await del(urls);
        cloudDeletedCount = blobs.length;
        console.log(`[API/projects] Successfully deleted ${blobs.length} blobs for user ${userId} from cloud`);
      }
    } catch (blobError) {
      cloudFailed = true;
      console.warn(`[API/projects] Vercel Blob wipe failed, trying local:`, blobError);
    }

    // 2. Try local wipe
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const localDir = path.join(process.cwd(), 'data', 'projects', sanitizedUserId);
    
    let localDeletedCount = 0;
    try {
      const files = await fs.readdir(localDir);
      for (const file of files) {
        await fs.unlink(path.join(localDir, file));
        localDeletedCount++;
      }
      await fs.rmdir(localDir);
      console.log(`[API/projects] Successfully wiped local projects dir for user ${userId}`);
    } catch (fsError: any) {
      if (fsError.code !== 'ENOENT') {
        console.error(`[API/projects] Failed to wipe local projects dir:`, fsError);
      }
    }

    return NextResponse.json({ success: true, count: Math.max(cloudDeletedCount, localDeletedCount) });
  } catch (error) {
    console.error('[API/projects] FATAL ERROR in DELETE:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

