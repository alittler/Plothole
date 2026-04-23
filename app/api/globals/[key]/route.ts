import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/src/db';
import { getUserId } from '@/app/api/auth';

// GET /api/globals/[key]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    if (!pool) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const result = await pool.query(
      'SELECT data FROM app_globals WHERE id = $1 AND user_id = $2',
      [key, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json(result.rows[0].data);
  } catch (error) {
    console.error('[API/globals/[key]] ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch global' },
      { status: 500 }
    );
  }
}

// POST /api/globals/[key]
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    if (!pool) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const data = await request.json();

    // Ensure user exists first
    await pool.query(
      'INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = $2',
      [userId, `${userId}@auth.internal`]
    );

    // Upsert global data
    await pool.query(
      `INSERT INTO app_globals (id, user_id, data, last_modified) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (id, user_id) DO UPDATE 
       SET data = $3, last_modified = CURRENT_TIMESTAMP`,
      [key, userId, data]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/globals/[key]] ERROR:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to save global', details: errMsg },
      { status: 500 }
    );
  }
}
