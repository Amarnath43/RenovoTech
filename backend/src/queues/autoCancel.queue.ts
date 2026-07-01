import { Queue } from 'bullmq';

export interface AutoCancelJobData {
  triggeredAt: string;
}

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

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