import { autoCancelQueue } from '../queues/autoCancel.queue.js';
import { pickupReminderQueue } from '../queues/pickupReminder.queue.js';
import { logger } from '../utils/logger.js';

export const scheduleRepeatJobs = async () => {
  await autoCancelQueue.add(
    'auto-cancel',
    { triggeredAt: new Date().toISOString() },
    {
      repeat: { pattern: '0 * * * *' },   // every hour
      jobId: 'auto-cancel-repeat',
    }
  );

  await pickupReminderQueue.add(
    'pickup-reminder',
    { triggeredAt: new Date().toISOString() },
    {
      repeat: { pattern: '30 14 * * *' },  // 8 PM IST daily
      jobId: 'pickup-reminder-repeat',
    }
  );

  logger.info('[CRON] Repeat jobs scheduled: auto-cancel (hourly), pickup-reminder (8PM IST)');
};