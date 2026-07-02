import { Order } from '../../../models/Order.js';
import { User } from '../../../models/User.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { parseDateRangeFilter } from '../../../utils/dateRangeFilter.js';

// ── Overview (Dashboard Summary) ──────────────────
export const getOverview = asyncHandler(async (req, res) => {
  const [
    totalOrders,
    completedOrders,
    cancelledOrders,
    activeOrders,
    totalCustomers,
    ordersByStatus,
    revenueAgg,
  ] = await Promise.all([
    Order.countDocuments({}),
    Order.countDocuments({ status: 'completed' }),
    Order.countDocuments({ status: 'cancelled' }),
    Order.countDocuments({
      status: { $nin: ['completed', 'cancelled', 'customer_rejected'] },
    }),
    User.countDocuments({ role: 'customer' }),

    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]),
  ]);

  const statusCounts: Record<string, number> = {};
  ordersByStatus.forEach((s: { _id: string; count: number }) => {
    statusCounts[s._id] = s.count;
  });

  const totalRevenue = revenueAgg[0]?.total ?? 0;

  res.json({
    success: true,
    overview: {
      totalOrders,
      completedOrders,
      cancelledOrders,
      activeOrders,
      totalCustomers,
      totalRevenue,
      ordersByStatus: statusCounts,
    },
  });
});

// ── Revenue Report (Date Range) ───────────────────
export const getRevenue = asyncHandler(async (req, res) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate   = req.query.endDate as string | undefined;

  const match: Record<string, unknown> = { status: 'completed', completedAt: { $ne: null }, };

  const dateFilter = parseDateRangeFilter(startDate, endDate);
  if (dateFilter) match.completedAt = { $ne: null, ...dateFilter };

  const [summary, daily] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue:  { $sum: '$finalAmount' },
          orderCount:    { $sum: 1 },
          avgOrderValue: { $avg: '$finalAmount' },
        },
      },
    ]),

    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          revenue: { $sum: '$finalAmount' },
          orders:  { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totals = summary[0] ?? { totalRevenue: 0, orderCount: 0, avgOrderValue: 0 };

  res.json({
    success: true,
    revenue: {
      totalRevenue:  totals.totalRevenue,
      orderCount:    totals.orderCount,
      avgOrderValue: Math.round(totals.avgOrderValue || 0),
      daily: daily.map((d: { _id: string; revenue: number; orders: number }) => ({
        date:    d._id,
        revenue: d.revenue,
        orders:  d.orders,
      })),
    },
  });
});