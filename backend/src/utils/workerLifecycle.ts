import { Worker } from 'bullmq';
import { logger } from './logger.js';

export const attachWorkerLifecycle = (worker: Worker, label: string): void => {
  worker.on('completed', (job) => {
    logger.info(`[WORKER] ${label} completed — job: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[WORKER] ${label} failed — job: ${job?.id}: ${err}`);
  });

  worker.on('error', (err) => {
    logger.error(`[WORKER] ${label} error: ${err}`);
  });

  process.on('SIGTERM', async () => {
    await worker.close();
  });
};