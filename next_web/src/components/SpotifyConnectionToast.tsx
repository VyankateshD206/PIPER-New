'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function SpotifyConnectionToast() {
	const searchParams = useSearchParams();

	useEffect(() => {
		const status = searchParams.get('spotify');
		
		if (status === 'connected') {
			toast.success('🎵 Spotify Connected!', {
				description: 'Your Spotify account is now connected. You can create mood playlists.',
				duration: 5000,
			});
			// Clean up URL
			const url = new URL(window.location.href);
			url.searchParams.delete('spotify');
			window.history.replaceState({}, '', url.toString());
		} else if (status === 'disconnected') {
			toast.info('Spotify Disconnected', {
				description: 'Your Spotify account has been disconnected.',
				duration: 5000,
			});
			// Clean up URL
			const url = new URL(window.location.href);
			url.searchParams.delete('spotify');
			window.history.replaceState({}, '', url.toString());
		}
	}, [searchParams]);

	return null;
}
