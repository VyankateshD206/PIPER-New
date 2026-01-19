import 'server-only';

import nodemailer from 'nodemailer';
import { Resend } from 'resend';

function requiredEnv(name: string) {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name} environment variable`);
	return value;
}

export async function sendAllowlistRequestToAdmin(userEmail: string) {
	const adminEmail = requiredEnv('ADMIN_EMAIL');
	const from = requiredEnv('EMAIL_FROM');

	// Preferred (for you): Gmail SMTP via Nodemailer.
	// Use a Google "App Password" (recommended) rather than your normal Gmail password.
	if (process.env.SMTP_USER && process.env.SMTP_PASS) {
		const host = process.env.SMTP_HOST || 'smtp.gmail.com';
		const port = Number(process.env.SMTP_PORT || '465');
		const secure = (process.env.SMTP_SECURE || String(port === 465)) === 'true';

		const transporter = nodemailer.createTransport({
			host,
			port,
			secure,
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		});

		await transporter.sendMail({
			from,
			to: adminEmail,
			subject: 'PIPER allowlist request',
			text: `A user requested Spotify allowlist access:\n\nEmail: ${userEmail}\n`,
		});
		return;
	}

	// Preferred: Resend (no SMTP needed)
	if (process.env.RESEND_API_KEY) {
		const resend = new Resend(process.env.RESEND_API_KEY);
		await resend.emails.send({
			from,
			to: adminEmail,
			subject: 'PIPER allowlist request',
			text: `A user requested Spotify allowlist access:\n\nEmail: ${userEmail}\n`,
		});
		return;
	}

	// If you want SMTP instead later, we can add Nodemailer here.
	throw new Error(
		'Missing SMTP_USER/SMTP_PASS (Gmail SMTP) and RESEND_API_KEY (Resend).'
	);
}
