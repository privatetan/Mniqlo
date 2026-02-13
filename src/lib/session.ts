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

/**
 * Save user session to localStorage with expiration
 */
export function saveSession(user: { id: number; username: string; role?: string }): void {
    const sessionData: SessionData = {
        user,
        expiresAt: Date.now() + SESSION_DURATION,
    };
    localStorage.setItem('user', JSON.stringify(sessionData));
}

/**
 * Get current session if valid, null if expired or not found
 */
export function getSession(): SessionData | null {
    try {
        const stored = localStorage.getItem('user');
        if (!stored) return null;

        const sessionData = JSON.parse(stored) as SessionData;

        // Check if session has expiresAt field (backward compatibility)
        if (!sessionData.expiresAt) {
            // Old session format without expiration - treat as expired
            clearSession();
            return null;
        }

        // Check if session is expired
        if (Date.now() > sessionData.expiresAt) {
            clearSession();
            return null;
        }

        return sessionData;
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

