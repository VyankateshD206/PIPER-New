'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const MOODS = ['Happy', 'Calm', 'Neutral', 'Sad', 'Very Sad'] as const;

type Mood = (typeof MOODS)[number];

type ApiResponse =
	| { ok: true; playlistUrl: string; message?: string; fallbackUsed?: boolean }
	| { ok: false; error: string; message?: string };

const LOADING_MESSAGES = [
	"Warming up the vibe engine…",
	"Fetching track candidates…",
	"Grouping by mood…",
	"Assembling your playlist…",
	"Almost there",
] as const;

export function MoodPlaylistForm() {
	const router = useRouter();
	const [mood, setMood] = useState<Mood>('Happy');
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<ApiResponse | null>(null);
	const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

	useEffect(() => {
		if (!isLoading) return;
		setLoadingMessageIndex(0);
	}, [isLoading]);

	useEffect(() => {
		if (!isLoading) return;
		const lastIndex = LOADING_MESSAGES.length - 1;
		if (loadingMessageIndex >= lastIndex) return;
		const timeoutId = window.setTimeout(() => {
			setLoadingMessageIndex((i) => Math.min(i + 1, lastIndex));
		}, 2800);
		return () => window.clearTimeout(timeoutId);
	}, [isLoading, loadingMessageIndex]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsLoading(true);
		setResult(null);

		try {
			const res = await fetch('/api/playlists', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mood }),
			});
			const data = (await res.json()) as ApiResponse;
			setResult(data);

			if (data.ok) {
				// Trigger celebration confetti animation
				const duration = 3000;
				const animationEnd = Date.now() + duration;
				const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

				const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

				const interval = window.setInterval(() => {
					const timeLeft = animationEnd - Date.now();

					if (timeLeft <= 0) {
						return clearInterval(interval);
					}

					const particleCount = 50 * (timeLeft / duration);
					// Emerald and cyan colors matching the theme
					confetti({
						...defaults,
						particleCount,
						origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
						colors: ['#10b981', '#34d399', '#6ee7b7', '#22d3ee', '#67e8f9'],
					});
					confetti({
						...defaults,
						particleCount,
						origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
						colors: ['#10b981', '#34d399', '#6ee7b7', '#22d3ee', '#67e8f9'],
					});
				}, 250);

				// Celebration toast for successful playlist creation with longer duration
				toast.success('🎉 Playlist Created Successfully!', {
					description: data.fallbackUsed 
						? `Your ${mood} playlist is ready! (Used fallback tracks)`
						: `Your ${mood} playlist is ready! Check it out on Spotify.`,
					duration: 12000,
					action: {
						label: 'Open Spotify',
						onClick: () => window.open(data.playlistUrl, '_blank'),
					},
				});
				router.refresh();
			} else {
				// Error toast
				toast.error('Failed to create playlist', {
					description: data.message || `Error: ${data.error}. Please try again.`,
					duration: 5000,
				});
			}
		} catch {
			setResult({ ok: false, error: 'network_error' });
			toast.error('Network error', {
				description: 'Could not create playlist. Please check your connection and try again.',
				duration: 5000,
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="piper-card piper-card-hover">
			<h2 className="text-lg font-semibold text-white">Create a mood playlist</h2>
			<p className="mt-2 text-sm text-white/70">
				Select a mood and we’ll generate a Spotify playlist based on your top tracks.
			</p>

			<form onSubmit={onSubmit} className="mt-5">
				<label className="block">
					<span className="piper-label">Mood</span>
					<div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
						<select
							value={mood}
							onChange={(e) => setMood(e.target.value as Mood)}
							className="piper-select sm:w-64"
						>
							{MOODS.map((value) => (
								<option key={value} value={value} className="bg-black">
									{value}
								</option>
							))}
						</select>

						<button type="submit" disabled={isLoading} className="piper-btn piper-btn-primary h-12">
							{isLoading ? 'Creating…' : 'Submit'}
						</button>
					</div>

					{isLoading ? (
						<div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">
							<span className="inline-block h-4 w-4 animate-spin rounded-full border border-white/25 border-t-emerald-300/90" />
							<span className="min-w-0 truncate">{LOADING_MESSAGES[loadingMessageIndex]}</span>
						</div>
					) : (
						<p className="mt-3 text-xs text-white/55">
							Playlist creation may take a few moments—please wait while we prepare your soundtrack.
						</p>
					)}
				</label>
			</form>

			{result?.ok ? (
				<div className="mt-4 text-sm text-emerald-300">
					<p>
						Playlist created:{' '}
						<a className="underline" href={result.playlistUrl} target="_blank" rel="noreferrer">
							Open in Spotify
						</a>
					</p>
					{result.message ? (
						<p className="mt-2 text-xs text-emerald-200/90">{result.message}</p>
					) : null}
				</div>
			) : null}

			{result?.ok === false ? (
				<p className="mt-4 text-sm text-rose-300">
					Could not create playlist ({result.error}).
					{result.message ? ` ${result.message}` : ''}
				</p>
			) : null}
		</div>
	);
}
