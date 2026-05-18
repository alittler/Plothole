import { readFile } from 'fs/promises';
import path from 'path';
import YAML from 'js-yaml';
import { NextRequest, NextResponse } from 'next/server';

const DATA_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), 'data');
const ALLOWED_FILE_EXTENSIONS = new Set(['.json', '.yaml', '.yml']);

function resolveDataFilePath(category: string, filename: string): string | null {
  const normalizedCategory = category.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const normalizedFilename = filename.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

  if (!normalizedCategory || !normalizedFilename) {
    return null;
  }

  if (normalizedCategory.includes('..') || normalizedFilename.includes('/')) {
    return null;
  }

  const extension = path.extname(normalizedFilename).toLowerCase();
  if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
    return null;
  }

  const fullPath = path.resolve(DATA_ROOT, normalizedCategory, normalizedFilename);
  if (!fullPath.startsWith(`${DATA_ROOT}${path.sep}`)) {
    return null;
  }

  return fullPath;
}

export async function POST(req: NextRequest) {
  try {
    const { category, filename } = await req.json();

    if (typeof category !== 'string' || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Missing category or filename' }, { status: 400 });
    }

    const filePath = resolveDataFilePath(category, filename);
    if (!filePath) {
      return NextResponse.json({ error: 'Invalid file path requested' }, { status: 400 });
    }

    const content = await readFile(filePath, 'utf-8');

    let data: any;
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
      data = YAML.load(content);
    } else {
      data = JSON.parse(content);
    }

    return NextResponse.json({ data, filename });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
