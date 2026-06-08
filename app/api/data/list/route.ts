import { readdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { getAuthPayload } from '@/app/api/auth';

export async function POST(req: NextRequest) {
  try {
    const { category, author, bookTitle } = await req.json();

    if (!category) {
      return NextResponse.json({ error: 'Missing category' }, { status: 400 });
    }

    const authPayload = await getAuthPayload(req);
    const userId = authPayload?.userId;

    const fileSet = new Set<string>();

    // 1. List from Vercel Blob
    try {
      const prefixes = [];
      
      // Organized paths
      if (author && bookTitle) {
        const sanitizedAuthor = author.toLowerCase().replace(/\s+/g, '-');
        const sanitizedBook = bookTitle.toLowerCase().replace(/\s+/g, '-');
        if (userId) prefixes.push(`users/${userId}/data/${sanitizedAuthor}/${sanitizedBook}/${category}/`);
        prefixes.push(`data/${sanitizedAuthor}/${sanitizedBook}/${category}/`);
      }

      // Standard paths
      if (userId) prefixes.push(`users/${userId}/data/${category}/`);
      prefixes.push(`data/${category}/`);

      for (const prefix of prefixes) {
        const { blobs } = await list({ prefix });
        for (const blob of blobs) {
          // Extract filename from pathname
          const filename = blob.pathname.split('/').pop();
          if (filename && (filename.endsWith('.json') || filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
            fileSet.add(filename);
          }
        }
      }
    } catch (blobError) {
      console.warn('[API/data/list] Vercel Blob list failed:', blobError);
    }

    // 2. List from local filesystem
    try {
      const dirPaths = [path.join(process.cwd(), 'data', category)];
      
      if (author && bookTitle) {
        const sanitizedAuthor = author.toLowerCase().replace(/\s+/g, '-');
        const sanitizedBook = bookTitle.toLowerCase().replace(/\s+/g, '-');
        dirPaths.push(path.join(process.cwd(), 'data', sanitizedAuthor, sanitizedBook, category));
      }

      for (const dirPath of dirPaths) {
        try {
          const files = await readdir(dirPath);
          for (const f of files) {
            if (f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml')) {
              fileSet.add(f);
            }
          }
        } catch (e) {
          // Ignore non-existent directories
        }
      }
    } catch (fsError) {
      console.warn('[API/data/list] Local filesystem list failed:', fsError);
    }

    return NextResponse.json({ files: Array.from(fileSet) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
