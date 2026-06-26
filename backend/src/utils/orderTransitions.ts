import { OrderStatus } from '../models/Order.js';

// valid admin-driven forward transitions
const ADMIN_TRANSITIONS: Record<string, OrderStatus[]> = {
  booked:           ['pickup_scheduled'],
  pickup_scheduled: ['device_picked_up'],
  device_picked_up: ['device_received'],
  device_received:  ['technician_assigned'],   // via assignTechnician
  ready_for_drop:   ['out_for_delivery'],
  out_for_delivery: ['completed'],
};

// statuses from which an order can still be cancelled
const CANCELLABLE: OrderStatus[] = [
  'booked',
  'pickup_scheduled',
  'device_picked_up',
  'device_received',
  'technician_assigned',
  'diagnosis_in_progress',
  'estimate_sent',
  'customer_approved',
  'customer_rejected',
  'repair_in_progress',
  'ready_for_drop',
  'out_for_delivery',
];

export const canAdminTransition = (
  current: OrderStatus,
  next: OrderStatus,
): boolean => {
  if (next === 'cancelled') {
    return CANCELLABLE.includes(current);
  }
  return ADMIN_TRANSITIONS[current]?.includes(next) ?? false;
};