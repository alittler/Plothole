import { readdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const DATA_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), 'data');

function resolveCategoryPath(category: string): string | null {
  const normalized = category.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.includes('..')) {
    return null;
  }

  const fullPath = path.resolve(DATA_ROOT, normalized);
  if (!fullPath.startsWith(`${DATA_ROOT}${path.sep}`)) {
    return null;
  }

  return fullPath;
}

export async function POST(req: NextRequest) {
  try {
    const { category } = await req.json();

    if (typeof category !== 'string') {
      return NextResponse.json({ error: 'Missing category' }, { status: 400 });
    }

    const dirPath = resolveCategoryPath(category);
    if (!dirPath) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const files = await readdir(dirPath);
    const filtered = files.filter(f => f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml'));

    return NextResponse.json({ files: filtered });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
