import { Worker, Job } from 'bullmq';
import { Order } from '../models/Order.js';
import { Settings } from '../models/Settings.js';
import { notificationQueue } from '../queues/notification.queue.js';
import { logger } from '../utils/logger.js';
import type { AutoCancelJobData } from '../queues/autoCancel.queue.js';
import { redisConnection as connection } from '../config/redisConnection.js';
import { attachWorkerLifecycle } from '../utils/workerLifecycle.js';

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
    }).select('_id orderId');

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

attachWorkerLifecycle(autoCancelWorker, 'Auto-cancel');