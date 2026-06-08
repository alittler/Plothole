import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { stringify as stringifyYaml } from 'yaml';
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getAuthPayload } from '@/app/api/auth';

/**
 * Sanitize path component for filesystem safety
 */
function sanitizePath(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

export async function POST(req: NextRequest) {
  try {
    const { category, filename, content, data, author, bookTitle } = await req.json();
    
    // Support both 'content' and 'data' (DataEditor uses 'data')
    const finalContent = content !== undefined ? content : data;

    if (!category || !filename || finalContent === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const authPayload = await getAuthPayload(req);
    const userId = authPayload?.userId;

    // Build local path: /data/[author]/[book-title]/[category]/[filename]
    let dirPath = path.join(process.cwd(), 'data', category);
    let blobPathPrefix = `data/${category}/`;
    
    // If author and bookTitle provided, organize by author/book
    if (author && bookTitle) {
      const sanitizedAuthor = sanitizePath(author);
      const sanitizedBook = sanitizePath(bookTitle);
      dirPath = path.join(process.cwd(), 'data', sanitizedAuthor, sanitizedBook, category);
      blobPathPrefix = `data/${sanitizedAuthor}/${sanitizedBook}/${category}/`;
    }

    // Add userId to blob path if authenticated
    if (userId) {
      blobPathPrefix = `users/${userId}/${blobPathPrefix}`;
    }

    const filePath = path.join(dirPath, filename);
    const blobPath = `${blobPathPrefix}${filename}`;

    let fileContent: string;
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
      fileContent = stringifyYaml(finalContent, { indent: 2 });
    } else {
      fileContent = JSON.stringify(finalContent, null, 2);
    }

    // 1. Always try to write to Vercel Blob if not in development or if we want cloud sync
    let blobUrl = null;
    try {
      const blob = await put(blobPath, fileContent, {
        access: 'public',
        contentType: filename.endsWith('.json') ? 'application/json' : 'text/yaml',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      blobUrl = blob.url;
      console.log(`[API/data/write] Saved to Vercel Blob: ${blobPath} -> ${blobUrl}`);
    } catch (blobError) {
      console.warn('[API/data/write] Vercel Blob write failed (might be local dev):', blobError);
    }

    // 2. Also write to local filesystem (might be read-only on Vercel)
    try {
      await mkdir(dirPath, { recursive: true });
      await writeFile(filePath, fileContent, 'utf-8');
      console.log(`[API/data/write] Saved to local filesystem: ${filePath}`);
    } catch (fsError) {
      console.warn('[API/data/write] Local filesystem write failed (expected on Vercel):', fsError);
    }

    return NextResponse.json({ 
      success: true, 
      path: filePath, 
      blobUrl,
      cloudSynced: !!blobUrl
    });
  } catch (error) {
    console.error('[API/data/write] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
