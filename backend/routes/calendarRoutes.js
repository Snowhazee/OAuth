import { Router } from 'express';
import { getCurrentMonthEvents } from '../controllers/calendarController.js';

const router = Router();

router.get('/events', getCurrentMonthEvents);

export default router;
