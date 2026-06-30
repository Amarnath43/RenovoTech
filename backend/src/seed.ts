import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Brand } from './models/Brand.js';
import { Series } from './models/Series.js';
import { DeviceModel } from './models/DeviceModel.js';
import { Service } from './models/Service.js';
import { ServicePricing } from './models/ServicePricing.js';
import { Settings } from './models/Settings.js';
import { User } from './models/User.js';
import { generateSlug } from './utils/generateSlug.js';
import { logger } from './utils/logger.js';

dotenv.config();

const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE || '9999999999';
const MONGO_URI   = process.env.MONGODB_URI!;

// ── Catalog Data ──────────────────────────────────

const brandsData = [
  {
    name: 'Apple',
    displayOrder: 1,
    series: [
      {
        name: 'iPhone 15',
        displayOrder: 1,
        models: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15'],
      },
      {
        name: 'iPhone 14',
        displayOrder: 2,
        models: ['iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14'],
      },
      {
        name: 'iPhone 13',
        displayOrder: 3,
        models: ['iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 Mini', 'iPhone 13'],
      },
    ],
  },
  {
    name: 'Samsung',
    displayOrder: 2,
    series: [
      {
        name: 'Galaxy S24',
        displayOrder: 1,
        models: ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24'],
      },
      {
        name: 'Galaxy S23',
        displayOrder: 2,
        models: ['Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23'],
      },
      {
        name: 'Galaxy A55',
        displayOrder: 3,
        models: ['Galaxy A55', 'Galaxy A35', 'Galaxy A15'],
      },
    ],
  },
];

const servicesData = [
  {
    name: 'Screen Replacement',
    repairTime: 45,
    warranty: 180,
    symptoms: [
      { label: 'Cracked screen' },
      { label: 'Touch not working' },
      { label: 'Display lines' },
      { label: 'Black screen' },
    ],
  },
  {
    name: 'Battery Replacement',
    repairTime: 30,
    warranty: 180,
    symptoms: [
      { label: 'Battery draining fast' },
      { label: 'Phone not charging' },
      { label: 'Overheating' },
      { label: 'Phone shutting down randomly' },
    ],
  },
  {
    name: 'Back Glass Replacement',
    repairTime: 60,
    warranty: 90,
    symptoms: [
      { label: 'Cracked back glass' },
      { label: 'Shattered back panel' },
    ],
  },
  {
    name: 'Charging Port Repair',
    repairTime: 45,
    warranty: 90,
    symptoms: [
      { label: 'Phone not charging' },
      { label: 'Loose charging port' },
      { label: 'Charging cable not fitting' },
    ],
  },
  {
    name: 'Camera Repair',
    repairTime: 60,
    warranty: 90,
    symptoms: [
      { label: 'Blurry camera' },
      { label: 'Camera not opening' },
      { label: 'Black screen on camera' },
      { label: 'Cracked camera lens' },
    ],
  },
];

// ── Pricing Table (per brand, per service) ────────
// [screenPrice, batteryPrice, backGlassPrice, chargingPortPrice, cameraPrice]
const pricingByModel: Record<string, number[]> = {
  // Apple iPhone 15
  'iPhone 15 Pro Max': [18000, 5000, 8000, 3000, 12000],
  'iPhone 15 Pro':     [16000, 5000, 7000, 3000, 11000],
  'iPhone 15 Plus':    [14000, 4500, 6000, 2500, 10000],
  'iPhone 15':         [12000, 4000, 5000, 2500,  9000],
  // Apple iPhone 14
  'iPhone 14 Pro Max': [15000, 4500, 7000, 2500, 10000],
  'iPhone 14 Pro':     [13000, 4500, 6000, 2500,  9000],
  'iPhone 14 Plus':    [11000, 4000, 5000, 2000,  8000],
  'iPhone 14':         [ 9000, 3500, 4500, 2000,  7000],
  // Apple iPhone 13
  'iPhone 13 Pro Max': [12000, 4000, 6000, 2000,  9000],
  'iPhone 13 Pro':     [10000, 4000, 5000, 2000,  8000],
  'iPhone 13 Mini':    [ 8000, 3500, 4000, 1500,  7000],
  'iPhone 13':         [ 8000, 3500, 4000, 1500,  7000],
  // Samsung Galaxy S24
  'Galaxy S24 Ultra':  [14000, 4500, 6000, 2500, 10000],
  'Galaxy S24+':       [12000, 4000, 5000, 2000,  8000],
  'Galaxy S24':        [10000, 3500, 4500, 2000,  7000],
  // Samsung Galaxy S23
  'Galaxy S23 Ultra':  [12000, 4000, 5500, 2000,  9000],
  'Galaxy S23+':       [10000, 3500, 4500, 1500,  7500],
  'Galaxy S23':        [ 8000, 3000, 4000, 1500,  6500],
  // Samsung Galaxy A
  'Galaxy A55':        [ 6000, 2500, 3000, 1500,  5000],
  'Galaxy A35':        [ 5000, 2000, 2500, 1500,  4000],
  'Galaxy A15':        [ 4000, 1500, 2000, 1000,  3000],
};

// ── Seed Functions ────────────────────────────────

const seedSettings = async () => {
  await Settings.findOneAndUpdate(
    {},
    {
      $setOnInsert: {
        pickupDropEnabled:    true,
        storeVisitEnabled:    false,
        bookingFeeEnabled:    false,
        bookingFee:           0,
        maxPickupsPerSlot:    3,
        minLeadTimeMinutes:   60,
        pickupSlotDurationMins: 60,
        calendarDays:         7,
        staleOrderHours:      24,
        workingDays: [
          'monday', 'tuesday', 'wednesday',
          'thursday', 'friday', 'saturday',
        ],
        workingHoursStart: '09:00',
        workingHoursEnd:   '21:00',
        orderSequence:     0,
      },
    },
    { upsert: true },
  );
  logger.info('[SEED] Settings ✅');
};

const seedAdmin = async () => {
  await User.findOneAndUpdate(
    { phone: ADMIN_PHONE },
    {
      $setOnInsert: {
        phone:    ADMIN_PHONE,
        role:     'admin',
        isActive: true,
        name:     'Admin',
      },
    },
    { upsert: true },
  );
  logger.info(`[SEED] Admin user: ${ADMIN_PHONE} ✅`);
};

const seedCatalog = async () => {
  // 1. seed services (global)
  const serviceIds: mongoose.Types.ObjectId[] = [];

  for (const svc of servicesData) {
    const slug = generateSlug(svc.name);
    const service = await Service.findOneAndUpdate(
      { slug },
      {
        $setOnInsert: {
          name:       svc.name,
          slug,
          repairTime: svc.repairTime,
          warranty:   svc.warranty,
          symptoms:   svc.symptoms,
          isActive:   true,
        },
      },
      { upsert: true, new: true },
    );
    serviceIds.push(service!._id as mongoose.Types.ObjectId);
  }
  logger.info(`[SEED] ${servicesData.length} services ✅`);

  // 2. seed brands → series → models → pricing
  for (const brandData of brandsData) {
    const brandSlug = generateSlug(brandData.name);
    const brand = await Brand.findOneAndUpdate(
      { slug: brandSlug },
      {
        $setOnInsert: {
          name:         brandData.name,
          slug:         brandSlug,
          displayOrder: brandData.displayOrder,
          isActive:     true,
        },
      },
      { upsert: true, new: true },
    );

    for (const seriesData of brandData.series) {
      const seriesSlug = generateSlug(seriesData.name);
      const series = await Series.findOneAndUpdate(
        { brandId: brand!._id, slug: seriesSlug },
        {
          $setOnInsert: {
            brandId:      brand!._id,
            name:         seriesData.name,
            slug:         seriesSlug,
            displayOrder: seriesData.displayOrder,
            isActive:     true,
          },
        },
        { upsert: true, new: true },
      );

      for (let i = 0; i < seriesData.models.length; i++) {
        const modelName = seriesData.models[i];
        const modelSlug = generateSlug(modelName);

        const model = await DeviceModel.findOneAndUpdate(
          { seriesId: series!._id, slug: modelSlug },
          {
            $setOnInsert: {
              brandId:      brand!._id,
              seriesId:     series!._id,
              name:         modelName,
              slug:         modelSlug,
              displayOrder: i + 1,
              isActive:     true,
            },
          },
          { upsert: true, new: true },
        );

        // seed pricing for each service
        const prices = pricingByModel[modelName];
        if (!prices) {
          logger.warn(`[SEED] No pricing for ${modelName} — skipping`);
          continue;
        }

        for (let j = 0; j < serviceIds.length; j++) {
          await ServicePricing.findOneAndUpdate(
            { modelId: model!._id, serviceId: serviceIds[j] },
            {
              $setOnInsert: {
                modelId:   model!._id,
                serviceId: serviceIds[j],
                price:     prices[j],
                isActive:  true,
              },
            },
            { upsert: true },
          );
        }
      }
    }

    logger.info(`[SEED] Brand: ${brandData.name} + series + models + pricing ✅`);
  }
};

// ── Main ──────────────────────────────────────────
const seed = async () => {
  try {
    logger.info('[SEED] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    logger.info('[SEED] Connected ✅');

    await seedSettings();
    await seedAdmin();
    await seedCatalog();

    logger.info('[SEED] 🎉 All seed data created successfully');
    process.exit(0);

  } catch (err) {
    logger.error(`[SEED] Failed: ${err}`);
    process.exit(1);
  }
};

seed();