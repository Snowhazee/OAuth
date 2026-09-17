import { google } from 'googleapis';

export async function getCurrentMonthEvents(req, res) {
	const accessToken = req.headers['x-google-access-token'];

	if (!accessToken) {
		return res.status(400).json({
			error: 'Missing Google Calendar access token',
			hint: 'Send it with the X-Google-Access-Token header.',
		});
	}

	try {
		const auth = new google.auth.OAuth2();
		auth.setCredentials({ access_token: accessToken });

		const calendar = google.calendar({ version: 'v3', auth });
		const start = new Date();
		const end = new Date(start);
		end.setFullYear(end.getFullYear() + 1);

		const response = await calendar.events.list({
			calendarId: 'primary',
			timeMin: start.toISOString(),
			timeMax: end.toISOString(),
			maxResults: 5,
			singleEvents: true,
			orderBy: 'startTime',
		});

		return res.json({
			events: response.data.items ?? [],
		});
	} catch (error) {
		return res.status(502).json({
			error: 'Google Calendar request failed',
			details: error.message,
		});
	}
}
