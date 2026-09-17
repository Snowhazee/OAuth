import crypto from 'node:crypto';

const sessions = new Map();

export function createSession(user) {
	const sessionId = crypto.randomBytes(32).toString('hex');
	sessions.set(sessionId, user);
	return sessionId;
}

export function getSession(sessionId) {
	return sessionId ? sessions.get(sessionId) : undefined;
}

export function deleteSession(sessionId) {
	if (sessionId) sessions.delete(sessionId);
}

export function getAuthenticatedUser(req, res) {
	return res.json({ user: req.user });
}
