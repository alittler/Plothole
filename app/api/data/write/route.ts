import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { stringify as stringifyYaml } from 'yaml';
import { NextRequest, NextResponse } from 'next/server';

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
    const { category, filename, content, author, bookTitle } = await req.json();

    if (!category || !filename || content === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Build path: /data/[author]/[book-title]/[category]/[filename]
    let dirPath = path.join(process.cwd(), 'data', category);
    
    // If author and bookTitle provided, organize by author/book
    if (author && bookTitle) {
      const sanitizedAuthor = sanitizePath(author);
      const sanitizedBook = sanitizePath(bookTitle);
      dirPath = path.join(process.cwd(), 'data', sanitizedAuthor, sanitizedBook, category);
    }

    const filePath = path.join(dirPath, filename);

    // Ensure directory exists
    await mkdir(dirPath, { recursive: true });

    let fileContent: string;

    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
      fileContent = stringifyYaml(content, { indent: 2 });
    } else {
      fileContent = JSON.stringify(content, null, 2);
    }

    await writeFile(filePath, fileContent, 'utf-8');
    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
