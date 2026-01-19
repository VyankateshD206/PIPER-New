'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
	label: string;
	href: string;
	external?: boolean;
	match?: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
	{
		label: 'Dashboard',
		href: '/dashboard',
		match: (pathname) => pathname === '/dashboard' || pathname.startsWith('/dashboard/'),
	},
	{
		label: 'Features',
		href: '/#features',
	},
	{
		label: 'About',
		href: '/#about',
	},
	
];

function navLinkClass(isActive: boolean) {
	return [
		'relative rounded-full px-3 py-2 text-sm font-semibold text-white/80 transition',
		'hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-0',
		'after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-[2px] after:rounded-full',
		"after:bg-gradient-to-r after:from-emerald-300 after:via-emerald-400 after:to-cyan-300 after:shadow-[0_0_18px_rgba(16,185,129,0.55)]",
		'after:opacity-0 after:transition-opacity',
		isActive ? 'text-white after:opacity-100' : 'hover:after:opacity-60',
	].join(' ');
}

export function Navbar() {
	const pathname = usePathname();

	return (
		<div className="fixed inset-x-0 top-0 z-50">
			<div className="border-b border-white/10 bg-black/25 backdrop-blur-xl supports-backdrop-filter:bg-black/15">
				<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
					<Link
						href="/"
						className="group flex items-center gap-3 rounded-full px-2 py-2 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
					>
						<div className="relative h-9 w-9 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
							<Image
								src="/PIPER-logo.png"
								alt="PIPER"
								width={36}
								height={36}
								className="h-9 w-9 object-contain"
								priority
							/>
						</div>
						<div className="leading-tight">
							<div className="text-sm font-semibold tracking-wide text-white">
								<span className="bg-linear-to-r from-emerald-300 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
									PIPER
								</span>
							</div>
							<div className="text-[11px] text-white/60">Mood → Music</div>
						</div>
					</Link>

					<nav className="flex items-center gap-1">
						{NAV_ITEMS.map((item) => {
							const isActive = item.match ? item.match(pathname) : false;
							if (item.external) {
								return (
									<a
										key={item.label}
										href={item.href}
										target="_blank"
										rel="noreferrer"
										className={navLinkClass(false)}
									>
										{item.label}
									</a>
								);
							}

							return (
								<Link key={item.label} href={item.href} className={navLinkClass(isActive)}>
									{item.label}
								</Link>
							);
						})}
					</nav>
				</div>
			</div>
		</div>
	);
}
