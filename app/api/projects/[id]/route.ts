import { NextRequest, NextResponse } from 'next/server';
import { del, head } from '@vercel/blob';
import { getAuthPayload } from '@/app/api/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authPayload = await getAuthPayload(request);

    if (!authPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authPayload.userId;
    // Path in Blob Storage: projects/{userId}/{id}.json
    const pathname = `projects/${userId}/${id}.json`;

    console.log(`[API/projects/[id]] Deleting project blob: ${pathname}`);

    // Vercel Blob del() works by URL or pathname
    // We attempt to delete the project file
    await del(pathname);

    console.log(`[API/projects/[id]] Project ${id} deleted from Vercel Blob successfully`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/projects/[id]] ERROR deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
