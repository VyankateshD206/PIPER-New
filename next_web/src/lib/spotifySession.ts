import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import crypto from 'node:crypto';

export type SpotifySession = {
	accessToken: string;
	expiresAtMs: number;
};

const SPOTIFY_SESSION_COOKIE = 'piper_spotify_session';
const SPOTIFY_OAUTH_STATE_COOKIE = 'piper_spotify_state';
const SPOTIFY_RETURN_TO_COOKIE = 'piper_spotify_returnto';

function getSecret(): string {
	const secret = process.env.PIPER_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET;
	if (!secret) throw new Error('Missing PIPER_SESSION_SECRET or NEXTAUTH_SECRET');
	return secret;
}

function cookieOptions() {
	return {
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: process.env.NODE_ENV === 'production',
		path: '/',
	};
}

function b64urlEncode(buf: Uint8Array): string {
	return Buffer.from(buf).toString('base64url');
}

function b64urlDecode(str: string): Uint8Array {
	return new Uint8Array(Buffer.from(str, 'base64url'));
}

function deriveKey(secret: string): Buffer {
	// 32-byte key for AES-256-GCM
	return crypto.createHash('sha256').update(secret).digest();
}

export function sealSpotifySession(session: SpotifySession): string {
	const secret = getSecret();
	const key = deriveKey(secret);
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const plaintext = Buffer.from(JSON.stringify(session), 'utf8');
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${b64urlEncode(iv)}.${b64urlEncode(ciphertext)}.${b64urlEncode(tag)}`;
}

export function unsealSpotifySession(value: string): SpotifySession | null {
	try {
		const secret = getSecret();
		const key = deriveKey(secret);
		const parts = value.split('.');
		if (parts.length !== 3) return null;
		const iv = b64urlDecode(parts[0]!);
		const ciphertext = b64urlDecode(parts[1]!);
		const tag = b64urlDecode(parts[2]!);
		const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
		decipher.setAuthTag(Buffer.from(tag));
		const plaintext = Buffer.concat([
			decipher.update(Buffer.from(ciphertext)),
			decipher.final(),
		]);
		const parsed = JSON.parse(plaintext.toString('utf8')) as Partial<SpotifySession>;
		if (!parsed.accessToken || typeof parsed.accessToken !== 'string') return null;
		if (typeof parsed.expiresAtMs !== 'number') return null;
		return { accessToken: parsed.accessToken, expiresAtMs: parsed.expiresAtMs };
	} catch {
		return null;
	}
}

export function getSpotifySessionFromCookieStore(cookieStore: ReadonlyRequestCookies): SpotifySession | null {
	const value = cookieStore.get(SPOTIFY_SESSION_COOKIE)?.value;
	if (!value) return null;
	return unsealSpotifySession(value);
}

export function isSpotifySessionActive(session: SpotifySession | null | undefined, nowMs: number = Date.now()): boolean {
	if (!session?.accessToken) return false;
	// Small buffer to avoid showing "connected" while the token is expiring.
	return session.expiresAtMs > nowMs + 15_000;
}

export function setSpotifySessionCookie(response: { cookies: { set: Function } }, session: SpotifySession) {
	response.cookies.set(SPOTIFY_SESSION_COOKIE, sealSpotifySession(session), cookieOptions());
}

export function clearSpotifySessionCookie(response: { cookies: { set: Function } }) {
	response.cookies.set(SPOTIFY_SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
}

export function setSpotifyOauthStateCookies(response: { cookies: { set: Function } }, input: { state: string; returnTo: string }) {
	response.cookies.set(SPOTIFY_OAUTH_STATE_COOKIE, input.state, cookieOptions());
	response.cookies.set(SPOTIFY_RETURN_TO_COOKIE, input.returnTo, cookieOptions());
}

export function readSpotifyOauthStateFromCookieStore(cookieStore: ReadonlyRequestCookies): { state?: string; returnTo?: string } {
	return {
		state: cookieStore.get(SPOTIFY_OAUTH_STATE_COOKIE)?.value,
		returnTo: cookieStore.get(SPOTIFY_RETURN_TO_COOKIE)?.value,
	};
}

export function clearSpotifyOauthStateCookies(response: { cookies: { set: Function } }) {
	response.cookies.set(SPOTIFY_OAUTH_STATE_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
	response.cookies.set(SPOTIFY_RETURN_TO_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
}
