/**
 * Session management utilities
 * Handles session storage, validation, and expiration
 */

export interface SessionData {
    user: {
        id: number;
        username: string;
        role?: string;
    };
    expiresAt: number; // Unix timestamp in milliseconds
}

// Session duration: 7 days (in milliseconds)
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

type StoredSessionLike = Partial<SessionData> & {
    id?: unknown;
    username?: unknown;
    role?: unknown;
    user?: {
        id?: unknown;
        username?: unknown;
        role?: unknown;
    };
};

function normalizeUser(input: unknown): SessionData['user'] | null {
    if (!input || typeof input !== 'object') return null;
    const raw = input as { id?: unknown; username?: unknown; role?: unknown };
    const id = Number(raw.id);
    if (!Number.isInteger(id)) return null;

    const username = typeof raw.username === 'string' ? raw.username.trim() : '';
    if (!username) return null;

    const role = typeof raw.role === 'string' ? raw.role : undefined;
    return { id, username, role };
}

/**
 * Save user session to localStorage with expiration
 */
export function saveSession(user: { id: number; username: string; role?: string }): void {
    const sessionData: SessionData = {
        user,
        expiresAt: Date.now() + SESSION_DURATION,
    };
    // Keep root fields for legacy readers that still access JSON.parse(...).id.
    localStorage.setItem('user', JSON.stringify({
        ...sessionData,
        id: user.id,
        username: user.username,
        role: user.role
    }));
}

/**
 * Get current session if valid, null if expired or not found
 */
export function getSession(): SessionData | null {
    try {
        const stored = localStorage.getItem('user');
        if (!stored) return null;

        const parsed = JSON.parse(stored) as StoredSessionLike;

        const nestedUser = normalizeUser(parsed.user);
        const rootUser = normalizeUser(parsed);
        const user = nestedUser || rootUser;
        if (!user) {
            clearSession();
            return null;
        }

        const expiresAt = Number(parsed.expiresAt);

        // If expiresAt is missing/invalid, migrate legacy format to a fresh session.
        if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
            const migrated: SessionData = {
                user,
                expiresAt: Date.now() + SESSION_DURATION,
            };
            localStorage.setItem('user', JSON.stringify({
                ...migrated,
                id: user.id,
                username: user.username,
                role: user.role
            }));
            return migrated;
        }

        // Check if session is expired
        if (Date.now() > expiresAt) {
            clearSession();
            return null;
        }

        return { user, expiresAt };
    } catch (error) {
        console.error('Error reading session:', error);
        clearSession();
        return null;
    }
}

/**
 * Get user from session if valid
 */
export function getUser(): SessionData['user'] | null {
    const session = getSession();
    return session?.user || null;
}

/**
 * Check if user is authenticated with valid session
 */
export function isAuthenticated(): boolean {
    return getSession() !== null;
}

/**
 * Clear session from localStorage
 */
export function clearSession(): void {
    localStorage.removeItem('user');
}

/**
 * Refresh session expiration (extend by SESSION_DURATION from now)
 */
export function refreshSession(): boolean {
    const session = getSession();
    if (!session) return false;

    session.expiresAt = Date.now() + SESSION_DURATION;
    localStorage.setItem('user', JSON.stringify(session));
    return true;
}

/**
 * Get user as JSON string (for backward compatibility with existing code)
 * Returns null if session is expired or not found
 */
export function getUserString(): string | null {
    const session = getSession();
    if (!session) return null;
    return JSON.stringify(session.user);
}
