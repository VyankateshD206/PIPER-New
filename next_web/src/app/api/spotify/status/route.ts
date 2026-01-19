import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSpotifySessionFromCookieStore, isSpotifySessionActive } from '@/lib/spotifySession';

export const runtime = 'nodejs';

export async function GET() {
	const cookieStore = await cookies();
	const session = getSpotifySessionFromCookieStore(cookieStore);
	const now = Date.now();
	const expiresAtMs = session?.expiresAtMs;

	return NextResponse.json({
		ok: true,
		connected: isSpotifySessionActive(session, now),
		hasCookie: Boolean(session),
		now,
		expiresAtMs: expiresAtMs ?? null,
	});
}
