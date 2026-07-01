import { Queue } from 'bullmq';

export interface PickupReminderJobData {
  triggeredAt: string;
}

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

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