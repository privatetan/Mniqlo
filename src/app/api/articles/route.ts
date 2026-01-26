import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: posts, error } = await supabase
            .from('articles')
            .select('*');

        if (error) throw error;

        return NextResponse.json(posts ?? []);
    } catch (error) {
        console.error('Articles GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const { title, content } = data;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const { data: post, error } = await supabase
            .from('articles')
            .insert([{ title, content }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(post);
    } catch (error) {
        console.error('Articles POST error:', error);
        return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
    }
}
