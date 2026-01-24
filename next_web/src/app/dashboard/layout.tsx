import { cookies } from 'next/headers';
import { Suspense } from 'react';

import { getSpotifySessionFromCookieStore, isSpotifySessionActive } from '@/lib/spotifySession';
import { SpotifyConnectionToast } from '@/components/SpotifyConnectionToast';

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const cookieStore = await cookies();
	const spotifySession = getSpotifySessionFromCookieStore(cookieStore);
	const isSpotifyConnected = isSpotifySessionActive(spotifySession);
	const hasEmail = Boolean(cookieStore.get('piper_email')?.value);

	return (
		<div className="min-h-screen">
			<Suspense fallback={null}>
				<SpotifyConnectionToast />
			</Suspense>
			<div className="sticky top-16 z-40 overflow-hidden rounded-t-2xl border-b border-white/10 bg-black/40 backdrop-blur-xl supports-backdrop-filter:bg-black/25">
				<div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 sm:px-6">
					<div>
						<p className="text-lg font-semibold text-white">Dashboard</p>
					</div>
					<div className="flex items-center gap-3">
						{isSpotifyConnected ? (
							<>
								<span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
									Spotify Connected
								</span>
								<a
									href="/api/spotify/logout?returnTo=/dashboard"
									className="piper-btn piper-btn-secondary h-9 px-4 text-xs"
								>
									Disconnect
								</a>
							</>
						) : hasEmail ? (
							<a
								href="/api/spotify/login?returnTo=/dashboard"
								className="piper-btn piper-btn-primary h-10 px-5 text-sm font-semibold shadow-lg shadow-emerald-500/25"
							>
								Connect Spotify
							</a>
						) : (
							<span className="rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/30">
								Enter email first
							</span>
						)}
					</div>
				</div>
			</div>

			<main>
				{children}
			</main>
		</div>
	);
}
