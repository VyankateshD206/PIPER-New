const SPOTIFY_ACCOUNTS_BASE_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

export const DEFAULT_SPOTIFY_SCOPE =
	'user-read-private user-read-email playlist-read-private user-follow-read playlist-modify-private playlist-modify-public user-library-read user-top-read';

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

export function getSpotifyClientId(): string {
	return requireEnv('SPOTIFY_CLIENT_ID');
}

export function getSpotifyClientSecret(): string {
	return requireEnv('SPOTIFY_CLIENT_SECRET');
}

export function getSpotifyRedirectUri(): string {
	const configured = process.env.SPOTIFY_REDIRECT_URI;
	if (configured) return configured;
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000';
	return `${appUrl.replace(/\/$/, '')}/api/spotify/callback`;
}

export function getSpotifyScope(): string {
	let configured = process.env.SPOTIFY_SCOPE?.trim();
	if (!configured) return DEFAULT_SPOTIFY_SCOPE;

	// Allow common .env quoting patterns like: SPOTIFY_SCOPE='a b c'
	if (
		(configured.startsWith('"') && configured.endsWith('"')) ||
		(configured.startsWith("'") && configured.endsWith("'"))
	) {
		configured = configured.slice(1, -1).trim();
	}

	configured = configured.replace(/\s+/g, ' ').trim();
	return configured ? configured : DEFAULT_SPOTIFY_SCOPE;
}

export function buildSpotifyAuthorizeUrl(input: { state: string; showDialog?: boolean }) {
	const params = new URLSearchParams({
		client_id: getSpotifyClientId(),
		response_type: 'code',
		scope: getSpotifyScope(),
		redirect_uri: getSpotifyRedirectUri(),
		state: input.state,
		show_dialog: String(input.showDialog ?? true),
	});

	return `${SPOTIFY_ACCOUNTS_BASE_URL}/authorize?${params.toString()}`;
}

export type SpotifyTokenResponse = {
	access_token: string;
	token_type: 'Bearer';
	expires_in: number;
	scope?: string;
	refresh_token?: string;
};

export async function exchangeSpotifyCodeForAccessToken(code: string): Promise<{ accessToken: string; expiresIn: number }> {
	const basic = Buffer.from(`${getSpotifyClientId()}:${getSpotifyClientSecret()}`).toString('base64');
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: getSpotifyRedirectUri(),
	});

	const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE_URL}/api/token`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${basic}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body,
		cache: 'no-store',
	});

	const json = (await response.json()) as Partial<SpotifyTokenResponse> & {
		error?: string;
		error_description?: string;
	};

	if (!response.ok || !json.access_token || typeof json.expires_in !== 'number') {
		const message = json.error_description ?? json.error ?? 'Spotify token exchange failed';
		throw new Error(message);
	}

	// IMPORTANT: We intentionally do NOT return/propagate refresh_token.
	return { accessToken: json.access_token, expiresIn: json.expires_in };
}

type SpotifyMeResponse = {
	id: string;
};

async function spotifyApiFetch<T>(input: {
	accessToken: string;
	path: string;
	method?: string;
	body?: unknown;
}): Promise<T> {
	const res = await fetch(`${SPOTIFY_API_BASE_URL}${input.path}`, {
		method: input.method ?? 'GET',
		headers: {
			Authorization: `Bearer ${input.accessToken}`,
			'Content-Type': 'application/json',
		},
		body: input.body ? JSON.stringify(input.body) : undefined,
		cache: 'no-store',
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Spotify API error (${res.status}): ${text || res.statusText}`);
	}

	return (await res.json()) as T;
}

function dedupePreserveOrder(values: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const v of values) {
		if (!v) continue;
		if (seen.has(v)) continue;
		seen.add(v);
		out.push(v);
	}
	return out;
}

export async function getCurrentSpotifyUser(accessToken: string) {
	return await spotifyApiFetch<SpotifyMeResponse>({ accessToken, path: '/me' });
}

type SpotifyCreatePlaylistResponse = {
	id: string;
	external_urls?: { spotify?: string };
};

export async function createSpotifyPlaylist(input: {
	accessToken: string;
	name: string;
	description?: string;
	public: boolean;
}): Promise<{ id: string; url: string }> {
	const me = await getCurrentSpotifyUser(input.accessToken);
	const created = await spotifyApiFetch<SpotifyCreatePlaylistResponse>({
		accessToken: input.accessToken,
		path: `/users/${encodeURIComponent(me.id)}/playlists`,
		method: 'POST',
		body: {
			name: input.name,
			description: input.description,
			public: input.public,
		},
	});
	const url = created.external_urls?.spotify ?? `https://open.spotify.com/playlist/${created.id}`;
	return { id: created.id, url };
}

export async function addTracksToSpotifyPlaylist(input: {
	accessToken: string;
	playlistId: string;
	trackIds: string[];
}) {
	const uris = input.trackIds.map((id) => `spotify:track:${id}`);
	for (let i = 0; i < uris.length; i += 100) {
		const chunk = uris.slice(i, i + 100);
		await spotifyApiFetch<{ snapshot_id: string }>({
			accessToken: input.accessToken,
			path: `/playlists/${encodeURIComponent(input.playlistId)}/tracks`,
			method: 'POST',
			body: { uris: chunk },
		});
	}
}

type SpotifyPlaylistTracksResponse = {
	items?: Array<{ track?: { id?: string | null } | null } | null>;
	next?: string | null;
};

type SpotifySavedTracksResponse = {
	items?: Array<{ track?: { id?: string | null } | null } | null>;
	next?: string | null;
};

type SpotifyRecommendationsResponse = {
	tracks?: Array<{ id?: string | null } | null>;
};

type SpotifySearchTracksResponse = {
	tracks?: {
		items?: Array<{ id?: string | null } | null>;
	};
};

export async function getSpotifyRecommendationsTrackIds(input: {
	accessToken: string;
	limit: number;
	seedGenres?: string[];
	market?: string;
}): Promise<string[]> {
	const target = Math.max(0, Math.min(200, Math.floor(input.limit)));
	if (target === 0) return [];

	const seedGenres = (input.seedGenres?.length ? input.seedGenres : ['pop']).slice(0, 5);

	const makeParams = (market?: string) => {
		const p = new URLSearchParams({
			limit: String(Math.min(100, target)),
			seed_genres: seedGenres.join(','),
		});
		if (market) p.set('market', market);
		return p;
	};

	const market = (input.market ?? 'from_token').trim();
	let res: SpotifyRecommendationsResponse;
	try {
		const params = makeParams(market);
		res = await spotifyApiFetch<SpotifyRecommendationsResponse>({
			accessToken: input.accessToken,
			path: `/recommendations?${params.toString()}`,
		});
	} catch (err) {
		// Some accounts/regions occasionally 404 on recommendations with certain market settings.
		// Retry once without market.
		const message = err instanceof Error ? err.message : String(err);
		if (!message.includes('Spotify API error (404)')) throw err;
		const params = makeParams(undefined);
		res = await spotifyApiFetch<SpotifyRecommendationsResponse>({
			accessToken: input.accessToken,
			path: `/recommendations?${params.toString()}`,
		});
	}

	const ids = (Array.isArray(res.tracks) ? res.tracks : [])
		.map((t) => t?.id)
		.filter((id): id is string => typeof id === 'string' && Boolean(id));

	return dedupePreserveOrder(ids).slice(0, target);
}

export async function getSpotifySearchTrackIds(input: {
	accessToken: string;
	limit: number;
	market?: string;
	queries?: string[];
}): Promise<string[]> {
	const target = Math.max(0, Math.min(200, Math.floor(input.limit)));
	if (target === 0) return [];

	const market = (input.market ?? 'IN').trim();
	const queries = (input.queries?.length ? input.queries : ['Top hits', 'Bollywood', 'Punjabi hits', 'India top songs'])
		.map((q) => q.trim())
		.filter(Boolean)
		.slice(0, 6);

	const collected: string[] = [];
	for (const q of queries) {
		if (collected.length >= target) break;
		const params = new URLSearchParams({
			q,
			type: 'track',
			limit: String(Math.min(50, target - collected.length)),
		});
		if (market) params.set('market', market);

		const res: SpotifySearchTracksResponse = await spotifyApiFetch<SpotifySearchTracksResponse>({
			accessToken: input.accessToken,
			path: `/search?${params.toString()}`,
		});

		const ids = (Array.isArray(res.tracks?.items) ? res.tracks?.items : [])
			.map((t) => t?.id)
			.filter((id): id is string => typeof id === 'string' && Boolean(id));

		collected.push(...ids);
	}

	return dedupePreserveOrder(collected).slice(0, target);
}

export async function getSpotifyPlaylistTrackIds(input: {
	accessToken: string;
	playlistId: string;
	limit: number;
}): Promise<string[]> {
	const target = Math.max(0, Math.min(200, Math.floor(input.limit)));
	if (target === 0) return [];

	const collected: string[] = [];
	let nextPath: string | null = `/playlists/${encodeURIComponent(input.playlistId)}/tracks?${new URLSearchParams({
		limit: '50',
		offset: '0',
		fields: 'items(track(id)),next',
	}).toString()}`;

	while (nextPath && collected.length < target) {
		const page: SpotifyPlaylistTracksResponse = await spotifyApiFetch<SpotifyPlaylistTracksResponse>({
			accessToken: input.accessToken,
			path: nextPath,
		});

		const items = Array.isArray(page.items) ? page.items : [];
		for (const item of items) {
			const id = item?.track?.id;
			if (typeof id === 'string' && id) collected.push(id);
			if (collected.length >= target) break;
		}

		if (typeof page.next === 'string' && page.next) {
			// Spotify returns a fully qualified URL here; spotifyApiFetch expects a path.
			if (page.next.startsWith(SPOTIFY_API_BASE_URL)) {
				nextPath = page.next.slice(SPOTIFY_API_BASE_URL.length);
			} else {
				nextPath = null;
			}
		} else {
			nextPath = null;
		}
	}

	return dedupePreserveOrder(collected).slice(0, target);
}

export async function getSpotifySavedTrackIds(input: {
	accessToken: string;
	limit: number;
}): Promise<string[]> {
	const target = Math.max(0, Math.min(200, Math.floor(input.limit)));
	if (target === 0) return [];

	const collected: string[] = [];
	let nextPath: string | null = `/me/tracks?${new URLSearchParams({
		limit: '50',
		offset: '0',
		fields: 'items(track(id)),next',
	}).toString()}`;

	while (nextPath && collected.length < target) {
		const page: SpotifySavedTracksResponse = await spotifyApiFetch<SpotifySavedTracksResponse>({
			accessToken: input.accessToken,
			path: nextPath,
		});

		const items = Array.isArray(page.items) ? page.items : [];
		for (const item of items) {
			const id = item?.track?.id;
			if (typeof id === 'string' && id) collected.push(id);
			if (collected.length >= target) break;
		}

		if (typeof page.next === 'string' && page.next) {
			if (page.next.startsWith(SPOTIFY_API_BASE_URL)) {
				nextPath = page.next.slice(SPOTIFY_API_BASE_URL.length);
			} else {
				nextPath = null;
			}
		} else {
			nextPath = null;
		}
	}

	return dedupePreserveOrder(collected).slice(0, target);
}
