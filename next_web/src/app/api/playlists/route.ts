import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { playlists, spotifyAccess, users } from '@/db/schema';
import {
	getSpotifySessionFromCookieStore,
} from '@/lib/spotifySession';
import {
	addTracksToSpotifyPlaylist,
	createSpotifyPlaylist,
	getSpotifyPlaylistTrackIds,
	getSpotifyRecommendationsTrackIds,
	getSpotifySavedTrackIds,
} from '@/lib/spotify';

export const runtime = 'nodejs';

const TRENDING_PLAYLIST_ID = '37i9dQZF1DXbVhgADFy3im';
const DESIRED_PLAYLIST_TRACKS = 10;

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

const ALLOWED_MOODS = ['Happy', 'Calm', 'Neutral', 'Sad', 'Very Sad'] as const;

type AllowedMood = (typeof ALLOWED_MOODS)[number];

function isAllowedMood(value: string): value is AllowedMood {
	return (ALLOWED_MOODS as readonly string[]).includes(value);
}

function getMlServiceUrl() {
	return (process.env.ML_SERVICE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
}

function getFallbackSeedGenres(mood: AllowedMood): string[] {
	// Keep this deterministic and non-random; avoid search-based fallbacks.
	switch (mood) {
		case 'Happy':
			return ['pop', 'dance', 'edm'];
		case 'Calm':
			return ['chill', 'acoustic', 'ambient'];
		case 'Neutral':
			return ['pop', 'indie', 'rock'];
		case 'Sad':
			return ['acoustic', 'ambient', 'indie'];
		case 'Very Sad':
			return ['ambient', 'acoustic', 'indie'];
		default:
			return ['pop'];
	}
}

async function getFallbackTrackIds(
	accessToken: string,
	mood: AllowedMood
): Promise<{ trackIds: string[]; message: string }> {
	// 1) Use user's saved tracks (Liked Songs) if available.
	// This is not random, and works for users who have history but no "top tracks" yet.
	try {
		const saved = await getSpotifySavedTrackIds({ accessToken, limit: 50 });
		if (saved.length > 0) {
			return {
				trackIds: saved,
				message: 'No top tracks found; used your Liked Songs to curate this playlist.',
			};
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes('Spotify API error (401)') || message.includes('Spotify API error (403)')) {
			throw err;
		}
	}

	// 2) Try Trending editorial playlist.
	try {
		const trending = await getSpotifyPlaylistTrackIds({
			accessToken,
			playlistId: TRENDING_PLAYLIST_ID,
			limit: 50,
		});
		if (trending.length > 0) {
			return {
				trackIds: trending,
				message: 'No top tracks found; used Trending tracks to curate this playlist.',
			};
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		// If the playlist is not available (Spotify sometimes returns 404 by region), fall back to other sources.
		// If the token is invalid/forbidden, bubble it up.
		if (message.includes('Spotify API error (401)') || message.includes('Spotify API error (403)')) {
			throw err;
		}
	}

	// 3) Spotify recommendations (mood-aware genres).
	try {
		const recs = await getSpotifyRecommendationsTrackIds({
			accessToken,
			limit: 50,
			seedGenres: getFallbackSeedGenres(mood),
			market: 'IN',
		});
		if (recs.length > 0) {
			return {
				trackIds: recs,
				message: 'No top tracks found; used Spotify recommendations to curate this playlist.',
			};
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes('Spotify API error (401)') || message.includes('Spotify API error (403)')) {
			throw err;
		}

		// One more attempt with a conservative seed list.
		try {
			const recs = await getSpotifyRecommendationsTrackIds({
				accessToken,
				limit: 50,
				seedGenres: ['pop'],
				market: 'from_token',
			});
			if (recs.length > 0) {
				return {
					trackIds: recs,
					message: 'No top tracks found; used Spotify recommendations to curate this playlist.',
				};
			}
		} catch {
			// ignore
		}
	}

	return {
		trackIds: [],
		message: 'No top tracks found and no fallback tracks were available.',
	};
}

export async function POST(req: Request) {
	const cookieStore = await cookies();
	const email = cookieStore.get('piper_email')?.value;
	if (!email) {
		return NextResponse.json({ ok: false, error: 'not_signed_in' }, { status: 401 });
	}

	const body = (await req.json().catch(() => null)) as unknown;
	const mood = (() => {
		if (typeof body !== 'object' || body === null) return '';
		if (!('mood' in body)) return '';
		const value = (body as { mood?: unknown }).mood;
		return typeof value === 'string' ? value : '';
	})();

	if (!mood || !isAllowedMood(mood)) {
		return NextResponse.json({ ok: false, error: 'invalid_mood' }, { status: 400 });
	}

	const userRecord = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email))
		.limit(1)
		.then((rows) => rows[0]);

	if (!userRecord) {
		return NextResponse.json({ ok: false, error: 'unknown_user' }, { status: 404 });
	}

	const accessRecord = await db
		.select({ isAllowlisted: spotifyAccess.isAllowlisted })
		.from(spotifyAccess)
		.where(eq(spotifyAccess.userId, userRecord.id))
		.limit(1)
		.then((rows) => rows[0]);

	if (!accessRecord?.isAllowlisted) {
		return NextResponse.json({ ok: false, error: 'not_allowlisted' }, { status: 403 });
	}

	const spotifySession = getSpotifySessionFromCookieStore(cookieStore);
	if (!spotifySession?.accessToken) {
		return NextResponse.json(
			{ ok: false, error: 'spotify_not_connected', message: 'Click Connect Spotify first.' },
			{ status: 401 }
		);
	}
	if (spotifySession.expiresAtMs <= Date.now() + 15_000) {
		return NextResponse.json(
			{ ok: false, error: 'spotify_token_expired', message: 'Please reconnect Spotify.' },
			{ status: 401 }
		);
	}

	let trackIds: string[] = [];
	let usedTrendingFallback = false;
	let fallbackMessage: string | undefined;
	try {
		const mlRes = await fetch(`${getMlServiceUrl()}/recommendations`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mood, access_token: spotifySession.accessToken }),
			cache: 'no-store',
		});
		const mlJson = (await mlRes.json().catch(() => null)) as
			| { trackIds?: unknown; error?: unknown; message?: unknown; detail?: unknown }
			| null;

		const mlDetail = typeof mlJson?.detail === 'string' ? mlJson.detail : undefined;
		const mlMessage = String(mlDetail ?? mlJson?.message ?? mlJson?.error ?? mlRes.status);

		if (!mlRes.ok) {
			if (mlRes.status === 401) {
				return NextResponse.json(
					{
						ok: false,
						error: 'spotify_token_invalid',
						message: 'Spotify token is invalid/expired. Please reconnect Spotify.',
						detail: mlMessage,
					},
					{ status: 401 }
				);
			}

			if (mlRes.status === 403) {
				if (mlMessage.includes('spotify_user_not_registered')) {
					return NextResponse.json(
						{
							ok: false,
							error: 'spotify_user_not_registered',
							message:
								'Your Spotify account is not added to this Spotify app (Developer Dashboard → User Management). Add your account, then reconnect.',
							detail: mlMessage,
						},
						{ status: 403 }
					);
				}

				if (mlMessage.includes('spotify_insufficient_scope')) {
					return NextResponse.json(
						{
							ok: false,
							error: 'spotify_insufficient_scope',
							message: 'Spotify permission missing (scope). Reconnect and approve access.',
							detail: mlMessage,
						},
						{ status: 403 }
					);
				}

				return NextResponse.json(
					{ ok: false, error: 'spotify_forbidden', message: mlMessage },
					{ status: 403 }
				);
			}

			if (mlRes.status === 422) {
				// New users often have no listening history/top tracks yet.
				// In that case, fall back to Trending tracks and still create a playlist.
				const shouldFallback =
					mlMessage.includes('no_top_tracks') ||
					mlMessage.includes('no_track_candidates') ||
					mlMessage.includes('no_track_ids');
				if (!shouldFallback) {
					return NextResponse.json(
						{ ok: false, error: 'ml_no_tracks', message: mlMessage },
						{ status: 422 }
					);
				}
				try {
					const fallback = await getFallbackTrackIds(spotifySession.accessToken, mood);
					trackIds = fallback.trackIds;
					usedTrendingFallback = true;
					fallbackMessage = fallback.message;
				} catch (err) {
					const message = err instanceof Error ? err.message : 'spotify_error';
					return NextResponse.json(
						{ ok: false, error: 'spotify_error', message: `Fallback failed: ${message}` },
						{ status: 502 }
					);
				}

				// Important: do NOT return an error here; proceed with playlist creation.
			} else {
				return NextResponse.json(
					{ ok: false, error: 'ml_service_error', message: mlMessage },
					{ status: 502 }
				);
			}
		}

		trackIds = Array.isArray(mlJson?.trackIds)
			? (mlJson?.trackIds.filter((id): id is string => typeof id === 'string') as string[])
			: [];
	} catch (err) {
		const message = err instanceof Error ? err.message : 'ml_request_failed';
		return NextResponse.json(
			{
				ok: false,
				error: 'ml_service_unreachable',
				message: 'Start the ML service and try again.',
				detail: message,
			},
			{ status: 502 }
		);
	}

	if (trackIds.length === 0) {
		// If ML returned empty results (rare), still try Trending fallback.
		try {
			const fallback = await getFallbackTrackIds(spotifySession.accessToken, mood);
			trackIds = fallback.trackIds;
			if (trackIds.length > 0) {
				usedTrendingFallback = true;
				fallbackMessage = fallback.message;
			}
		} catch {
			// ignore
		}
		if (trackIds.length === 0) {
			return NextResponse.json(
				{ ok: false, error: 'no_tracks', message: 'No tracks available to create a playlist.' },
				{ status: 422 }
			);
		}
	}

	// Ensure we always create a reasonably-sized playlist.
	// If mood-picked tracks are too few (<10, including the <5 case), top up with Trending tracks.
	let finalTrackIds = dedupePreserveOrder(trackIds).slice(0, DESIRED_PLAYLIST_TRACKS);
	if (finalTrackIds.length < DESIRED_PLAYLIST_TRACKS) {
		try {
			const fallback = await getFallbackTrackIds(spotifySession.accessToken, mood);
			finalTrackIds = dedupePreserveOrder([...finalTrackIds, ...fallback.trackIds]).slice(0, DESIRED_PLAYLIST_TRACKS);
		} catch {
			// If Trending fetch fails, proceed with what we have.
		}
	}

	try {
		const created = await createSpotifyPlaylist({
			accessToken: spotifySession.accessToken,
			name: `PIPER - ${mood}`,
			description: `Generated by PIPER for mood: ${mood}`,
			public: false,
		});

		await addTracksToSpotifyPlaylist({
			accessToken: spotifySession.accessToken,
			playlistId: created.id,
			trackIds: finalTrackIds,
		});

		await db.insert(playlists).values({
			userId: userRecord.id,
			mood,
			spotifyPlaylistUrl: created.url,
		});

		return NextResponse.json({
			ok: true,
			playlistUrl: created.url,
			fallbackUsed: usedTrendingFallback,
			message: fallbackMessage,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'spotify_error';
		return NextResponse.json({ ok: false, error: 'spotify_error', message }, { status: 502 });
	}
}
