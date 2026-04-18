import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const configPath = join(process.cwd(), 'public/admin/config.yml');
    const content = await readFile(configPath, 'utf-8');
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error reading config.yml:', error);
    return NextResponse.json(
      { error: 'Failed to load config' },
      { status: 404 }
    );
  }
}
