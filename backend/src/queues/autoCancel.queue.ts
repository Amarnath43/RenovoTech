import { Queue } from 'bullmq';
import { redisConnection as connection } from '../config/redisConnection.js';

export interface AutoCancelJobData {
  triggeredAt: string;
}

export const autoCancelQueue = new Queue<AutoCancelJobData>(
  'auto-cancel-orders',
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
  await autoCancelQueue.close();
});