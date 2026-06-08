import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import YAML from 'js-yaml';
import { put } from '@vercel/blob';
import { getAuthPayload } from '@/app/api/auth';

export const runtime = 'nodejs';

/**
 * POST /api/save-json
 * Universal endpoint for saving any JSON data back to the filesystem or cloud
 * 
 * Request body:
 * {
 *   entityType: string (e.g., 'character', 'location', 'timeline')
 *   entityId: string (e.g., 'char-123')
 *   data: object (the modified JSON data)
 *   format: 'yaml' | 'json' (default: 'yaml')
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { entityType, entityId, data, format = 'yaml' } = await request.json();

    // Validate inputs
    if (!entityType || !entityId || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: entityType, entityId, data' },
        { status: 400 }
      );
    }

    // Security: Prevent path traversal
    if (entityId.includes('..') || entityId.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid entityId: path traversal detected' },
        { status: 400 }
      );
    }

    const authPayload = await getAuthPayload(request);
    const userId = authPayload?.userId;

    const extension = format === 'json' ? 'json' : 'yaml';
    const filename = `${entityId}.${extension}`;
    
    // Construct cloud path
    let blobPath = `entities/${entityType}/${filename}`;
    if (userId) {
      blobPath = `users/${userId}/${blobPath}`;
    }

    // Prepare content
    let content: string;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else {
      content = YAML.dump(data, { indent: 2 });
    }

    // 1. Try Vercel Blob first for cloud persistence
    let blobUrl = null;
    try {
      const blob = await put(blobPath, content, {
        access: 'public',
        contentType: format === 'json' ? 'application/json' : 'text/yaml',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      blobUrl = blob.url;
      console.log(`[API/save-json] Saved to Vercel Blob: ${blobPath} -> ${blobUrl}`);
    } catch (blobError) {
      console.warn('[API/save-json] Vercel Blob write failed (might be local dev):', blobError);
    }

    // 2. Also write to local filesystem (might be read-only on Vercel)
    const collectionPath = path.join(process.cwd(), '.keystatic', entityType);
    let filePath = '';
    try {
      if (!fs.existsSync(collectionPath)) {
        fs.mkdirSync(collectionPath, { recursive: true });
      }
      filePath = path.join(collectionPath, filename);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`[API/save-json] Saved to local filesystem: ${filePath}`);
    } catch (fsError) {
      console.warn('[API/save-json] Local filesystem write failed (expected on Vercel):', fsError);
    }

    return NextResponse.json({
      success: true,
      message: `${entityType}/${entityId} saved successfully`,
      path: filePath,
      blobUrl,
      cloudSynced: !!blobUrl,
      data,
    });
  } catch (error) {
    console.error('[API/save-json] Error:', error);
    return NextResponse.json(
      { error: `Failed to save: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
