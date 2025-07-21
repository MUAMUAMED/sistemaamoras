import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Listar categorias
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return res.json(categories);
  } catch (error) {
    return next(error);
  }
});

// Criar categoria
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
    if (!/^\d{1,2}$/.test(code)) {
      return res.status(400).json({
        error: 'Código inválido',
        message: 'O código deve ter 1 ou 2 dígitos numéricos (ex: 10, 50)',
      });
    }

    // Verificar se código já existe
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { name },
          { code }
        ]
      }
    });

    if (existingCategory) {
      return res.status(409).json({
        error: 'Categoria já existe',
        message: existingCategory.name === name 
          ? 'Já existe uma categoria com este nome'
          : 'Já existe uma categoria com este código'
      });
    }

    const category = await prisma.category.create({
      data: { name, code, description },
    });

    return res.status(201).json(category);
  } catch (error) {
    return next(error);
  }
});

// Excluir categoria
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar se a categoria existe
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        error: 'Categoria não encontrada',
        message: 'A categoria solicitada não foi encontrada'
      });
    }

    // Verificar se há produtos usando esta categoria
    if (category._count.products > 0) {
      return res.status(409).json({
        error: 'Categoria em uso',
        message: `Esta categoria está sendo usada por ${category._count.products} produto(s). Remova os produtos primeiro.`,
        canForce: true
      });
    }

    // Excluir a categoria
    await prisma.category.delete({
      where: { id }
    });

    return res.status(200).json({
      message: 'Categoria excluída com sucesso',
      categoryName: category.name
    });
  } catch (error) {
    return next(error);
  }
});

export default router; 