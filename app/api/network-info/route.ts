import { NextRequest, NextResponse } from 'next/server';
import os from 'os';

export async function GET(request: NextRequest) {
  try {
    const interfaces = os.networkInterfaces();
    const networkInfo = Object.entries(interfaces).reduce((acc, [name, addrs]) => {
      acc[name] = addrs || [];
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      networks: networkInfo,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Network info endpoint failed' },
      { status: 500 }
    );
  }
}
