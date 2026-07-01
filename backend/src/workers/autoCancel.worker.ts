import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Settings } from '../models/Settings.js';
import { notificationQueue } from '../queues/notification.queue.js';
import { logger } from '../utils/logger.js';
import type { AutoCancelJobData } from '../queues/autoCancel.queue.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

export const autoCancelWorker = new Worker<AutoCancelJobData>(
  'auto-cancel-orders',
  async (job: Job<AutoCancelJobData>) => {
    logger.info(`[WORKER] Auto-cancel — job: ${job.id} — running`);

    const settings = await Settings.findOne().select('staleOrderHours');
    if (!settings) {
      logger.warn('[WORKER] Auto-cancel: settings not found — skipping');
      return;
    }

    const staleThreshold = new Date();
    staleThreshold.setHours(staleThreshold.getHours() - settings.staleOrderHours);

    const staleOrders = await Order.find({
      status: 'booked',
      createdAt: { $lt: staleThreshold },
    }).select('_id orderId customerId');

    if (staleOrders.length === 0) {
      logger.info('[WORKER] Auto-cancel: no stale orders found');
      return;
    }

    for (const order of staleOrders) {
      await Order.findByIdAndUpdate(order._id, {
        $set: { status: 'cancelled' },
        $push: {
          statusHistory: {
            status: 'cancelled',
            updatedBy: new mongoose.Types.ObjectId(order.customerId.toString()),
            note: `Auto-cancelled: no pickup after ${settings.staleOrderHours} hours`,
            timestamp: new Date(),
          },
        },
      });

      await notificationQueue.add('send-whatsapp', {
        orderId: order._id.toString(),
        event: 'cancelled',
        data: { orderId: order.orderId },
      });

      logger.info(`[WORKER] Auto-cancelled: ${order.orderId}`);
    }

    logger.info(`[WORKER] Auto-cancel — done — ${staleOrders.length} orders cancelled`);
  },
  { connection, concurrency: 1 }
);

autoCancelWorker.on('completed', (job) => {
  logger.info(`[WORKER] Auto-cancel completed — job: ${job.id}`);
});

autoCancelWorker.on('failed', (job, err) => {
  logger.error(`[WORKER] Auto-cancel failed — job: ${job?.id}: ${err}`);
});

autoCancelWorker.on('error', (err) => {
  logger.error(`[WORKER] Auto-cancel error: ${err}`);
});

process.on('SIGTERM', async () => {
  await autoCancelWorker.close();
});