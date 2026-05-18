import { readdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

const DATA_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), 'data');
const ALLOWED_FILE_EXTENSIONS = new Set(['.json', '.yaml', '.yml']);

async function buildTree(dirPath: string, relativePath: string = ''): Promise<FileNode[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const nodePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const children = await buildTree(fullPath, nodePath);
        nodes.push({
          name: entry.name,
          path: nodePath,
          isDir: true,
          children
        });
      } else if (ALLOWED_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        nodes.push({
          name: entry.name,
          path: nodePath,
          isDir: false
        });
      }
    }

    // Sort: directories first, then files
    return nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const tree = await buildTree(DATA_ROOT, 'data');

    return NextResponse.json({ tree });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
