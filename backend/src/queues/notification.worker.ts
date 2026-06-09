import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import redis from '../config/redis.js';
import { notifyCustomer } from '../services/notification.service.js';
import { logger } from '../utils/logger.js';
import type { NotificationJobData } from './notification.queue.js';

// ── Worker ────────────────────────────────────────
export const notificationWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    const { orderId, event, data } = job.data;

    logger.info(`[WORKER] Processing — job: ${job.id} — event: ${event} — order: ${orderId}`);

    await notifyCustomer(
      new mongoose.Types.ObjectId(orderId),
      event,
      data,
    );
  },
  {
    connection:  redis,
    concurrency: 5,
  }
);

// ── Events ────────────────────────────────────────
notificationWorker.on('completed', (job) => {
  logger.info(`[WORKER] Completed — job: ${job.id} — event: ${job.data.event}`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`[WORKER] Failed — job: ${job?.id} — event: ${job?.data.event}: ${err}`);
});

notificationWorker.on('error', (err) => {
  logger.error(`[WORKER] Error: ${err}`);
});

// ── Graceful Shutdown ─────────────────────────────
process.on('SIGTERM', async () => {
  await notificationWorker.close();
});