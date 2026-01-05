"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const users = await database_1.prisma.user.findMany({
            where: { active: true },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
            orderBy: { name: 'asc' },
        });
        return res.json(users);
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map