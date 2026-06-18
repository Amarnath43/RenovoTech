# RenovoTech — CLAUDE.md

## Project Overview

RenovoTech is a full-stack **device repair booking and management platform** (B2C). Customers book repair services for their devices; technicians fulfill orders; admins manage the platform.

## Monorepo Structure

```
RenovoTech/
├── backend/          # Express.js REST API (Node.js + TypeScript)
└── frontend/         # Next.js 16 app (React + TypeScript)
```

---

## Backend

**Directory:** `backend/`

### Tech Stack

| Layer        | Technology                                   |
|--------------|----------------------------------------------|
| Runtime      | Node.js + TypeScript (ES2020, NodeNext)      |
| Framework    | Express.js v5                                |
| Database     | MongoDB (Mongoose v9) — Atlas in production  |
| Cache/OTP    | Redis (ioredis v5)                           |
| Auth         | JWT (access 15m + refresh 7d) + bcrypt       |
| File Storage | Cloudinary + Multer                          |
| Payments     | Razorpay                                     |
| SMS          | Twilio                                       |
| Email        | Nodemailer                                   |
| Validation   | Zod v4 + express-validator                   |
| Logging      | Winston (console + file transports)          |
| Scheduling   | node-cron                                    |
| Security     | Helmet, CORS, rate limiting                  |

### Source Layout

```
backend/src/
├── config/
│   ├── db.ts           # MongoDB connection
│   └── redis.ts        # Redis client with retry strategy
├── middleware/
│   ├── auth.ts         # verifyToken, requireRole RBAC
│   └── rateLimiter.ts  # otpRateLimiter (3/hr), apiRateLimiter (100/15min)
├── models/             # 10 Mongoose schemas (see below)
├── services/
│   ├── token.service.ts  # JWT generation + refresh token rotation
│   └── otp.service.ts    # OTP send/verify with Redis + bcrypt
├── utils/
│   ├── asyncHandler.ts   # Wraps async routes to catch rejections
│   ├── errorHandler.ts   # Custom AppError + global Express error middleware
│   ├── logger.ts         # Winston logger instance
│   ├── generateSlug.ts   # URL-safe slug utility
│   └── generateOrderId.ts
└── app.ts              # Express app setup, middleware registration
```

### Data Models

| Model           | Purpose                                              |
|-----------------|------------------------------------------------------|
| `User`          | Customers, Technicians, Admins (role-based)          |
| `Brand`         | Device manufacturers (Apple, Samsung…)               |
| `Series`        | Device series within a brand (iPhone 14, Galaxy S23…)|
| `DeviceModel`   | Specific models within a series                      |
| `Service`       | Repair service types (Screen, Battery…) + symptoms   |
| `ServicePricing`| Price matrix: modelId × serviceId, with discount     |
| `Order`         | Full repair lifecycle — 14-stage status workflow     |
| `RefreshToken`  | Per-device session tokens (hashed, TTL auto-delete)  |
| `Notification`  | WhatsApp/Email notifications with retry tracking     |
| `Settings`      | Global config: slots, booking fee, working hours     |

**Entity hierarchy:** Brand → Series → DeviceModel → ServicePricing ← Service

### Order Status Workflow (15 states)

`booked` → `pickup_scheduled` → `device_picked_up` → `device_received` → `technician_assigned` → `diagnosis_in_progress` → `estimate_sent` → `customer_approved` | `customer_rejected` → `repair_in_progress` → `quality_check` → `ready_for_drop` → `out_for_delivery` → `completed` | `cancelled`

### Auth Architecture

- **Access token**: JWT, 15-minute expiry, sent via `httpOnly` cookie
- **Refresh token**: JWT, 7-day expiry, bcrypt-hashed and stored in MongoDB per device
- **Rotation**: Atomic MongoDB transactions — old token invalidated before new one issued
- **OTP**: Generated → bcrypt-hashed → stored in Redis with 10-min TTL; 5 wrong attempts = 5-min block; max 5 OTP requests/hour per phone

### Environment Variables (Backend)

```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=
JWT_REFRESH_SECRET=
REDIS_HOST=localhost
REDIS_PORT=6379
COOKIE_SECRET=
```

### Scripts

```bash
cd backend
npm run dev     # nodemon (watch mode)
npm run build   # tsc → dist/
npm start       # node dist/app.js
```

---

## Frontend

**Directory:** `frontend/`

### Tech Stack

| Layer       | Technology                               |
|-------------|------------------------------------------|
| Framework   | Next.js v16 (App Router)                 |
| UI          | React v19 + Tailwind CSS v4              |
| State       | Zustand v5                               |
| Forms       | React Hook Form v7 + Zod resolvers       |
| HTTP        | Axios v1                                 |
| Validation  | Zod v4                                   |

### Source Layout

```
frontend/src/
├── app/            # Next.js App Router pages & layouts
└── layout.tsx      # Root layout
```

Path alias `@/*` maps to `./src/*`.

### Environment Variables (Frontend)

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME=RenovoTech
```

### Scripts

```bash
cd frontend
npm run dev     # Next.js dev server → localhost:3000
npm run build   # Production build
npm start       # Start production server
```

---

## Build Status

| Phase   | Description                              | Status      |
|---------|------------------------------------------|-------------|
| Phase 1 | Backend foundation (Express, middleware) | Done        |
| Phase 2 | All 10 MongoDB models                    | Done        |
| Phase 3 | Services (token, OTP) + utils            | Done        |
| Phase 4 | Route controllers & API endpoints        | Not started |
| Phase 5 | Frontend pages & components              | Not started |
| Phase 6 | Payment, SMS/Email integrations          | Not started |

---

## Coding Conventions

- **TypeScript strict mode** is enabled — all new code must be fully typed.
- Use `asyncHandler` wrapper for every async Express route handler.
- Throw `AppError` (from `utils/errorHandler.ts`) for all expected errors.
- Use the `logger` instance (from `utils/logger.ts`) — never use `console.log` in production paths.
- Slugs for Brand, Series, DeviceModel, and Service must go through `generateSlug.ts`.
- Middleware order in `app.ts`: Helmet → CORS → rate limiter → body parsers → routes → error handler.
- Cookie flags: `httpOnly: true`, `secure: true` in production, `sameSite: 'strict'`.
- All sensitive values (tokens, OTPs) must be bcrypt-hashed before storage.
