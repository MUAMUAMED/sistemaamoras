"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const [totalLeads, totalProducts, totalSales, totalRevenue, salesThisMonth, leadsThisMonth,] = await Promise.all([
            database_1.prisma.lead.count(),
            database_1.prisma.product.count({ where: { active: true } }),
            database_1.prisma.sale.count({ where: { status: 'PAID' } }),
            database_1.prisma.sale.aggregate({
                where: { status: 'PAID' },
                _sum: { total: true },
            }),
            database_1.prisma.sale.count({
                where: {
                    status: 'PAID',
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
            database_1.prisma.lead.count({
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
    }
    catch (error) {
        return next(error);
    }
});
router.get('/metrics', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const [totalLeads, totalProducts, totalSales, totalRevenue, salesThisMonth, leadsThisMonth,] = await Promise.all([
            database_1.prisma.lead.count(),
            database_1.prisma.product.count({ where: { active: true } }),
            database_1.prisma.sale.count({ where: { status: 'PAID' } }),
            database_1.prisma.sale.aggregate({
                where: { status: 'PAID' },
                _sum: { total: true },
            }),
            database_1.prisma.sale.count({
                where: {
                    status: 'PAID',
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
            database_1.prisma.lead.count({
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
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map