import { readFile } from 'fs/promises';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { getAuthPayload } from '@/app/api/auth';

export async function POST(req: NextRequest) {
  try {
    const { category, filename, author, bookTitle } = await req.json();

    if (!category || !filename) {
      return NextResponse.json({ error: 'Missing category or filename' }, { status: 400 });
    }

    const authPayload = await getAuthPayload(req);
    const userId = authPayload?.userId;

    // 1. Try Vercel Blob first
    let cloudData = null;
    try {
      // Possible blob paths to check
      const pathsToCheck = [];
      
      // If author/bookTitle provided, check that specific path
      if (author && bookTitle) {
        const sanitizedAuthor = author.toLowerCase().replace(/\s+/g, '-');
        const sanitizedBook = bookTitle.toLowerCase().replace(/\s+/g, '-');
        if (userId) pathsToCheck.push(`users/${userId}/data/${sanitizedAuthor}/${sanitizedBook}/${category}/${filename}`);
        pathsToCheck.push(`data/${sanitizedAuthor}/${sanitizedBook}/${category}/${filename}`);
      }

      // Also check standard paths
      if (userId) pathsToCheck.push(`users/${userId}/data/${category}/${filename}`);
      pathsToCheck.push(`data/${category}/${filename}`);

      for (const blobPath of pathsToCheck) {
        const { blobs } = await list({ prefix: blobPath });
        const blob = blobs.find(b => b.pathname === blobPath);
        if (blob) {
          const response = await fetch(blob.url, { cache: 'no-store' });
          if (response.ok) {
            const text = await response.text();
            if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
              cloudData = parseYaml(text);
            } else {
              cloudData = JSON.parse(text);
            }
            console.log(`[API/data/read] Loaded from Vercel Blob: ${blobPath}`);
            break;
          }
        }
      }
    } catch (blobError) {
      console.warn('[API/data/read] Vercel Blob read failed:', blobError);
    }

    if (cloudData) {
      return NextResponse.json({ data: cloudData, filename, origin: 'cloud' });
    }

    // 2. Fallback to local filesystem
    try {
      let filePath = path.join(process.cwd(), 'data', category, filename);
      
      // Try organized path if author/bookTitle provided
      if (author && bookTitle) {
        const sanitizedAuthor = author.toLowerCase().replace(/\s+/g, '-');
        const sanitizedBook = bookTitle.toLowerCase().replace(/\s+/g, '-');
        const organizedPath = path.join(process.cwd(), 'data', sanitizedAuthor, sanitizedBook, category, filename);
        // Check if organized path exists (simulated by try-catch)
        try {
          const content = await readFile(organizedPath, 'utf-8');
          let data: any;
          if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
            data = parseYaml(content);
          } else {
            data = JSON.parse(content);
          }
          return NextResponse.json({ data, filename, origin: 'local-organized' });
        } catch (e) {
          // Ignore and try default path
        }
      }

      const content = await readFile(filePath, 'utf-8');
      let data: any;
      if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        data = parseYaml(content);
      } else {
        data = JSON.parse(content);
      }
      return NextResponse.json({ data, filename, origin: 'local' });
    } catch (fsError) {
      return NextResponse.json({ error: 'File not found locally or in cloud' }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
