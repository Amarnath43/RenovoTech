import { Router } from 'express';
import {
  getSettings,
  updateSettings,
} from '../../controllers/admin/settings.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { updateSettingsSchema } from '../../validators/schemas.js';

const router = Router();

router.get('/',   getSettings);
router.patch('/',validateBody(updateSettingsSchema) ,updateSettings);

export default router;