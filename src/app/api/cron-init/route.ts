import { NextResponse } from 'next/server';
import { startJobs } from '@/lib/jobs';

export async function GET() {
    await startJobs();

    return NextResponse.json({
        success: true,
        message: 'Job runtime initialization endpoint'
    });
}

// This ensures the route is always executed on server start
export const dynamic = 'force-dynamic';
export const revalidate = 0;
