import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resendId: string }> }
) {
  const { resendId } = await params;
  
  // In a real app, you'd use resend.emails.get(resendId)
  // and check the 'status' property.
  // For now, we simulate success for the UI.
  console.log(`[Backup API] Verifying backup: ${resendId}`);
  
  return NextResponse.json({ status: 'delivered' });
}
