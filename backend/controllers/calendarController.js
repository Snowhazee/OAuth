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
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		const calendarListResponse = await calendar.calendarList.list({
			minAccessRole: 'reader',
			showHidden: false,
		});
		const holidayCalendars = (calendarListResponse.data.items ?? []).filter((calendarItem) => {
			const calendarLabel = `${calendarItem.id} ${calendarItem.summary ?? ''} ${calendarItem.summaryOverride ?? ''}`.toLowerCase();
			return calendarLabel.includes('holiday') || calendarLabel.includes('วันหยุด') || calendarLabel.includes('festiv');
		});
		const calendars = [
			{ id: 'primary', name: 'Primary calendar', isHoliday: false },
			...holidayCalendars
				.filter((calendarItem) => calendarItem.id !== 'primary')
				.map((calendarItem) => ({
					id: calendarItem.id,
					name: calendarItem.summaryOverride || calendarItem.summary || 'Holiday calendar',
					isHoliday: true,
				})),
		];
		const events = [];

		for (const calendarItem of calendars) {
			let pageToken;
			do {
				const response = await calendar.events.list({
					calendarId: calendarItem.id,
					timeMin: start.toISOString(),
					timeMax: end.toISOString(),
					singleEvents: true,
					orderBy: 'startTime',
					pageToken,
				});
				events.push(...(response.data.items ?? []).map((event) => ({
					...event,
					calendarId: calendarItem.id,
					calendarName: calendarItem.name,
					isHoliday: calendarItem.isHoliday,
				})));
				pageToken = response.data.nextPageToken;
			} while (pageToken);
		}

		events.sort((firstEvent, secondEvent) => {
			const firstStart = firstEvent.start?.dateTime || firstEvent.start?.date || '';
			const secondStart = secondEvent.start?.dateTime || secondEvent.start?.date || '';
			return firstStart.localeCompare(secondStart);
		});

		return res.json({
			events,
			month: start.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
		});
	} catch (error) {
		return res.status(502).json({
			error: 'Google Calendar request failed',
			details: error.message,
		});
	}
}
