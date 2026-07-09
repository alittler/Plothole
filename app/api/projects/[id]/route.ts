import { NextRequest, NextResponse } from 'next/server';
import { del, list, put } from '@vercel/blob';
import { getAuthPayload } from '@/app/api/auth';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authPayload = await getAuthPayload(request);

    if (!authPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authPayload.userId;
    const pathname = `projects/${userId}/${id}.json`;

    console.log(`[API/projects/[id]] Fetching project blob: ${pathname}`);

    // Try Vercel Blob first
    try {
      const { blobs } = await list({ prefix: pathname });
      const blob = blobs.find(b => b.pathname === pathname);

      if (blob) {
        const response = await fetch(blob.url);
        if (response.ok) {
          const projectData = await response.json();
          return NextResponse.json(projectData);
        }
      }
    } catch (blobError) {
      console.warn(`[API/projects/[id]] Vercel Blob GET failed, trying local fallback:`, blobError);
    }

    // Local filesystem fallback
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const localFilePath = path.join(process.cwd(), 'data', 'projects', sanitizedUserId, `${id}.json`);
    
    try {
      const content = await fs.readFile(localFilePath, 'utf-8');
      const projectData = JSON.parse(content);
      return NextResponse.json(projectData);
    } catch (fsError) {
      console.error(`[API/projects/[id]] Local filesystem GET failed:`, fsError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('[API/projects/[id]] ERROR fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authPayload = await getAuthPayload(request);

    if (!authPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authPayload.userId;
    // Path in Blob Storage: projects/{userId}/{id}.json
    const pathname = `projects/${userId}/${id}.json`;

    console.log(`[API/projects/[id]] Deleting project blob: ${pathname}`);

    let deletedFromCloud = false;

    // Vercel Blob del() works by URL or pathname
    // We attempt to delete the project file from cloud
    try {
      await del(pathname);
      deletedFromCloud = true;
      console.log(`[API/projects/[id]] Project ${id} deleted from Vercel Blob successfully`);
    } catch (blobError) {
      console.warn(`[API/projects/[id]] Vercel Blob delete failed, falling back to local deletion:`, blobError);
    }

    // Local filesystem deletion fallback
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const localDir = path.join(process.cwd(), 'data', 'projects', sanitizedUserId);
    const localFilePath = path.join(localDir, `${id}.json`);
    
    try {
      await fs.unlink(localFilePath);
      console.log(`[API/projects/[id]] Project ${id} deleted from local filesystem`);
    } catch (fsError: any) {
      if (fsError.code !== 'ENOENT') {
        console.error(`[API/projects/[id]] Local filesystem delete error:`, fsError);
      }
    }

    // Update Vercel Blob metadata.json cache
    if (deletedFromCloud) {
      try {
        const metadataPath = `projects/${userId}/metadata.json`;
        const { blobs } = await list({ prefix: metadataPath });
        const metaBlob = blobs.find(b => b.pathname === metadataPath);
        
        if (metaBlob) {
          const response = await fetch(metaBlob.url, { cache: 'no-store' });
          if (response.ok) {
            const text = await response.text();
            if (text && text.trim()) {
              let metadata = JSON.parse(text);
              const filteredMetadata = metadata.filter((m: any) => m.id !== id);
              
              if (filteredMetadata.length !== metadata.length) {
                await put(metadataPath, JSON.stringify(filteredMetadata), {
                  access: 'public',
                  contentType: 'application/json',
                  addRandomSuffix: false,
                  allowOverwrite: true,
                });
                console.log(`[API/projects/[id]] Metadata cache updated for user ${userId} after deleting ${id}`);
              }
            }
          }
        }
      } catch (metaErr) {
        console.warn(`[API/projects/[id]] Failed to update metadata cache:`, metaErr);
      }
    }

    // Update local metadata.json cache
    const localMetadataPath = path.join(localDir, 'metadata.json');
    try {
      const text = await fs.readFile(localMetadataPath, 'utf-8');
      if (text && text.trim()) {
        let metadata = JSON.parse(text);
        const filteredMetadata = metadata.filter((m: any) => m.id !== id);
        
        if (filteredMetadata.length !== metadata.length) {
          await fs.writeFile(localMetadataPath, JSON.stringify(filteredMetadata, null, 2), 'utf-8');
          console.log(`[API/projects/[id]] Local metadata cache updated for user ${userId} after deleting ${id}`);
        }
      }
    } catch (localMetaErr: any) {
      if (localMetaErr.code !== 'ENOENT') {
        console.warn(`[API/projects/[id]] Failed to update local metadata cache:`, localMetaErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/projects/[id]] ERROR deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
