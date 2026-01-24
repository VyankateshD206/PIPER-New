'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

type ApiResult =
	| { ok: true; status: 'allowlisted' | 'pending'; notifiedAdmin?: boolean }
	| { ok: false; error: string };

export function RequestAccessForm() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<ApiResult | null>(null);
	const [notifiedAdmin, setNotifiedAdmin] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsLoading(true);
		setResult(null);
		setNotifiedAdmin(false);

		try {
			const res = await fetch('/api/access-request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			});
			const data = (await res.json()) as ApiResult;
			setResult(data);
			setNotifiedAdmin(Boolean((data as { notifiedAdmin?: boolean }).notifiedAdmin));

			if (data.ok) {
				if (data.status === 'allowlisted') {
					toast.success('You\'re already allowlisted! 🎉', {
						description: 'Head to the dashboard to connect your Spotify account.',
						duration: 5000,
					});
				} else if (data.status === 'pending') {
					if (data.notifiedAdmin) {
						toast.success('Request received! Admin notified 📧', {
							description: 'Your account will be activated in 5–10 mins.',
							duration: 6000,
						});
					} else {
						toast.success('Request received! ✓', {
							description: 'Your account will be activated in 5–10 mins.',
							duration: 6000,
						});
					}
				}
				// Refresh so server components re-read cookies + allowlist status.
				router.refresh();
			}
		} catch {
			setResult({ ok: false, error: 'network_error' });
			toast.error('Network error', {
				description: 'Could not submit your request. Please check your connection and try again.',
				duration: 5000,
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="piper-card piper-card-hover">
			<h2 className="text-lg font-semibold text-white">Request Spotify access</h2>
			<p className="mt-2 text-sm text-white/70">
				Enter your Spotify account email to request access.<br />
Once approved, you’ll be able to connect Spotify and generate personalized playlists.
			</p>

			<form onSubmit={onSubmit} className="mt-5">
				<label className="block">
					<span className="piper-label">Email</span>
					<div className="mt-2 flex flex-col gap-3 sm:flex-row">
						<input
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							type="email"
							required
							placeholder="you@example.com"
							className="piper-input"
						/>
						<button type="submit" disabled={isLoading} className="piper-btn piper-btn-primary h-12">
							{isLoading ? 'Submitting…' : 'Submit'}
						</button>
					</div>
				</label>
			</form>

			{result?.ok === true && result.status === 'allowlisted' ? (
				<p className="mt-4 text-sm text-emerald-300">
					You’re already allowlisted. Go to dashboard to connect Spotify.
				</p>
			) : null}

			{result?.ok === true && result.status === 'pending' ? (
				<div className="mt-4 rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm text-yellow-200">
					<p className="font-medium">Request received.</p>
					<p className="mt-1">Your account will be activated in 5–10 mins.</p>
					{notifiedAdmin ? (
						<p className="mt-1 opacity-90">The admin has been notified.</p>
					) : null}
				</div>
			) : null}

			{result?.ok === false ? (
				<p className="mt-4 text-sm text-rose-300">
					Could not submit ({result.error}). Please try again.
				</p>
			) : null}
		</div>
	);
}
