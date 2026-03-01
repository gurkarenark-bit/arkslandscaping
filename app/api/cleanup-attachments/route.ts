import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: 'Placeholder scheduled job endpoint. Configure Vercel Cron to delete >1y attachments + references.'
  });
}
