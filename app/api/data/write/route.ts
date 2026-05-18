import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error:
        'Persistent local data writes are disabled. Use durable external storage (Blob/S3/DB) for mutable data, then sync read-only files into /data at build time.',
    },
    { status: 501 },
  );
}
