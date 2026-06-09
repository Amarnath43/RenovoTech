import twilio from 'twilio';
import { logger } from '../utils/logger.js';
import { Notification } from '../models/Notification.js';
import { Order } from '../models/Order.js';
import mongoose from 'mongoose';
import { maskPhone } from '../utils/mask.js';

// ── Twilio Client ─────────────────────────────────
const getTwilioClient = () => {
    if (process.env.NODE_ENV !== 'production') return null;
    return twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
    );
};

// ── Types ─────────────────────────────────────────
export type NotificationEvent =
    | 'booking_confirmed'
    | 'pickup_scheduled'
    | 'device_picked_up'
    | 'estimate_sent'
    | 'repair_completed'
    | 'out_for_delivery'
    | 'completed'
    | 'customer_approved'
    | 'customer_rejected'

// ── Message Template ──────────────────────────────
export const getTemplate = (
    event: NotificationEvent,
    data: Record<string, string>,
): string => {
    const templates = {
        booking_confirmed:
            `Hi ${data.name}! 🎉 Your repair booking is confirmed.\nOrder ID: ${data.orderId}\nPickup: ${data.date} at ${data.slot}\nWe'll be there on time!`,

        pickup_scheduled:
            `Hi ${data.name}! 🚗 Your pickup is scheduled.\nDate: ${data.date}\nSlot: ${data.slot}\nOur agent will contact you before arriving.`,

        device_picked_up:
            `Hi ${data.name}! 📦 We've picked up your device.\nOrder ID: ${data.orderId}\nYour repair has begun. We'll update you soon!`,

        estimate_sent:
            `Hi ${data.name}! 🔧 Repair estimate for your ${data.model}.\nServices: ${data.services}\nEstimated Cost: ₹${data.amount}\nPlease approve or reject via the app.`,

        repair_completed:
            `Hi ${data.name}! ✅ Your ${data.model} has been repaired.\nOrder ID: ${data.orderId}\nWe'll arrange delivery soon.`,

        out_for_delivery:
            `Hi ${data.name}! 🚚 Your device is out for delivery.\nOrder ID: ${data.orderId}\nExpect delivery today. Please be available.`,

        completed:
            `Hi ${data.name}! 🎊 Your device has been delivered.\nOrder ID: ${data.orderId}\nThank you for choosing RenovoTech!`,
        customer_approved:
            `Hi ${data.name}! ✅ You've approved the repair estimate.\nOrder ID: ${data.orderId}\nOur technician will begin the repair shortly.`,

        customer_rejected:
            `Hi ${data.name}! We've received your decision to cancel the repair.\nOrder ID: ${data.orderId}\nYour device will be returned to you shortly.`,
    };

    return templates[event];
};

// ── Send WhatsApp ─────────────────────────────────
export const sendWhatsApp = async (
    orderId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    phone: string,
    event: NotificationEvent,
    message: string,
): Promise<void> => {
    try {
        const client = getTwilioClient();

        if (client) {
            await client.messages.create({
                body: message,
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
                to: `whatsapp:+91${phone}`,
            });
        } else {
            logger.info(`[NOTIFY] DEV — WhatsApp to ${maskPhone(phone)}: ${message}`);
        }

        await Notification.create({
            orderId,
            userId,
            type: 'whatsapp',
            event,
            recipient: phone,
            message,
            status: 'sent',
            sentAt: new Date(),
        });

        logger.info(`[NOTIFY] Sent — event: ${event} — order: ${orderId}`);

    } catch (err) {
        try {
            logger.error(`[NOTIFY] Failed — event: ${event} — order: ${orderId}: ${err}`);
            await Notification.create({
                orderId,
                userId,
                type: 'whatsapp',
                event,
                recipient: phone,
                message,
                status: 'failed',
                error: String(err),
            });
        } catch (dbErr) {
            logger.error(`[NOTIFY] Failed to log to DB: ${dbErr}`);
        }
    }
};

// ── Notify Customer ───────────────────────────────
export const notifyCustomer = async (
    orderId: mongoose.Types.ObjectId,
    event: NotificationEvent,
    data: Record<string, string>,
): Promise<void> => {
    try {
        const order = await Order
            .findById(orderId)
            .populate('customerId', 'name phone');

        if (!order) return;

        const customer = order.customerId as unknown as {
            _id: mongoose.Types.ObjectId;
            name: string;
            phone: string;
        };

        const message = getTemplate(event, {
            ...data,
            name: customer.name,
        });

        await sendWhatsApp(
            orderId,
            customer._id,
            customer.phone,
            event,
            message,
        );

    } catch (err) {
        logger.error(`[NOTIFY] notifyCustomer failed: ${err}`);
    }
};

// ── Already Notified ──────────────────────────────
export const alreadyNotified = async (
    orderId: mongoose.Types.ObjectId,
    event: NotificationEvent,
): Promise<boolean> => {
    const existing = await Notification.findOne({
        orderId,
        event,
        status: 'sent',
    });
    return !!existing;
};