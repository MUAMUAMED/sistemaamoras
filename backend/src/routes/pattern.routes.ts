import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Listar padrões
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const patterns = await prisma.pattern.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    res.json(patterns);
  } catch (error) {
    next(error);
  }
});

// Criar padrão
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome e código são obrigatórios',
      });
    }

    // Validar formato do código
    if (!/^\d{1,4}$/.test(code)) {
      return res.status(400).json({
        error: 'Código inválido',
        message: 'O código deve ter 1 a 4 dígitos numéricos (ex: 0001, 0032)',
      });
    }

    // Verificar se código já existe
    const existingPattern = await prisma.pattern.findFirst({
      where: {
        OR: [
          { name },
          { code }
        ]
      }
    });

    if (existingPattern) {
      return res.status(409).json({
        error: 'Estampa já existe',
        message: existingPattern.name === name 
          ? 'Já existe uma estampa com este nome'
          : 'Já existe uma estampa com este código'
      });
    }

    const pattern = await prisma.pattern.create({
      data: { name, code, description },
    });

    res.status(201).json(pattern);
  } catch (error) {
    next(error);
  }
});

export default router; 