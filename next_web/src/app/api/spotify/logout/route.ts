import { NextResponse } from 'next/server';

import { clearSpotifyOauthStateCookies, clearSpotifySessionCookie } from '@/lib/spotifySession';

export const runtime = 'nodejs';

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const returnTo = requestUrl.searchParams.get('returnTo') ?? '/dashboard';

	// Add disconnection indicator to URL
	const redirectUrl = new URL(returnTo, requestUrl.origin);
	redirectUrl.searchParams.set('spotify', 'disconnected');
	const response = NextResponse.redirect(redirectUrl);
	clearSpotifySessionCookie(response);
	clearSpotifyOauthStateCookies(response);
	return response;
}
