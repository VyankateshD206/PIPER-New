import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
	// NOTE: Next 16.1 warns that this convention is deprecated and may be treated as a proxy.
	// We keep this as a no-op to avoid accidental redirect loops in dev.
	void req;
	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
