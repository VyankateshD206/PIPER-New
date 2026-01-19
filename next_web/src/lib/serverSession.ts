import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export type PiperSession = {
	spotifyAccessToken?: string;
	spotifyAccessTokenExpiresAtMs?: number;
	spotifyOauthState?: string;
	spotifyReturnTo?: string;
};

const SESSION_COOKIE_NAME = 'piper_session';

declare global {
	// eslint-disable-next-line no-var
	var __piperSessionStore: Map<string, PiperSession> | undefined;
}

const sessionStore: Map<string, PiperSession> = globalThis.__piperSessionStore ?? new Map();
if (!globalThis.__piperSessionStore) {
	globalThis.__piperSessionStore = sessionStore;
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
	if (!cookieHeader) return {};
	const result: Record<string, string> = {};
	for (const part of cookieHeader.split(';')) {
		const [rawName, ...rawValue] = part.trim().split('=');
		if (!rawName) continue;
		result[rawName] = decodeURIComponent(rawValue.join('='));
	}
	return result;
}

export function getSessionIdFromCookieHeader(cookieHeader: string | null): string | undefined {
	const cookies = parseCookieHeader(cookieHeader);
	return cookies[SESSION_COOKIE_NAME];
}

export function ensureSessionId(sessionId: string | undefined): string {
	return sessionId ?? crypto.randomUUID();
}

export function getSession(sessionId: string): PiperSession {
	return sessionStore.get(sessionId) ?? {};
}

export function setSession(sessionId: string, data: PiperSession) {
	sessionStore.set(sessionId, data);
}

export function patchSession(sessionId: string, patch: Partial<PiperSession>) {
	const current = getSession(sessionId);
	sessionStore.set(sessionId, { ...current, ...patch });
}

export function clearSession(sessionId: string) {
	sessionStore.delete(sessionId);
}

export function getSessionIdFromCookieStore(cookieStore: ReadonlyRequestCookies): string | undefined {
	return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export function getSpotifyAccessTokenFromCookieStore(cookieStore: ReadonlyRequestCookies): string | undefined {
	const sessionId = getSessionIdFromCookieStore(cookieStore);
	if (!sessionId) return undefined;
	return getSession(sessionId).spotifyAccessToken;
}

export function getSpotifyAccessTokenExpiresAtMsFromCookieStore(cookieStore: ReadonlyRequestCookies): number | undefined {
	const sessionId = getSessionIdFromCookieStore(cookieStore);
	if (!sessionId) return undefined;
	return getSession(sessionId).spotifyAccessTokenExpiresAtMs;
}

export function sessionCookieOptions() {
	return {
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: process.env.NODE_ENV === 'production',
		path: '/',
	};
}

export const PIPER_SESSION_COOKIE_NAME = SESSION_COOKIE_NAME;
