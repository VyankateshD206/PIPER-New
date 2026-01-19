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
			<header className="border-b border-white/10 bg-black/40 backdrop-blur-xl supports-[backdrop-filter]:bg-black/25">
				<div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
					<div>
						<p className="text-sm font-semibold text-white">Dashboard</p>
						<p className="text-xs text-white/60">Invite-only (Spotify soon)</p>
					</div>
					<div className="flex items-center gap-3 text-xs">
						{isSpotifyConnected ? (
							<>
								<span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
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
								className="piper-btn piper-btn-primary h-9 px-4 text-xs"
							>
								Connect Spotify
							</a>
						) : (
							<span className="rounded-full bg-amber-500/15 px-3 py-1 font-semibold text-amber-300 ring-1 ring-amber-400/30">
								Enter email first
							</span>
						)}
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-5xl px-6 py-10">
				{children}
			</main>
		</div>
	);
}
