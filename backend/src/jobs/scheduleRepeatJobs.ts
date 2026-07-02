import { autoCancelQueue } from '../queues/autoCancel.queue.js';
import { pickupReminderQueue } from '../queues/pickupReminder.queue.js';
import { nowISTString } from '../utils/slotTime.js';
import { logger } from '../utils/logger.js';

export const scheduleRepeatJobs = async () => {
  await autoCancelQueue.add(
    'auto-cancel',
    { triggeredAt: nowISTString() },
    {
      repeat: { pattern: '0 * * * *' },
      jobId: 'auto-cancel-repeat',
    }
  );

  await pickupReminderQueue.add(
    'pickup-reminder',
    { triggeredAt: nowISTString() },
    {
      repeat: { pattern: '30 14 * * *' },
      jobId: 'pickup-reminder-repeat',
    }
  );

  logger.info('[CRON] Repeat jobs scheduled: auto-cancel (hourly), pickup-reminder (8PM IST)');
};