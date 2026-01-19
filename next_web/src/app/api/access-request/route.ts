import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db/client';
import { spotifyAccess, users } from '@/db/schema';
import { sendAllowlistRequestToAdmin } from '@/lib/email';

function isValidEmail(email: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
	const body = (await req.json().catch(() => null)) as unknown;
	const email = (() => {
		if (typeof body !== 'object' || body === null) return '';
		if (!('email' in body)) return '';
		const value = (body as { email?: unknown }).email;
		return typeof value === 'string' ? value : '';
	})();
	const normalizedEmail = email.trim().toLowerCase();

	if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
		return NextResponse.json(
			{ ok: false, error: 'invalid_email' },
			{ status: 400 }
		);
	}

	const userRecord = await db
		.select({ id: users.id, email: users.email })
		.from(users)
		.where(eq(users.email, normalizedEmail))
		.limit(1)
		.then((rows) => rows[0]);

	const isNewUser = !userRecord;
	const resolvedUserId = userRecord
		? userRecord.id
		: await db
				.insert(users)
				.values({ email: normalizedEmail })
				.returning({ id: users.id })
				.then((rows) => rows[0]!.id);

	// Ensure spotify_access exists; if this inserts, it's the first time we track this email.
	const insertedAccess = await db
		.insert(spotifyAccess)
		.values({ userId: resolvedUserId })
		.onConflictDoNothing()
		.returning({ userId: spotifyAccess.userId })
		.then((rows) => rows[0]);

	const accessRecord = await db
		.select({ isAllowlisted: spotifyAccess.isAllowlisted })
		.from(spotifyAccess)
		.where(eq(spotifyAccess.userId, resolvedUserId))
		.limit(1)
		.then((rows) => rows[0]);

	const status = accessRecord?.isAllowlisted ? 'allowlisted' : 'pending';

	// Send admin email only the first time we see a pending request.
	const shouldNotifyAdmin = status === 'pending' && (isNewUser || !!insertedAccess);
	let didNotifyAdmin = false;
	if (shouldNotifyAdmin) {
		try {
			await sendAllowlistRequestToAdmin(normalizedEmail);
			didNotifyAdmin = true;
		} catch (err) {
			// Non-fatal: user still gets the pending response.
			if (process.env.NODE_ENV !== 'production') {
				console.error('Admin email notification failed', err);
			}
		}
	}

	const res = NextResponse.json({
		ok: true,
		status,
		notifiedAdmin: didNotifyAdmin,
	});

	res.cookies.set('piper_email', normalizedEmail, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: 60 * 60 * 24 * 30,
	});

	return res;
}
