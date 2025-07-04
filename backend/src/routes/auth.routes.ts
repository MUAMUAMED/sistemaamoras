import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticação de usuários
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login de usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validar dados
    if (!email || !password) {
      res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Email e senha são obrigatórios',
      });
      return;
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
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

    // Verificar senha
    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos',
      });
      return;
    }

    // Gerar token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'secret',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      } as jwt.SignOptions
    );

    logger.info(`Login realizado: ${user.email}`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Criar novo usuário (apenas admins)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, ATTENDANT]
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Email já existe
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // Validar dados
    if (!name || !email || !password || !role) {
      res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome, email, senha e role são obrigatórios',
      });
      return;
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        error: 'Email já existe',
        message: 'Este email já está sendo usado',
      });
      return;
    }

    // Hash da senha
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
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

    logger.info(`Usuário criado: ${user.email}`);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user,
    });
  } catch (error) {
    next(error);
  }
});

export default router; 