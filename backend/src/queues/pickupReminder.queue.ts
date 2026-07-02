import { Queue } from 'bullmq';
import { redisConnection as connection } from '../config/redisConnection.js';

export interface PickupReminderJobData {
  triggeredAt: string;
}

export const pickupReminderQueue = new Queue<PickupReminderJobData>(
  'pickup-reminders',
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
  }
);

process.on('SIGTERM', async () => {
  await pickupReminderQueue.close();
});