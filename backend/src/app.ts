import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js'; 
// import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
// import { apiRateLimiter } from './middleware/rateLimiter.js';

// // ── Routes ────────────────────────────────────────
// import authRoutes           from './routes/auth.routes.js';
// import brandRoutes          from './routes/brand.routes.js';
// import serviceCenterRoutes  from './routes/serviceCenter.routes.js';
// import orderRoutes          from './routes/order.routes.js';
// import adminOrderRoutes     from './routes/admin/order.routes.js';
// import adminBrandRoutes     from './routes/admin/brand.routes.js';
// import adminReportRoutes    from './routes/admin/report.routes.js';
// import adminCustomerRoutes  from './routes/admin/customer.routes.js';
// import techRoutes           from './routes/technician.routes.js';

// // ── Cron Jobs ─────────────────────────────────────
// import './jobs/estimateExpiry.job.js';
// import './jobs/pickupReminder.job.js';

dotenv.config();

const app = express();

// ── Security ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Parsing ───────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────
app.use(morgan('dev'));

// ── Rate Limiting ─────────────────────────────────
// app.use('/api', apiRateLimiter);

// ── Health Check ──────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', app: 'RenovoTech API' });
});

// ── API Routes ────────────────────────────────────
// app.use('/api/v1/auth',             authRoutes);
// app.use('/api/v1/brands',           brandRoutes);
// app.use('/api/v1/service-centers',  serviceCenterRoutes);
// app.use('/api/v1/orders',           orderRoutes);
// app.use('/api/v1/admin/orders',     adminOrderRoutes);
// app.use('/api/v1/admin/brands',     adminBrandRoutes);
// app.use('/api/v1/admin/reports',    adminReportRoutes);
// app.use('/api/v1/admin/customers',  adminCustomerRoutes);
// app.use('/api/v1/tech',             techRoutes);

// ── 404 Handler ───────────────────────────────────
app.use('*path', (_, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────
// app.use(errorHandler);

// ── Start Server ──────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`RenovoTech API running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
});

export default app;