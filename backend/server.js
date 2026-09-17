import 'dotenv/config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.use(cors({
	origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
	credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
	res.json({ status: 'ok', service: 'oauth-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/calendar', calendarRoutes);

app.listen(port, () => {
	console.log(`Backend running at http://localhost:${port}`);
});
