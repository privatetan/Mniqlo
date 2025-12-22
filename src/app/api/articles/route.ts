import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { withApiLogging } from '@/lib/api-logger';

export const GET = withApiLogging(async () => {
  const posts = await prisma.post.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(posts)
});

export const POST = withApiLogging(async (req: Request) => {
  const data = await req.json()
  const { title, content } = data
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const post = await prisma.post.create({ data: { title, content } })
  return NextResponse.json(post)
});
