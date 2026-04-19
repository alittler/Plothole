import { writeFile } from 'fs/promises';
import path from 'path';
import { stringify as stringifyYaml } from 'yaml';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { category, filename, data } = await req.json();

    if (!category || !filename || data === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'data', category, filename);
    let content: string;

    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
      content = stringifyYaml(data, { indent: 2 });
    } else {
      content = JSON.stringify(data, null, 2);
    }

    await writeFile(filePath, content, 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
