import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/src/db';
import { getUserId, getAuthPayload } from '@/app/api/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    console.log(`[API/projects] GET userId:`, userId);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    if (!pool) {
      console.warn('[API/projects] No database pool available - returning 503');
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const result = await pool.query(
      'SELECT data FROM projects WHERE user_id = $1 ORDER BY last_modified DESC',
      [userId]
    );

    console.log(`[API/projects] Found ${result.rows.length} projects for user: ${userId}`);
    return NextResponse.json(result.rows.map(row => row.data));
  } catch (error) {
    console.error('[API/projects] ERROR fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authPayload = await getAuthPayload(request);
    console.log(`[API/projects] POST userId:`, authPayload?.userId, `email:`, authPayload?.email);

    if (!authPayload) {
      console.warn('[API/projects] No auth payload - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    if (!pool) {
      console.warn('[API/projects] No database pool available - returning 503');
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const project = await request.json();
    console.log(`[API/projects] Saving project: ${project.id} (${project.title})`);
    console.log(`[API/projects] Project has ${project.catalogs?.length || 0} catalogs`);

    // Ensure user exists with actual email from token
    try {
      await pool.query(
        'INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = $2',
        [authPayload.userId, authPayload.email]
      );
      console.log('[API/projects] User exists or was created');
    } catch (userErr) {
      console.error('[API/projects] Error ensuring user exists:', userErr);
      throw userErr;
    }

    // Validate project data is JSON serializable
    try {
      JSON.stringify(project);
    } catch (parseErr) {
      console.error('[API/projects] Project data not JSON serializable:', parseErr);
      return NextResponse.json(
        { error: 'Invalid project data', details: 'Project data cannot be serialized to JSON' },
        { status: 400 }
      );
    }

    console.log(`[API/projects] Attempting to insert/update project in database`);
    const result = await pool.query(
      'INSERT INTO projects (id, user_id, title, data, last_modified) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET data = $4, title = $3, last_modified = $5',
      [project.id, authPayload.userId, project.title, project, Date.now()]
    );

    console.log(`[API/projects] Project ${project.id} saved successfully`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/projects] ERROR saving project:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : '';
    console.error('[API/projects] Error stack:', errStack);
    return NextResponse.json(
      { error: 'Failed to save project', details: errMsg },
      { status: 500 }
    );
  }
}
