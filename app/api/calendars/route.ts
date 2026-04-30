import { NextRequest, NextResponse } from 'next/server';
import { writeKestaticCalendars, readKestaticCalendars } from '../../../src/services/keystatic-sync';

export const runtime = 'nodejs';

/**
 * GET /api/calendars - Read calendars from Keystatic storage
 */
export async function GET(request: NextRequest) {
  try {
    const calendars = await readKestaticCalendars();
    return NextResponse.json({ calendars });
  } catch (error) {
    console.error('[API] Error reading calendars:', error);
    return NextResponse.json({ error: 'Failed to read calendars' }, { status: 500 });
  }
}

/**
 * POST /api/calendars - Write calendars to Keystatic storage
 */
export async function POST(request: NextRequest) {
  try {
    const { calendars } = await request.json();
    
    if (!Array.isArray(calendars)) {
      return NextResponse.json({ error: 'Calendars must be an array' }, { status: 400 });
    }
    
    await writeKestaticCalendars(calendars);
    return NextResponse.json({ success: true, message: 'Calendars saved to Keystatic' });
  } catch (error) {
    console.error('[API] Error writing calendars:', error);
    return NextResponse.json({ error: 'Failed to write calendars' }, { status: 500 });
  }
}
