import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  meta?: any;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Erro capturado:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Erro de validação do Joi
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.message,
    });
  }

  // Erro do Prisma
  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflito de dados',
      message: 'Já existe um registro com esses dados',
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      error: 'Registro não encontrado',
      message: 'O registro solicitado não foi encontrado',
    });
  }

  // Erro de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      message: 'Token de autenticação inválido',
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
      message: 'Token de autenticação expirado',
    });
  }

  // Erro personalizado
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      error: error.message,
    });
  }

  // Erro interno do servidor
  return res.status(500).json({
    error: 'Erro interno do servidor',
    message: 'Algo deu errado. Tente novamente mais tarde.',
  });
}; 