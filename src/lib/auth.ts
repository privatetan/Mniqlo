import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabase } from './supabase';

export type AuthUser = {
    id: number;
    username: string;
    role?: string;
};

type ServerSession = {
    user: AuthUser;
    expiresAt: number;
};

const SESSION_COOKIE_NAME = 'mniqlo_session';
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;
const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;

function getSessionSecret() {
    const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
    if (secret) return secret;

    if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET or AUTH_SECRET is required in production');
    }

    return 'mniqlo-dev-session-secret';
}

function sign(value: string) {
    return crypto
        .createHmac('sha256', getSessionSecret())
        .update(value)
        .digest('base64url');
}

function safeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeUser(input: unknown): AuthUser | null {
    if (!input || typeof input !== 'object') return null;

    const raw = input as { id?: unknown; username?: unknown; role?: unknown };
    const id = Number(raw.id);
    const username = typeof raw.username === 'string' ? raw.username.trim() : '';
    const role = typeof raw.role === 'string' ? raw.role : undefined;

    if (!Number.isInteger(id) || id <= 0 || !username) {
        return null;
    }

    return { id, username, role };
}

function createSessionToken(user: AuthUser) {
    const session: ServerSession = {
        user,
        expiresAt: Date.now() + SESSION_DURATION_MS,
    };
    const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
    return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string | undefined): ServerSession | null {
    if (!token) return null;

    const [payload, signature] = token.split('.');
    if (!payload || !signature || !safeEqual(sign(payload), signature)) {
        return null;
    }

    try {
        const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<ServerSession>;
        const user = normalizeUser(parsed.user);
        const expiresAt = Number(parsed.expiresAt);

        if (!user || !Number.isFinite(expiresAt) || Date.now() > expiresAt) {
            return null;
        }

        return { user, expiresAt };
    } catch {
        return null;
    }
}

export function getCurrentUser(): AuthUser | null {
    const token = cookies().get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(token)?.user || null;
}

export function setSessionCookie(response: NextResponse, user: AuthUser) {
    response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: createSessionToken(user),
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_DURATION_SECONDS,
    });
}

export function clearSessionCookie(response: NextResponse) {
    response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: '',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
}

export async function getAdminUser(): Promise<AuthUser | null> {
    const sessionUser = getCurrentUser();
    if (!sessionUser) return null;

    const { data: user, error } = await supabase
        .from('users')
        .select('id, username, role')
        .eq('id', sessionUser.id)
        .single();

    if (error || !user || user.role !== 'ADMIN') {
        return null;
    }

    return {
        id: Number(user.id),
        username: user.username,
        role: user.role,
    };
}

export function unauthorized(message = 'Unauthorized') {
    return NextResponse.json({ success: false, message }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
    return NextResponse.json({ success: false, message }, { status: 403 });
}
