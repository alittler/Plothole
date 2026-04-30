import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import YAML from 'js-yaml';

export const runtime = 'nodejs';

/**
 * POST /api/save-json
 * Universal endpoint for saving any JSON data back to the filesystem
 * 
 * Request body:
 * {
 *   entityType: string (e.g., 'character', 'location', 'timeline')
 *   entityId: string (e.g., 'char-123')
 *   data: object (the modified JSON data)
 *   format: 'yaml' | 'json' (default: 'yaml')
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { entityType, entityId, data, format = 'yaml' } = await request.json();

    // Validate inputs
    if (!entityType || !entityId || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: entityType, entityId, data' },
        { status: 400 }
      );
    }

    // Security: Prevent path traversal
    if (entityId.includes('..') || entityId.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid entityId: path traversal detected' },
        { status: 400 }
      );
    }

    // Construct file path within .keystatic collection
    const collectionPath = path.join(process.cwd(), '.keystatic', entityType);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(collectionPath)) {
      fs.mkdirSync(collectionPath, { recursive: true });
    }

    const filename = `${entityId}.${format === 'json' ? 'json' : 'yaml'}`;
    const filePath = path.join(collectionPath, filename);

    // Security: Ensure the resolved path is within the collection directory
    const resolvedPath = path.resolve(filePath);
    const resolvedCollectionPath = path.resolve(collectionPath);
    if (!resolvedPath.startsWith(resolvedCollectionPath)) {
      return NextResponse.json(
        { error: 'Invalid file path: outside collection directory' },
        { status: 400 }
      );
    }

    // Write to filesystem
    if (format === 'json') {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } else {
      const yaml = YAML.dump(data, { indent: 2 });
      fs.writeFileSync(filePath, yaml, 'utf-8');
    }

    console.log(`[API/save-json] Saved ${entityType}/${entityId} to ${filePath}`);

    return NextResponse.json({
      success: true,
      message: `${entityType}/${entityId} saved successfully`,
      path: filePath,
      data,
    });
  } catch (error) {
    console.error('[API/save-json] Error:', error);
    return NextResponse.json(
      { error: `Failed to save: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
