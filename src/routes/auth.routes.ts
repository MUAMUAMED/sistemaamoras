import { Router, Request, Response, NextFunction } from 'express';
import * as bcryptjs from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import { prisma } from '../config/database';

const router = Router();

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
 * /api/auth/check-first-user:
 *   get:
 *     summary: Verificar se existe algum usuário no sistema
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Status da verificação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasUsers:
 *                   type: boolean
 *                 canCreateAccount:
 *                   type: boolean
 */
router.get('/check-first-user', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userCount = await prisma.user.count();
    const hasUsers = userCount > 0;

    res.json({
      hasUsers,
      canCreateAccount: !hasUsers,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Criar novo usuário (apenas admins ou primeiro usuário)
 *     tags: [Auth]
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
 *       401:
 *         description: Não autorizado (requer admin se já houver usuários)
 *       409:
 *         description: Email já existe
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // Validar dados obrigatórios
    if (!name || !email || !password) {
      res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome, email e senha são obrigatórios',
      });
      return;
    }

    // Validação de senha mínima
    if (password.length < 6) {
      res.status(400).json({
        error: 'Senha inválida',
        message: 'A senha deve ter pelo menos 6 caracteres',
      });
      return;
    }

    // Usar transação para prevenir race condition
    const result = await prisma.$transaction(async (tx) => {
      // Verificar se já existe algum usuário (dentro da transação)
      const userCount = await tx.user.count();
      const isFirstUser = userCount === 0;

      // Se não for o primeiro usuário, requer autenticação de admin
      if (!isFirstUser) {
        // Verificar token de autenticação
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new Error('UNAUTHORIZED');
        }

        // Verificar se o usuário é admin
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
          
          const currentUser = await tx.user.findUnique({
            where: { id: decoded.userId },
            select: { role: true, active: true },
          });

          if (!currentUser || !currentUser.active || currentUser.role !== 'ADMIN') {
            throw new Error('FORBIDDEN');
          }
        } catch (error: any) {
          if (error.message === 'FORBIDDEN') {
            throw error;
          }
          throw new Error('INVALID_TOKEN');
        }
      }

      // Verificar se email já existe (dentro da transação)
      const existingUser = await tx.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error('EMAIL_EXISTS');
      }

      // Hash da senha
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Se for o primeiro usuário, sempre criar como ADMIN
      const userRole = isFirstUser ? 'ADMIN' : (role || 'ATTENDANT');

      // Criar usuário (dentro da transação)
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

    logger.info(`Usuário criado: ${result.user.email} (${result.isFirstUser ? 'Primeiro usuário' : 'Por admin'})`);

    res.status(201).json({
      message: result.isFirstUser 
        ? 'Primeiro usuário criado com sucesso! Você é o administrador do sistema.' 
        : 'Usuário criado com sucesso',
      user: result.user,
      isFirstUser: result.isFirstUser,
    });
  } catch (error: any) {
    // Tratar erros específicos da transação
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

    // Outros erros
    next(error);
  }
});

export default router; 