import {Queue} from 'bullmq'
import redis from '../config/redis.js'
import type { NotificationEvent } from '../services/notification.service.js'

export interface NotificationJobData{
    orderId:string,
    event: NotificationEvent,
    data:Record<string, string>
}

export const notificationQueue=new Queue<NotificationJobData>(
    'notifications',
    {
        connection:redis,
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
    await notificationQueue.close();  //Close connection to BullMQ AFTER completing current job 

})