import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    // Spotify does not allow "localhost" as a redirect URI.
    // In dev, keep the app on a canonical loopback host (usually 127.0.0.1) so cookies/state work.
    if (process.env.NODE_ENV !== 'production') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (appUrl) {
        try {
          const canonical = new URL(appUrl);
          if (canonical.hostname && canonical.hostname !== 'localhost') {
            return [
              {
                source: '/:path*',
                has: [{ type: 'host', value: 'localhost' }],
                destination: `${canonical.origin}/:path*`,
                permanent: false,
              },
            ];
          }
        } catch {
          // ignore invalid URL
        }
      }
    }

    return [];
  },
};

export default nextConfig;
