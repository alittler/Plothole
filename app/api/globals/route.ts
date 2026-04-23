import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/src/db';
import { getUserId } from '@/app/api/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    if (!pool) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const result = await pool.query(
      'SELECT id, data FROM app_globals WHERE user_id = $1',
      [userId]
    );

    const globals: Record<string, any> = {};
    result.rows.forEach(row => {
      globals[row.id] = row.data;
    });

    return NextResponse.json(globals);
  } catch (error) {
    console.error('[API/globals] ERROR fetching globals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch globals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    if (!pool) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const { id, data } = await request.json();
    if (!id || !data) {
      return NextResponse.json(
        { error: 'Missing id or data' },
        { status: 400 }
      );
    }

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
      [id, userId, data]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/globals] ERROR saving globals:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to save globals', details: errMsg },
      { status: 500 }
    );
  }
}
