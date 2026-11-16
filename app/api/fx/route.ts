// app/api/fx/route.ts

import { NextResponse } from 'next/server';
import { getLiveUsdToNgnRate, logFxRateToServerConsole } from '@/lib/fx';

export const dynamic = 'force-dynamic';

export async function GET() {
  const fx = await getLiveUsdToNgnRate();
  logFxRateToServerConsole({
    route: 'GET /api/fx',
    fx,
  });
  return NextResponse.json(fx);
}
