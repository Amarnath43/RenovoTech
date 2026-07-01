import { Worker, Job } from 'bullmq';
import { Order } from '../models/Order.js';
import { notificationQueue } from '../queues/notification.queue.js';
import { logger } from '../utils/logger.js';
import type { PickupReminderJobData } from '../queues/pickupReminder.queue.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const IST_OFFSET_MS = 330 * 60 * 1000;

// tomorrow's IST calendar date, expressed as a UTC range
// (matches how pickupDate is stored: UTC midnight of the date string)
const getTomorrowISTRange = (): { start: Date; end: Date } => {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  const y = istNow.getUTCFullYear();
  const m = istNow.getUTCMonth();
  const d = istNow.getUTCDate();

  const start = new Date(Date.UTC(y, m, d + 1)); // tomorrow, UTC midnight
  const end   = new Date(Date.UTC(y, m, d + 2)); // day after (exclusive upper bound)

  return { start, end };
};

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

pickupReminderWorker.on('completed', (job) => {
  logger.info(`[WORKER] Pickup reminder completed — job: ${job.id}`);
});

pickupReminderWorker.on('failed', (job, err) => {
  logger.error(`[WORKER] Pickup reminder failed — job: ${job?.id}: ${err}`);
});

pickupReminderWorker.on('error', (err) => {
  logger.error(`[WORKER] Pickup reminder error: ${err}`);
});

process.on('SIGTERM', async () => {
  await pickupReminderWorker.close();
});