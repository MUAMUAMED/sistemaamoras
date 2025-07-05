import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Métricas do dashboard
router.get('/metrics', authenticateToken, async (req, res, next) => {
  try {
    const [
      totalLeads,
      totalProducts,
      totalSales,
      totalRevenue,
      salesThisMonth,
      leadsThisMonth,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.product.count({ where: { active: true } }),
      prisma.sale.count({ where: { status: 'PAID' } }),
      prisma.sale.aggregate({
        where: { status: 'PAID' },
        _sum: { total: true },
      }),
      prisma.sale.count({
        where: {
          status: 'PAID',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.lead.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return res.json({
      totalLeads,
      totalProducts,
      totalSales,
      totalRevenue: totalRevenue._sum.total || 0,
      salesThisMonth,
      leadsThisMonth,
    });
  } catch (error) {
    return next(error);
  }
});

export default router; 