import { Router } from 'express';
import {
	createSession,
	deleteSession,
	getSession,
} from '../controllers/authController.js';
import { verifyGoogleToken } from '../middleware/verifyGoogleToken.js';

const router = Router();

router.post('/google', verifyGoogleToken, (req, res) => {
	const { sub, name, email, picture, email_verified: emailVerified } = req.user;
	const sessionId = createSession({
		id: sub,
		name,
		email,
		picture,
		emailVerified,
	});

	res.cookie('session_id', sessionId, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 1000 * 60 * 60 * 24,
	});

	return res.json({ user: getSession(sessionId) });
});

router.get('/me', (req, res) => {
	const user = getSession(req.cookies.session_id);
	return user ? res.json({ user }) : res.status(401).json({ error: 'Not authenticated' });
});

router.post('/logout', (req, res) => {
	deleteSession(req.cookies.session_id);
	res.clearCookie('session_id');
	return res.status(204).end();
});

export default router;
