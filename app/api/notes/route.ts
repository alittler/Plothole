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
      `SELECT id, content, tags, data, timestamp FROM global_notes 
       WHERE user_id = $1 
       ORDER BY timestamp DESC`,
      [userId]
    );

    const notes = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      tags: row.tags || [],
      ...row.data,
      timestamp: row.timestamp
    }));

    return NextResponse.json(notes);
  } catch (error) {
    console.error('[API/notes] ERROR fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
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

    const note = await request.json();
    if (!note.id || !note.content) {
      return NextResponse.json(
        { error: 'Missing id or content' },
        { status: 400 }
      );
    }

    // Ensure user exists first
    await pool.query(
      'INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = $2',
      [userId, `${userId}@auth.internal`]
    );

    // Upsert note
    await pool.query(
      `INSERT INTO global_notes (id, user_id, content, tags, data, timestamp) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE 
       SET content = $3, tags = $4, data = $5, timestamp = CURRENT_TIMESTAMP`,
      [note.id, userId, note.content, note.tags || [], note]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/notes] ERROR saving note:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to save note', details: errMsg },
      { status: 500 }
    );
  }
}
