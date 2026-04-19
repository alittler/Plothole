import { readFile } from 'fs/promises';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { category, filename } = await req.json();

    if (!category || !filename) {
      return NextResponse.json({ error: 'Missing category or filename' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'data', category, filename);
    const content = await readFile(filePath, 'utf-8');

    let data: any;
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
      data = parseYaml(content);
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
