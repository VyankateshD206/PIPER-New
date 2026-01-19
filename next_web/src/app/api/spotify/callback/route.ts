import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { exchangeSpotifyCodeForAccessToken } from '@/lib/spotify';
import {
	clearSpotifyOauthStateCookies,
	readSpotifyOauthStateFromCookieStore,
	setSpotifySessionCookie,
} from '@/lib/spotifySession';

export const runtime = 'nodejs';

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get('code');
	const state = requestUrl.searchParams.get('state');

	if (!code || !state) {
		return NextResponse.json({ error: 'Missing code/state' }, { status: 400 });
	}

	const cookieStore = await cookies();
	const stored = readSpotifyOauthStateFromCookieStore(cookieStore);
	if (!stored.state || stored.state !== state) {
		return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
	}

	const { accessToken, expiresIn } = await exchangeSpotifyCodeForAccessToken(code);
	const expiresAtMs = Date.now() + expiresIn * 1000;
	const returnTo = stored.returnTo ?? '/dashboard';

	// Add success indicator to URL
	const redirectUrl = new URL(returnTo, requestUrl.origin);
	redirectUrl.searchParams.set('spotify', 'connected');
	const response = NextResponse.redirect(redirectUrl);
	setSpotifySessionCookie(response, { accessToken, expiresAtMs });
	clearSpotifyOauthStateCookies(response);

	return response;
}
