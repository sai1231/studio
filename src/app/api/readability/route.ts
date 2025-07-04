
import {NextRequest, NextResponse} from 'next/server';

// This feature has been disabled.
export async function GET(request: NextRequest) {
  return NextResponse.json({error: 'Readability feature has been disabled.'}, {status: 501});
}
