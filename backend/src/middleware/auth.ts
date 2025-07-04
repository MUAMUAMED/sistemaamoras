import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        error: 'Token não fornecido',
        message: 'Token de acesso requerido',
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JwtPayload;

    // Buscar usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      res.status(401).json({
        error: 'Usuário inválido',
        message: 'Usuário não encontrado ou inativo',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: 'Token inválido',
      message: 'Token de acesso inválido',
    });
    return;
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Não autenticado',
        message: 'Usuário não autenticado',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar este recurso',
      });
      return;
    }

    next();
  };
}; 