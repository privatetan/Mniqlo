/**
 * Cron Initialization Route
 * This route is called automatically when the server starts
 * to initialize the cron job manager
 */

import { NextResponse } from 'next/server';

// Import cron module to trigger auto-start
import '@/lib/cron';

export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'Cron initialization endpoint'
    });
}

// This ensures the route is always executed on server start
export const dynamic = 'force-dynamic';
export const revalidate = 0;
