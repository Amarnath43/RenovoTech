import { Router } from 'express';
import { getDates, getSlots } from '../controllers/slot.controller.js';

const router = Router();

//Public Routes (no auth)
router.get('/dates',  getDates);
router.get('/:date',  getSlots);

export default router;