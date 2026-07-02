import { Worker, Job } from 'bullmq';
import { Order } from '../models/Order.js';
import { notificationQueue } from '../queues/notification.queue.js';
import { logger } from '../utils/logger.js';
import type { PickupReminderJobData } from '../queues/pickupReminder.queue.js';
import { redisConnection as connection } from '../config/redisConnection.js';
import { getTomorrowISTRange } from '../utils/slotTime.js';
import { attachWorkerLifecycle } from '../utils/workerLifecycle.js';

export const pickupReminderWorker = new Worker<PickupReminderJobData>(
  'pickup-reminders',
  async (job: Job<PickupReminderJobData>) => {
    logger.info(`[WORKER] Pickup reminder — job: ${job.id} — running`);

    const { start, end } = getTomorrowISTRange();

    const orders = await Order.find({
      status: { $in: ['booked', 'pickup_scheduled'] },
      pickupDate: { $gte: start, $lt: end },
    }).select('_id orderId pickupDate pickupSlot');

    if (orders.length === 0) {
      logger.info('[WORKER] Pickup reminder: no pickups tomorrow');
      return;
    }

    for (const order of orders) {
      await notificationQueue.add('send-whatsapp', {
        orderId: order._id.toString(),
        event: 'pickup_scheduled',
        data: {
          orderId: order.orderId,
          date: order.pickupDate.toISOString().split('T')[0],
          slot: order.pickupSlot,
        },
      });

      logger.info(`[WORKER] Reminder queued: ${order.orderId}`);
    }

    logger.info(`[WORKER] Pickup reminder — done — ${orders.length} reminders queued`);
  },
  { connection, concurrency: 1 }
);

attachWorkerLifecycle(pickupReminderWorker, 'Pickup reminder');