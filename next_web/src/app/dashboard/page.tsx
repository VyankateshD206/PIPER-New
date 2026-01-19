import Link from 'next/link';
import { cookies } from 'next/headers';

import { db } from '@/db/client';
import { playlists, spotifyAccess, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { RequestAccessForm } from '@/components/RequestAccessForm';
import { getSpotifySessionFromCookieStore, isSpotifySessionActive } from '@/lib/spotifySession';
import { MoodPlaylistForm } from '@/components/MoodPlaylistForm';

export default async function DashboardPage() {
	const cookieStore = await cookies();
	const email = cookieStore.get('piper_email')?.value;
	if (!email) {
		return (
			<div className="mx-auto max-w-3xl px-6 py-10">
				<div className="piper-animate-in">
					<h1 className="text-2xl font-semibold text-white">Dashboard</h1>
					<p className="mt-2 text-sm text-white/70">
						Before we show anything here, request access with your email.
					</p>
				</div>
				<div className="mt-6 piper-animate-in" style={{ animationDelay: '80ms' }}>
					<RequestAccessForm />
				</div>
			</div>
		);
	}

	const userRecord = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email))
		.limit(1)
		.then((rows) => rows[0]);

	const accessRecord = userRecord
		? await db
				.select({ isAllowlisted: spotifyAccess.isAllowlisted })
				.from(spotifyAccess)
				.where(eq(spotifyAccess.userId, userRecord.id))
				.limit(1)
				.then((rows) => rows[0])
		: undefined;

	const isAllowlisted = Boolean(accessRecord?.isAllowlisted);
	const spotifySession = getSpotifySessionFromCookieStore(cookieStore);
	const hasSpotifyConnection = isSpotifySessionActive(spotifySession);

	const previousPlaylists = userRecord
		? await db
				.select({
					mood: playlists.mood,
					url: playlists.spotifyPlaylistUrl,
					createdAt: playlists.createdAt,
				})
				.from(playlists)
				.where(eq(playlists.userId, userRecord.id))
				.orderBy(playlists.createdAt)
				.then((rows) => rows.reverse())
		: [];

	return (
		<div className="mx-auto max-w-5xl px-6 py-10">
			<div className="piper-animate-in">
				<h1 className="text-2xl font-semibold text-white">Dashboard</h1>
				<p className="mt-2 text-sm text-white/70">Signed up as {email}</p>
			</div>

			{isAllowlisted ? (
				<div className="mt-6 grid gap-4 lg:grid-cols-5">
					<div className="lg:col-span-2 piper-animate-in" style={{ animationDelay: '60ms' }}>
						<div
							className={
								hasSpotifyConnection
									? 'piper-status-card piper-status-green'
									: 'piper-status-card border-white/10 bg-white/5'
							}
						>
							<p className="text-sm font-semibold text-white">Access enabled</p>
							<p className="mt-1 text-sm text-white/70">
								Spotify connection:{' '}
								<span className={hasSpotifyConnection ? 'text-emerald-200' : 'text-white/80'}>
									{hasSpotifyConnection ? 'Connected' : 'Not connected'}
								</span>
							</p>
							<p className="mt-3 text-xs text-white/60">
								You can generate playlists once Spotify is connected.
							</p>
						</div>
					</div>

					<div className="lg:col-span-3 space-y-4">
						{hasSpotifyConnection ? (
							<div className="piper-animate-in" style={{ animationDelay: '110ms' }}>
								<MoodPlaylistForm />
							</div>
						) : null}

						<div className="piper-card piper-animate-in" style={{ animationDelay: '160ms' }}>
							<h2 className="text-lg font-semibold text-white">Previous playlists</h2>
							{previousPlaylists.length === 0 ? (
								<p className="mt-2 text-sm text-white/70">No playlists yet.</p>
							) : (
								<ul className="mt-4 space-y-2 text-sm text-white/80">
									{previousPlaylists.map((playlist) => (
										<li
											key={`${playlist.url}-${playlist.createdAt.toISOString()}`}
											className="group flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/10 px-3 py-2 transition hover:border-emerald-400/20 hover:bg-white/5"
										>
											<a
												className="truncate font-semibold text-emerald-200 underline decoration-emerald-400/30 underline-offset-4 transition group-hover:text-emerald-100 group-hover:decoration-emerald-300/70 group-hover:drop-shadow-[0_0_14px_rgba(16,185,129,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-0"
												href={playlist.url}
												target="_blank"
												rel="noreferrer"
											>
												{playlist.mood}
											</a>
											<span className="shrink-0 text-xs text-white/50">
												{playlist.createdAt.toLocaleString()}
											</span>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
				</div>
			) : (
				<div className="mt-6 piper-animate-in" style={{ animationDelay: '80ms' }}>
					<div className="piper-status-card piper-status-yellow">
						<p className="text-sm font-semibold text-yellow-100">Pending allowlist</p>
						<p className="mt-1 text-sm text-yellow-100/80">Your account will be activated in 5–10 mins.</p>
						<p className="mt-3 text-sm text-yellow-100/80">
							Need to use a different email? Go back to the{' '}
							<Link className="underline decoration-yellow-200/40 underline-offset-4 hover:decoration-yellow-200/70" href="/">
								landing page
							</Link>
							.
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
