import {Queue} from 'bullmq'
import type { NotificationEvent } from '../services/notification.service.js'

export interface NotificationJobData{
    orderId:string,
    event: NotificationEvent,
    data:Record<string, string>
}
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
};

export const notificationQueue=new Queue<NotificationJobData>(
    'notifications',
    {
        connection,
        defaultJobOptions:{
            attempts:3,
            backoff:{
                type:'exponential',
                delay:5000
            },
            removeOnComplete:100,
            removeOnFail:500
        }
    }
)

process.on('SIGTERM',async()=>{
    await notificationQueue.close(); 
})