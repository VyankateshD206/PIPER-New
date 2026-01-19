import { NextResponse } from 'next/server';

import { buildSpotifyAuthorizeUrl } from '@/lib/spotify';
import {
setSpotifyOauthStateCookies,
} from '@/lib/spotifySession';

export const runtime = 'nodejs';

function randomState(): string {
	// URL-safe state token
	return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
}

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const returnTo = requestUrl.searchParams.get('returnTo') ?? '/dashboard';

	const state = randomState();

	const redirectUrl = buildSpotifyAuthorizeUrl({ state, showDialog: true });
	const response = NextResponse.redirect(redirectUrl);
	setSpotifyOauthStateCookies(response, { state, returnTo });

	return response;
}
