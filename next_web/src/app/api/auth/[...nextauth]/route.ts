import { NextResponse } from 'next/server';

export function GET() {
	return NextResponse.json(
		{ error: 'Auth disabled', message: 'Email auth is not enabled yet.' },
		{ status: 404 }
	);
}

export const POST = GET;
