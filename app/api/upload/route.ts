import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = (formData.get('image') || formData.get('file')) as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded. Expected "image" or "file" field.' },
        { status: 400 }
      );
    }

    const filename = file.name || 'uploaded-file';
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const pathname = `uploads/${uniqueSuffix}-${safeFilename}`;

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type || 'application/octet-stream',
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });
  } catch (error) {
    console.error('[Upload API] Error in upload endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: `Upload processing failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
