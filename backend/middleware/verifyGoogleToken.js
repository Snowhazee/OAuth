import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(req, res, next) {
	const authorization = req.headers.authorization;
	const token = authorization?.startsWith('Bearer ')
		? authorization.slice('Bearer '.length)
		: null;

	if (!token) {
		return res.status(401).json({ error: 'Missing Bearer token' });
	}

	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: token,
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		req.user = ticket.getPayload();
		return next();
	} catch {
		return res.status(401).json({ error: 'Invalid Google ID token' });
	}
}
