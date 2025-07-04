import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${req.originalUrl} não foi encontrada`,
    suggestion: 'Verifique a documentação da API em /api-docs',
  });
}; 