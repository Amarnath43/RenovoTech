import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import { notifyCustomer } from '../services/notification.service.js';
import { logger } from '../utils/logger.js';
import type { NotificationJobData } from '../queues/notification.queue.js';
import { redisConnection as connection } from '../config/redisConnection.js';
import { attachWorkerLifecycle } from '../utils/workerLifecycle.js';

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
    connection,
    concurrency: 5,
  }
);

// ── Events ────────────────────────────────────────
attachWorkerLifecycle(notificationWorker, 'Notification');