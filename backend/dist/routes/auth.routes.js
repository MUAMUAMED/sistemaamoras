"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const logger_1 = require("../config/logger");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                error: 'Dados obrigatórios',
                message: 'Email e senha são obrigatórios',
            });
            return;
        }
        const user = await database_1.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                password: true,
                role: true,
                active: true,
            },
        });
        if (!user || !user.active) {
            res.status(401).json({
                error: 'Credenciais inválidas',
                message: 'Email ou senha incorretos',
            });
            return;
        }
        const isPasswordValid = await bcryptjs.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({
                error: 'Credenciais inválidas',
                message: 'Email ou senha incorretos',
            });
            return;
        }
        const token = jwt.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
        }, process.env.JWT_SECRET || 'secret', {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });
        logger_1.logger.info(`Login realizado: ${user.email}`);
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/check-first-user', async (req, res, next) => {
    try {
        const userCount = await database_1.prisma.user.count();
        const hasUsers = userCount > 0;
        res.json({
            hasUsers,
            canCreateAccount: !hasUsers,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({
                error: 'Dados obrigatórios',
                message: 'Nome, email e senha são obrigatórios',
            });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({
                error: 'Senha inválida',
                message: 'A senha deve ter pelo menos 6 caracteres',
            });
            return;
        }
        const result = await database_1.prisma.$transaction(async (tx) => {
            const userCount = await tx.user.count();
            const isFirstUser = userCount === 0;
            if (!isFirstUser) {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    throw new Error('UNAUTHORIZED');
                }
                try {
                    const token = authHeader.substring(7);
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                    const currentUser = await tx.user.findUnique({
                        where: { id: decoded.userId },
                        select: { role: true, active: true },
                    });
                    if (!currentUser || !currentUser.active || currentUser.role !== 'ADMIN') {
                        throw new Error('FORBIDDEN');
                    }
                }
                catch (error) {
                    if (error.message === 'FORBIDDEN') {
                        throw error;
                    }
                    throw new Error('INVALID_TOKEN');
                }
            }
            const existingUser = await tx.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                throw new Error('EMAIL_EXISTS');
            }
            const hashedPassword = await bcryptjs.hash(password, 10);
            const userRole = isFirstUser ? 'ADMIN' : (role || 'ATTENDANT');
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: userRole,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    active: true,
                    createdAt: true,
                },
            });
            return { user, isFirstUser };
        });
        logger_1.logger.info(`Usuário criado: ${result.user.email} (${result.isFirstUser ? 'Primeiro usuário' : 'Por admin'})`);
        res.status(201).json({
            message: result.isFirstUser
                ? 'Primeiro usuário criado com sucesso! Você é o administrador do sistema.'
                : 'Usuário criado com sucesso',
            user: result.user,
            isFirstUser: result.isFirstUser,
        });
    }
    catch (error) {
        if (error.message === 'UNAUTHORIZED') {
            res.status(401).json({
                error: 'Não autorizado',
                message: 'Apenas administradores podem criar usuários',
            });
            return;
        }
        if (error.message === 'FORBIDDEN') {
            res.status(403).json({
                error: 'Acesso negado',
                message: 'Apenas administradores podem criar usuários',
            });
            return;
        }
        if (error.message === 'INVALID_TOKEN') {
            res.status(401).json({
                error: 'Token inválido',
                message: 'Token de autenticação inválido ou expirado',
            });
            return;
        }
        if (error.message === 'EMAIL_EXISTS' || error.code === 'P2002') {
            res.status(409).json({
                error: 'Email já existe',
                message: 'Este email já está sendo usado',
            });
            return;
        }
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map