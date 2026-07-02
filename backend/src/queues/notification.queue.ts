import {Queue} from 'bullmq'
import { NotificationEvent } from '../models/Notification.js';
import { redisConnection as connection } from '../config/redisConnection.js';

export interface NotificationJobData{
    orderId:string,
    event: NotificationEvent,
    data:Record<string, string>
}

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