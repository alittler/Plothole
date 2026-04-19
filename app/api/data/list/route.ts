import { readdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { category } = await req.json();

    if (!category) {
      return NextResponse.json({ error: 'Missing category' }, { status: 400 });
    }

    const dirPath = path.join(process.cwd(), 'data', category);
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
