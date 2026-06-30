// backend/src/validators/schemas.ts
import { z } from 'zod';

// ── Reusable Fields ───────────────────────────────
export const nameSchema = z
  .string()
  .trim()
  .min(2, { message: 'Name must be at least 2 characters' })
  .max(50, { message: 'Name must be under 50 characters' })
  .regex(/^[\p{L}\s'.\-]+$/u, { message: 'Name contains invalid characters' });

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, { message: 'Valid 10-digit phone number required' });

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: 'OTP must be 6 digits' });

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid ID' });

// ── Auth ──────────────────────────────────────────
export const sendOtpSchema = z.object({ phone: phoneSchema });
export const verifyOtpSchema = z.object({ phone: phoneSchema, otp: otpSchema });

// ── User ──────────────────────────────────────────
export const updateProfileSchema = z.object({ name: nameSchema });

// ── Admin Customer ────────────────────────────────
export const updateCustomerSchema = z
  .object({
    name: nameSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No valid fields provided' });

// ── Order ─────────────────────────────────────────
const addressSchema = z.object({
  flatOrHouse: z.string().trim().min(1, { message: 'Flat/House required' }),
  area: z.string().trim().min(1, { message: 'Area required' }),
  city: z.string().trim().min(1, { message: 'City required' }),
  state: z.string().trim().min(1, { message: 'State required' }),
  pincode: z.string().trim().regex(/^\d{6}$/, { message: 'Valid 6-digit pincode required' }),
  fullAddress: z.string().trim().min(1, { message: 'Full address required' }),
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
});

const orderServiceSchema = z.object({
  serviceId: objectIdSchema,
  selectedSymptoms: z.array(z.string()).default([]),
});

export const createOrderSchema = z.object({
  brandId: objectIdSchema,
  seriesId: objectIdSchema,
  modelId: objectIdSchema,
  services: z.array(orderServiceSchema).min(1, { message: 'At least one service is required' }),
  pickupAddress: addressSchema,
  contactName: nameSchema,
  contactPhone: phoneSchema,
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' }),
  pickupSlot: z.string().trim().regex(/^\d{1,2}:\d{2} (AM|PM)$/, { message: 'Slot must be in "H:MM AM/PM" format' }),
});
export type CreateOrderBody = z.infer<typeof createOrderSchema>;

export const respondEstimateSchema = z.object({
  action: z.enum(['approved', 'rejected']),
});

// ── Technician Estimate ───────────────────────────
const estimateServiceSchema = z.object({
  serviceId: objectIdSchema,
});

export const submitEstimateSchema = z.object({
  services: z.array(estimateServiceSchema).min(1, { message: 'At least one service is required' }),
  notes: z.string().trim().optional().default(''),
});

// ── Admin Settings ────────────────────────────────
export const updateSettingsSchema = z
  .object({
    storeVisitEnabled: z.boolean().optional(),
    pickupDropEnabled: z.boolean().optional(),
    pickupSlotDurationMins: z.number().int().min(15).max(240).optional(),
    maxPickupsPerSlot: z.number().int().min(1).max(100).optional(),
    minLeadTimeMinutes: z.number().int().min(0).max(1440).optional(),
    workingHoursStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'HH:MM format' }).optional(),
    workingHoursEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'HH:MM format' }).optional(),
    calendarDays: z.number().int().min(1).max(90).optional(),
    workingDays: z.array(z.enum([
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    ])).min(1).optional(),
    bookingFee: z.number().int().min(0).max(100000).optional(),
    bookingFeeEnabled: z.boolean().optional(),
    staleOrderHours: z.number().int().min(1).max(168).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No valid settings fields provided' })
  .refine(
    (d) => {
      if (d.workingHoursStart && d.workingHoursEnd)
        return d.workingHoursStart < d.workingHoursEnd;
      return true;
    },
    { message: 'workingHoursStart must be before workingHoursEnd' },
  );

// ── Technician Complete ───────────────────────────
export const completeRepairSchema = z.object({
  note: z.string().trim().max(500, { message: 'Note too long' }).optional().default(''),
});


// ── Technician Photos ─────────────────────────────
const photoUrlSchema = z
  .string()
  .trim()
  .url({ message: 'Invalid photo URL' })
  .max(500, { message: 'URL too long' })
  .refine((url) => url.startsWith('https://'), {
    message: 'Photo URL must be HTTPS',
  });

export const uploadPhotosSchema = z
  .object({
    beforePhotos: z.array(photoUrlSchema).min(1).max(4, { message: 'Max 4 before photos' }).optional(),
    afterPhotos: z.array(photoUrlSchema).min(1).max(4, { message: 'Max 4 after photos' }).optional(),
  })
  .refine(
    (d) => (d.beforePhotos?.length ?? 0) > 0 || (d.afterPhotos?.length ?? 0) > 0,
    { message: 'At least one photo is required' },
  );

const orderStatusValues = [
  'booked', 'pickup_scheduled', 'device_picked_up', 'device_received',
  'technician_assigned', 'diagnosis_in_progress', 'estimate_sent',
  'customer_approved', 'customer_rejected', 'repair_in_progress',
  'ready_for_drop', 'out_for_delivery', 'completed', 'cancelled',
] as const;

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatusValues),
  note: z.string().trim().max(500).optional(),
  finalAmount: z.number().int().nonnegative().optional(),
});

export const assignTechnicianSchema = z.object({
  technicianId: objectIdSchema,
});


// ── Admin Brand ───────────────────────────────────
const catalogName = z
  .string()
  .trim()
  .min(1, { message: 'Name is required' })
  .max(100, { message: 'Name too long' });

export const createBrandSchema = z.object({
  name: catalogName,
  logo: z.string().trim().url({ message: 'Invalid logo URL' }).optional(),
  displayOrder: z.number().int().nonnegative().optional(),
});

export const updateBrandSchema = z
  .object({
    name: catalogName.optional(),
    logo: z.string().trim().url({ message: 'Invalid logo URL' }).optional(),
    displayOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

// ── Admin Series ──────────────────────────────────
export const createSeriesSchema = z.object({
  brandId: objectIdSchema,
  name: catalogName,
  displayOrder: z.number().int().nonnegative().optional(),
});

export const updateSeriesSchema = z
  .object({
    name: catalogName.optional(),
    displayOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

// ── Admin Model ───────────────────────────────────
export const createModelSchema = z.object({
  seriesId: objectIdSchema,   // brandId derived from series
  name: catalogName,
  image: z.string().trim().url({ message: 'Invalid image URL' }).optional(),
  displayOrder: z.number().int().nonnegative().optional(),
});

export const updateModelSchema = z
  .object({
    name: catalogName.optional(),
    image: z.string().trim().url({ message: 'Invalid image URL' }).optional(),
    displayOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });


  // ── Admin Service ─────────────────────────────────
const symptomSchema = z.object({
  label:    z.string().trim().min(1, { message: 'Symptom label required' }).max(100),
  isActive: z.boolean().optional().default(true),
});

export const createServiceSchema = z.object({
  name:       catalogName,
  image:      z.string().trim().url({ message: 'Invalid image URL' }).optional(),
  repairTime: z.number().int().nonnegative().optional(),
  warranty:   z.number().int().nonnegative().optional(),
  symptoms:   z.array(symptomSchema).optional().default([]),
});

export const updateServiceSchema = z
  .object({
    name:       catalogName.optional(),
    image:      z.string().trim().url({ message: 'Invalid image URL' }).optional(),
    repairTime: z.number().int().nonnegative().optional(),
    warranty:   z.number().int().nonnegative().optional(),
    symptoms:   z.array(symptomSchema).optional(),
    isActive:   z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

  // ── Admin Pricing ─────────────────────────────────
export const createPricingSchema = z
  .object({
    modelId:         objectIdSchema,
    serviceId:       objectIdSchema,
    price:           z.number().int().nonnegative({ message: 'Price must be ≥ 0' }),
    discountedPrice: z.number().int().nonnegative().nullable().optional(),
  })
  .refine(
    (d) => d.discountedPrice == null || d.discountedPrice <= d.price,
    { message: 'Discounted price cannot exceed price' },
  );

export const updatePricingSchema = z
  .object({
    price:           z.number().int().nonnegative().optional(),
    discountedPrice: z.number().int().nonnegative().nullable().optional(),
    isActive:        z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });